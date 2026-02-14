# URZIS PASS - Agent Service Documentation

## Overview

The **BioBridgeDoorControlAgent** is a Windows Service that acts as a bridge between the URZIS PASS Server and physical BioBridge/ZKTeco door terminals. It polls the server for commands, executes them on terminals via the BioBridge SDK, and reports results back.

- **Service Name**: UDM-Agent
- **Platform**: .NET / VB.NET Windows Service
- **Communication**: HTTP (to server) + TCP/IP (to terminals via BioBridge SDK)

---

## Architecture

```
Server Service (port 8080)
    ^
    | HTTP (polling, heartbeat, results)
    |
Agent Service
    |
    | TCP/IP (BioBridge SDK)
    v
ZKTeco Terminal(s) (port 4370)
```

The agent runs on a machine that has **network access to both the server and the physical terminals**. Multiple agents can run for the same enterprise, each managing different doors/terminals.

---

## Configuration

**File**: `app.config`

| Key | Description | Default |
|-----|-------------|---------|
| `ServerUrl` | Base URL of the URZIS PASS Server | `http://localhost:8080` |
| `AgentKey` | Unique key for agent authentication (must match `agents.agent_key` in DB) | *(required)* |
| `EnterpriseId` | Enterprise ID this agent belongs to | `1` |
| `PollingInterval` | Interval (ms) between command polls when idle | `500` |
| `HeartbeatInterval` | Interval (ms) between heartbeats | `30000` |
| `CommandTimeout` | Long-polling timeout (seconds) for command fetch | `2` |
| `IngressEnabled` | Enable ingress DB sync | `false` |
| `IngressMysqlHost` | Ingress MySQL host | `localhost` |
| `IngressMysqlDatabase` | Ingress database name | `ingress` |
| `IngressMysqlUser` | Ingress MySQL user | `root` |
| `IngressMysqlPassword` | Ingress MySQL password | *(empty)* |
| `IngressSyncInterval` | Interval (ms) between ingress syncs | `30000` |

---

## Core Components

### 1. AgentService.vb - Main Service

The entry point of the agent service. Manages the lifecycle and background threads.

#### Startup Flow (`OnStart`)

1. Load configuration from `app.config`
2. Register with the server via `POST /agents/register`
3. Receive `agent_id` from server
4. Load door info via `GET /agents/{id}/status`
5. Register each door in the BioBridgeController (terminal IP/port mapping)
6. Start 3 background threads:
   - **Command Polling Loop**
   - **Heartbeat Loop**
   - **Ingress Sync Loop** (if enabled)

#### Shutdown (`OnStop`)

1. Set cancellation flags
2. Wait for threads to complete
3. Dispose BioBridgeController (disconnect from terminals)

---

### 2. ServerClient.vb - Server Communication

HTTP client for all server interactions. Uses `X-Agent-Key` header for authentication.

#### Methods

| Method | HTTP Call | Description |
|--------|----------|-------------|
| `RegisterAgent()` | `POST /agents/register` | Register agent, returns `agent_id` |
| `GetCommands(agentId)` | `GET /agents/{id}/commands?timeout=2` | Long-poll for pending commands |
| `SendResult(agentId, cmdId, success, result, error)` | `POST /agents/{id}/results` | Report command result |
| `SendHeartbeat(agentId)` | `POST /agents/{id}/heartbeat` | Confirm agent is alive |
| `GetDoorInfo(agentId)` | `GET /agents/{id}/status` | Get doors managed by this agent |
| `SendIngressEvents(agentId, events)` | `POST /agents/{id}/events` | Submit ingress events |

#### Request Configuration

- **Command timeout**: `CommandTimeout + 3s` (to allow for long-polling)
- **Other timeouts**: 10 seconds
- **Headers**: `X-Agent-Key: <agent_key>`, `Content-Type: application/json`

---

### 3. BioBridgeController.vb - Terminal Communication

Manages TCP/IP connections to ZKTeco terminals via the BioBridge SDK.

#### Key Features

- **Persistent Connection Caching**: Maintains the current TCP connection. If the next command targets the same terminal, the connection is reused (no reconnect overhead).
- **Thread-Safe**: Uses locks for concurrent access to door connections.
- **Connection State Tracking**: `_connectedTerminalIP`, `_connectedTerminalPort`, `_isConnected`

#### Methods

| Method | Description |
|--------|-------------|
| `RegisterDoor(doorId, terminalIP, terminalPort)` | Register a door in the local cache |
| `OpenDoor(doorId, delay)` | Connect to terminal and unlock the door for `delay` ms |
| `CloseDoor(doorId)` | Returns true (doors auto-close after delay) |
| `GetDoorStatus(doorId)` | Returns cached status ("Open", "Closed", "Unknown") |
| `GetDoorCount()` | Returns total registered doors |
| `Dispose()` | Disconnect from terminal and clean up |

#### Open Door Flow

1. Look up door in cache by `doorId`
2. Check if already connected to the same terminal IP/port
3. If different terminal: disconnect from current, connect to new one via `axBioBridgeSDK1.Connect_TCPIP(ip, port)`
4. Call `axBioBridgeSDK1.UnlockDoor(delay)`
5. Update door status in cache
6. Return success/failure

---

### 4. ConfigManager.vb - Configuration

Reads configuration from `app.config`. All values have sensible defaults.

---

### 5. IngressHelper.vb - Ingress Database Sync (Optional)

Synchronizes events from an external ingress door control system into URZIS PASS.

#### How It Works

1. Connects to a separate MySQL database (the ingress system)
2. Queries `door_eventlog` table for new events since last sync
3. Joins with `device` and `door_eventlog_description` tables for metadata
4. Returns events with: ingress ID, serial number, event type, timestamp, user ID, device IP, description
5. Tracks `_lastSyncId` to only fetch new events each cycle
6. Limit: 100 events per fetch

#### Event Data

| Field | Description |
|-------|-------------|
| `IngressId` | Unique event ID from ingress system |
| `SerialNo` | Device serial number |
| `EventType` | Event type code |
| `EventTime` | Event timestamp |
| `UserId` | User/badge ID |
| `DeviceIP` | Terminal IP address |
| `DevicePort` | Terminal port |
| `Description` | Human-readable description |

---

## Background Threads

### Command Polling Loop

```
loop:
  commands = ServerClient.GetCommands(agentId)  // long-poll, blocks up to 2s
  if commands found:
    for each command:
      ProcessCommand(command)
    continue loop immediately (no sleep)
  else:
    sleep(PollingInterval)  // 500ms default
  on error:
    sleep(2000)  // error recovery
```

**Processing a command**:
1. Parse `command_type` ("open", "close", "status")
2. Extract parameters (delay, etc.)
3. Call `BioBridgeController.OpenDoor/CloseDoor/GetDoorStatus`
4. Send result back via `ServerClient.SendResult`
5. Log door event via `ServerClient.SendResult`

### Heartbeat Loop

```
loop:
  ServerClient.SendHeartbeat(agentId)
  sleep(HeartbeatInterval)  // 30s default
```

The server updates `agents.last_heartbeat` and `agents.is_online = 1`.

### Ingress Sync Loop (if enabled)

```
loop:
  events = IngressHelper.GetNewEvents()
  if events found:
    ServerClient.SendIngressEvents(agentId, events)
  sleep(IngressSyncInterval)  // 30s default
```

---

## Latency Optimizations

| Optimization | Before | After |
|-------------|--------|-------|
| Long-polling timeout | 5s | 2s |
| Polling interval | 3000ms | 500ms |
| Immediate re-poll after commands | No (sleep) | Yes |
| Persistent TCP connections | Reconnect each time | Cache connection |
| Error recovery sleep | 5s | 2s |

**Typical latency** (user tap to door unlock): **< 1 second** under normal conditions.

---

## Installation & Deployment

### Prerequisites

- Windows 10/11 or Server
- .NET Framework 4.8
- Network access to URZIS PASS server (port 8080)
- Network access to BioBridge/ZKTeco terminals (port 4370)
- Agent files: UDM-Agent.exe, UDM-Agent.exe.config, BioBridgeSDKDLLv3.dll, Interop.zkemkeeper.dll, MySql.Data.dll (and optionally InstallUtil32/64)

### Step 1 – Install location (important)

- **Avoid** installing under `C:\Program Files\AGENT` if the agent is built as 32-bit (x86): Windows then redirects config reads to `C:\Program Files (x86)\AGENT\`, so you must maintain the same config in both places, which is error-prone.
- **Recommended**: install in a non-redirected folder, e.g. `C:\AGENT` or `C:\URZIS PASS\AGENT`.
- Copy all agent files (exe, exe.config, dlls) into that folder.

### Step 2 – Configuration file

- Edit **UDM-Agent.exe.config** (in the same folder as UDM-Agent.exe).
- Use **lowercase** XML tags: `<add key="..." value="..." />`. Uppercase (`<ADD KEY="..." VALUE="..." />`) is not recognised and causes "AgentKey is required in app.config".

Example:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <add key="ServerUrl" value="http://app.pass.urzis.com:8080" />
    <add key="AgentKey" value="YOUR_UNIQUE_AGENT_KEY" />
    <add key="EnterpriseId" value="100" />
    <add key="PollingInterval" value="500" />
    <add key="HeartbeatInterval" value="30000" />
    <add key="CommandTimeout" value="2" />
    <add key="IngressEnabled" value="false" />
  </appSettings>
</configuration>
```

- **ServerUrl**: base URL of the server (no trailing slash).
- **AgentKey**: unique key for this agent (must match the value in the database).
- **EnterpriseId**: enterprise ID in udm_multitenant.

### Step 3 – Register the agent in the database (server side)

On the URZIS PASS server, in database **udm_multitenant**:

```sql
USE udm_multitenant;

-- Ensure the enterprise exists (adjust or create if needed)
SELECT id, name FROM enterprises WHERE id = 100;

INSERT INTO agents (enterprise_id, name, agent_key, is_online, is_active)
VALUES (100, 'Agent display name (e.g. Agent Site 1)', 'YOUR_UNIQUE_AGENT_KEY', 0, 1);
```

- **agent_key** must be **exactly** the same as **AgentKey** in UDM-Agent.exe.config.
- **enterprise_id** must match **EnterpriseId** in the config.

### Step 4 – Install the Windows service

- Open **PowerShell as Administrator** (right-click PowerShell → Run as administrator).
- Go to the agent folder, e.g. `cd "C:\AGENT"`.
- Run the service installer (32-bit or 64-bit depending on your agent build):

```powershell
# 32-bit (most common for UDM-Agent)
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe UDM-Agent.exe

# 64-bit
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM-Agent.exe
```

- If you get an Event Log–related error, run PowerShell as Administrator and retry.

### Step 5 – If the agent is installed under C:\Program Files\AGENT (32-bit)

- The 32-bit process reads config from **C:\Program Files (x86)\AGENT\**.
- Create that folder and copy the same UDM-Agent.exe.config there:

```powershell
New-Item -ItemType Directory -Path "C:\Program Files (x86)\AGENT" -Force
Copy-Item "C:\Program Files\AGENT\UDM-Agent.exe.config" -Destination "C:\Program Files (x86)\AGENT\UDM-Agent.exe.config" -Force
```

- Then restart the service.

### Step 6 – Start and verify

```powershell
Start-Service -Name "UDM-Agent"
Get-Service -Name "UDM-Agent"
Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
```

- In the logs you should see "Agent registered with ID: X" and "Door info loaded. Total doors: N".
- In the database: `SELECT id, name, agent_key, is_online, last_heartbeat FROM agents WHERE agent_key = 'YOUR_KEY';` — **is_online** should become 1 and **last_heartbeat** should update.

### Uninstall

```powershell
Stop-Service -Name "UDM-Agent"
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe /u UDM-Agent.exe
```

### Multiple Agents

You can run multiple agents for the same enterprise, each managing different doors. Each agent needs:
- Its own agent record in the database (unique `agent_key`)
- Its own `app.config` with the corresponding key
- Doors assigned to it in the `doors.agent_id` column

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "AgentKey is required in app.config" | Uppercase XML tags (`<ADD KEY=...>`) or wrong config file | Use lowercase `<add key="..." value="..." />`; ensure you edit UDM-Agent.exe.config in the folder used by the service. If installed under Program Files with 32-bit agent, also copy config to `C:\Program Files (x86)\AGENT\`. |
| Agent not appearing online | Wrong `AgentKey` or `ServerUrl` | Check UDM-Agent.exe.config; verify agent_key matches database; test connectivity to server (e.g. POST /agents/register from agent machine). |
| Config not read (keys empty) | 32-bit process + install under Program Files | Service reads from `C:\Program Files (x86)\AGENT\`. Copy UDM-Agent.exe.config there, or reinstall agent in e.g. `C:\AGENT` to avoid redirect. |
| Event Log error when installing | Insufficient privileges | Run PowerShell as Administrator. |
| Commands not executing | Agent not connected to terminal | Check terminal IP/port, network connectivity |
| High latency | Polling interval too high | Reduce `PollingInterval` (default 500ms) |
| "Connection refused" to terminal | Terminal offline or wrong port | Verify terminal is powered on and port 4370 is accessible |
| Agent crashes on startup | Missing BioBridgeSDKDLL.dll | Ensure the SDK DLL is in the application directory |
| Ingress events not syncing | IngressEnabled = false | Set to `true` and configure MySQL connection |

---

## Security Notes

- The `AgentKey` is a shared secret between the agent and server. Use a strong, unique key per agent.
- The agent communicates with the server over HTTP. For production, consider using HTTPS.
- Terminal communication (TCP/IP) is unencrypted. Ensure terminals are on a secured network.
- The agent has no direct database access to `udm_multitenant`; all operations go through the server API.
