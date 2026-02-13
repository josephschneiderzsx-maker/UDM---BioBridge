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

- Windows machine with .NET runtime
- Network access to:
  - URZIS PASS Server (HTTP, default port 8080)
  - Physical terminal(s) (TCP, default port 4370)
- BioBridgeSDKDLL.dll in the application directory

### Steps

1. **Database Setup**: Ensure the enterprise and agent records exist:
   ```sql
   INSERT INTO agents (enterprise_id, name, agent_key, is_online)
   VALUES (1, 'Agent-PC-Bureau', 'YOUR_UNIQUE_KEY', 0);
   ```

2. **Configuration**: Edit `app.config`:
   - Set `ServerUrl` to the server address
   - Set `AgentKey` to match the `agent_key` in the database
   - Set `EnterpriseId` to the correct enterprise
   - Adjust polling/heartbeat intervals as needed

3. **Build**: `dotnet build BioBridgeDoorControlAgent.sln --configuration Release`

4. **Install**: Install as Windows Service:
   ```
   sc create UDM-Agent binPath= "C:\path\to\BioBridgeDoorControlAgent.exe"
   sc config UDM-Agent start= auto
   sc start UDM-Agent
   ```

5. **Verify**: Check that the agent appears as online in the server (via `GET /{tenant}/agents`).

### Multiple Agents

You can run multiple agents for the same enterprise, each managing different doors. Each agent needs:
- Its own agent record in the database (unique `agent_key`)
- Its own `app.config` with the corresponding key
- Doors assigned to it in the `doors.agent_id` column

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Agent not appearing online | Wrong `AgentKey` or `ServerUrl` | Check `app.config` values |
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
