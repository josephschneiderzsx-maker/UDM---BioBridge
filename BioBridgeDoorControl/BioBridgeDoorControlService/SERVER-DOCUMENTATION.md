# URZIS PASS - Server Service Documentation

## Overview

The **BioBridgeDoorControlService** is a Windows Service that provides the REST API backend for the URZIS PASS door access control system. It handles multi-tenant operations, user authentication, door management, command queuing, and license enforcement.

- **Service Name**: UDM
- **Port**: 8080 (HTTP)
- **Platform**: .NET / VB.NET Windows Service
- **Database**: MySQL `udm_multitenant`

---

## Configuration

**File**: `app.config`

| Key | Description | Default |
|-----|-------------|---------|
| `MYSQL_HOST` | MySQL server hostname | `localhost` |
| `MYSQL_DATABASE` | Database name | `udm_multitenant` |
| `MYSQL_USER` | Database user | `udm` |
| `MYSQL_PASSWORD` | Database password | `udm` |
| `JWT_SECRET` | Secret key for JWT signing (HS256) | *(must be changed)* |
| `JWT_EXPIRATION_HOURS` | Token expiry duration | `24` |

---

## Architecture

```
Mobile App (React Native)
    |
    | HTTPS REST API (port 8080)
    v
Server Service (BioBridgeDoorControlService)
    |
    |--- MySQL (udm_multitenant)
    |--- Command Queue --> Agent Service(s)
    |
Agent Service (BioBridgeDoorControlAgent)
    |
    | TCP/IP (BioBridge SDK)
    v
Physical Terminals (ZKTeco)
```

### Core Components

| File | Role |
|------|------|
| `Service1.vb` | Main HTTP server, routing, CORS, BioBridge SDK events |
| `DatabaseHelper.vb` | All database operations and data classes |
| `AuthHelper.vb` | JWT token generation and validation (HS256) |
| `CommandQueueManager.vb` | Command queue (pending -> processing -> completed/failed) |
| `PermissionChecker.vb` | User permission checks (open, close, status per door) |

---

## Multi-Tenant Model

Every API request (except agent routes) uses the URL pattern `/{tenant}/...` where `{tenant}` is the enterprise slug (e.g., `servotel`).

The server resolves the slug to an `enterprise_id` via `enterprises.slug` column. If the slug is not found or inactive, it returns 404.

---

## Authentication

### JWT Token

- **Algorithm**: HMAC-SHA256
- **Expiry**: Configurable (default 24 hours)
- **Claims**: `sub` (userId), `enterpriseId`, `email`, `isAdmin`, `exp`
- **Header**: `Authorization: Bearer <token>`

### Agent Authentication

Agents use a static key in the `X-Agent-Key` header, matched against the `agents.agent_key` column.

---

## License Enforcement

The `enterprises` table has `license_start_date` and `license_end_date` columns (both nullable).

### Status Computation

| Condition | Status |
|-----------|--------|
| `license_start_date` is NULL and `license_end_date` is NULL | `Valid` (no restriction) |
| Today < `license_start_date` | `NotStarted` |
| Today <= `license_end_date` | `Valid` |
| Today > `license_end_date` AND Today <= `license_end_date + 3 days` | `GracePeriod` |
| Today > `license_end_date + 3 days` | `Expired` |

### Enforcement Rules

- **Login**: Blocked when `Expired` or `NotStarted` (returns 403)
- **All authenticated endpoints**: Blocked when `Expired` or `NotStarted` (returns 403)
- **`GET /{tenant}/license-status`**: Always accessible (placed before the license block check) so the mobile app can display status messages
- **Grace Period**: User can continue using the service for 3 days after `license_end_date`. The mobile app displays a renewal banner.

---

## REST API Reference

### Authentication

#### POST `/{tenant}/auth/login`
Login and obtain a JWT token.

- **Auth**: None
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "plaintext_password"
}
```
- **Response 200**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```
- **Response 401**: `{"error":"Invalid credentials"}`
- **Response 403**: `{"error":"license_expired","message":"Your license has expired..."}`

---

### License

#### GET `/{tenant}/license-status`
Returns the current license status for the enterprise. This endpoint is accessible even when the license is expired or not started.

- **Auth**: Bearer token
- **Response 200**:
```json
{
  "status": "Valid|GracePeriod|Expired|NotStarted",
  "end_date": "2026-02-12",
  "grace_until": "2026-02-15"
}
```
Note: `end_date` and `grace_until` are `null` if no license dates are set.

---

### Quotas

#### GET `/{tenant}/quota`
Returns door quota for the enterprise.

- **Auth**: Bearer token
- **Response 200**: `{"quota":10,"used":3,"remaining":7}`

#### GET `/{tenant}/users-quota`
Returns user quota for the enterprise.

- **Auth**: Bearer token
- **Response 200**: `{"quota":20,"used":5,"remaining":15}`

---

### Doors

#### GET `/{tenant}/doors`
List doors accessible to the authenticated user.

- **Auth**: Bearer token
- **Behavior**: Admins see all doors. Regular users see only doors they have permissions for.
- **Response 200**:
```json
{
  "doors": [
    {
      "id": 1,
      "name": "Main Entrance",
      "terminal_ip": "192.168.40.10",
      "terminal_port": 4370,
      "default_delay": 3000,
      "agent_id": 1
    }
  ]
}
```

#### POST `/{tenant}/doors`
Create a new door. **Admin only.**

- **Auth**: Bearer token (admin)
- **Request Body**:
```json
{
  "name": "New Door",
  "terminal_ip": "192.168.40.11",
  "terminal_port": 4370,
  "agent_id": 1,
  "default_delay": 3000
}
```
- **Response 201**: `{"success":true,"door_id":2,"message":"Door created successfully"}`
- **Response 403**: `{"error":"Door quota exceeded..."}`
- **Response 400**: `{"error":"Invalid agent_id for this enterprise"}`

#### PUT `/{tenant}/doors/{id}`
Update an existing door. **Admin only.**

- **Auth**: Bearer token (admin)
- **Request Body**: `{"name":"Updated","terminal_ip":"192.168.40.12","terminal_port":4370,"agent_id":1,"default_delay":3000}`
- **Response 200**: `{"success":true,"message":"Door updated successfully"}`

#### DELETE `/{tenant}/doors/{id}`
Soft-delete a door. **Admin only.**

- **Auth**: Bearer token (admin)
- **Response 200**: `{"success":true,"message":"Door deleted successfully"}`

---

### Door Commands

#### POST `/{tenant}/doors/{id}/open`
Queue an open command for the door.

- **Auth**: Bearer token
- **Permission**: `can_open` (or admin)
- **Request Body** (optional): `{"delay":3000}` (milliseconds)
- **Response 200**:
```json
{
  "success": true,
  "command_id": 123,
  "message": "Command queued"
}
```

#### POST `/{tenant}/doors/{id}/close`
Queue a close command.

- **Auth**: Bearer token
- **Permission**: `can_close` (or admin)
- **Response 200**: `{"success":true,"command_id":124,"message":"Command queued"}`

#### GET `/{tenant}/doors/{id}/status`
Queue a status check command.

- **Auth**: Bearer token
- **Permission**: `can_view_status` (or admin)
- **Response 200**: `{"success":true,"command_id":125,"message":"Status request queued"}`

#### GET `/{tenant}/commands/{id}`
Poll the result of a queued command.

- **Auth**: Bearer token
- **Response 200**:
```json
{
  "id": 123,
  "status": "pending|processing|completed|failed",
  "command_type": "open|close|status",
  "result": "{\"status\":\"open\",\"delay\":3000}",
  "error_message": null
}
```

---

### User Profile

#### GET `/{tenant}/users/me`
Get the authenticated user's profile.

- **Auth**: Bearer token
- **Response 200**:
```json
{
  "id": 1,
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_admin": false
}
```

#### PUT `/{tenant}/users/me`
Update profile.

- **Auth**: Bearer token
- **Request Body**: `{"first_name":"John","last_name":"Doe"}`
- **Response 200**: `{"success":true,"message":"Profile updated"}`

#### PUT `/{tenant}/users/me/password`
Change password.

- **Auth**: Bearer token
- **Request Body**: `{"current_password":"old","new_password":"new"}`
- **Response 200**: `{"success":true,"message":"Password changed"}`
- **Response 401**: `{"error":"Current password is incorrect"}`

---

### User Management (Admin Only)

#### GET `/{tenant}/users`
List all users for the enterprise.

- **Auth**: Bearer token (admin)
- **Response 200**:
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@example.com",
      "first_name": "Admin",
      "last_name": "User",
      "is_admin": true
    }
  ]
}
```

#### POST `/{tenant}/users`
Create a new user.

- **Auth**: Bearer token (admin)
- **Request Body**:
```json
{
  "email": "new@example.com",
  "password": "password123",
  "first_name": "New",
  "last_name": "User",
  "is_admin": false
}
```
- **Response 201**: `{"success":true,"user_id":3}`
- **Response 409**: `{"error":"Email already exists"}`

#### PUT `/{tenant}/users/{id}`
Update a user.

- **Auth**: Bearer token (admin)
- **Request Body**: `{"first_name":"Updated","last_name":"User","is_admin":true}`
- **Response 200**: `{"success":true,"message":"User updated"}`

#### DELETE `/{tenant}/users/{id}`
Soft-delete a user.

- **Auth**: Bearer token (admin)
- **Response 200**: `{"success":true,"message":"User deleted"}`

---

### User Permissions (Admin Only)

#### GET `/{tenant}/users/{id}/permissions`
Get door permissions for a user.

- **Auth**: Bearer token (admin)
- **Response 200**:
```json
{
  "permissions": [
    {
      "door_id": 1,
      "door_name": "Main Entrance",
      "can_open": true,
      "can_close": true,
      "can_view_status": true
    }
  ]
}
```

#### PUT `/{tenant}/users/{id}/permissions`
Set door permissions for a user (replaces all existing permissions).

- **Auth**: Bearer token (admin)
- **Request Body**:
```json
{
  "permissions": [
    {"door_id":1,"can_open":true,"can_close":true,"can_view_status":true},
    {"door_id":2,"can_open":true,"can_close":false,"can_view_status":true}
  ]
}
```
- **Response 200**: `{"success":true,"message":"Permissions updated"}`

---

### Events / Activity Log

#### GET `/{tenant}/events?door_id={id}&limit=50`
Get door events (activity log).

- **Auth**: Bearer token
- **Query Params**:
  - `door_id` (optional): Filter by door
  - `limit` (optional): Max results (default 50, max 200)
- **Behavior**: Admins see all events. Regular users see only events for doors they have permissions for.
- **Response 200**:
```json
{
  "events": [
    {
      "id": 1,
      "door_id": 1,
      "door_name": "Main Entrance",
      "event_type": "open",
      "event_data": null,
      "source": "command",
      "created_at": "2025-01-15T14:32:10"
    }
  ]
}
```
Event sources: `command` (user action), `ingress` (from ingress system), `terminal` (terminal event).

---

### Notification Preferences

#### GET `/{tenant}/notifications`
Get notification preferences for the authenticated user.

- **Auth**: Bearer token
- **Response 200**:
```json
{
  "preferences": [
    {
      "door_id": 1,
      "door_name": "Main Entrance",
      "notify_on_open": true,
      "notify_on_close": false,
      "notify_on_forced": true
    }
  ]
}
```

#### PUT `/{tenant}/notifications`
Set notification preference for a door.

- **Auth**: Bearer token
- **Request Body**: `{"door_id":1,"notify_on_open":true,"notify_on_close":false,"notify_on_forced":true}`
- **Response 200**: `{"success":true,"message":"Notification preferences updated"}`

---

### Agents

#### GET `/{tenant}/agents`
List agents for the enterprise.

- **Auth**: Bearer token
- **Response 200**:
```json
{
  "agents": [
    {"id":1,"name":"PC Bureau Principal"}
  ]
}
```

---

## Agent Communication Routes

These routes are used internally by the Agent Service. They are not under a tenant prefix.

#### POST `/agents/register`
Register an agent with the server.

- **Auth**: None (agent_key in body)
- **Request Body**: `{"agent_key":"...", "enterprise_id":1, "name":"Agent-1", "version":"1.0.0"}`
- **Response**: `{"agent_id":1,"status":"registered"}`

#### POST `/agents/{id}/heartbeat`
Agent heartbeat to confirm it's online.

- **Auth**: `X-Agent-Key` header
- **Response**: `{"status":"ok"}`

#### GET `/agents/{id}/commands?timeout=2`
Long-poll for pending commands assigned to this agent.

- **Auth**: `X-Agent-Key` header
- **Query**: `timeout` (seconds for long polling, default 2)
- **Response 200**:
```json
{
  "commands": [
    {
      "id": 123,
      "door_id": 1,
      "command_type": "open",
      "parameters": "{\"delay\":3000}"
    }
  ]
}
```

#### POST `/agents/{id}/results`
Submit command execution result.

- **Auth**: `X-Agent-Key` header
- **Request Body**:
```json
{
  "command_id": 123,
  "success": true,
  "result": "{\"status\":\"open\"}",
  "error_message": null
}
```
- **Response**: `{"status":"ok"}`

#### GET `/agents/{id}/status`
Get doors managed by this agent.

- **Auth**: `X-Agent-Key` header
- **Response 200**:
```json
{
  "doors": [
    {"id":1,"terminal_ip":"192.168.40.10","terminal_port":4370}
  ]
}
```

#### POST `/agents/{id}/events`
Submit ingress events from the agent.

- **Auth**: `X-Agent-Key` header
- **Request Body**:
```json
{
  "events": [
    {
      "ingress_id": 500,
      "event_type": "door_open",
      "device_ip": "192.168.40.10",
      "description": "Door opened by badge 12345"
    }
  ]
}
```
- **Response**: `{"status":"ok","inserted":1}`

---

## Command Queue System

Commands flow through a queue to handle asynchronous terminal communication:

```
Mobile App                Server              Agent              Terminal
    |                       |                   |                   |
    |-- POST open/close --> |                   |                   |
    |<-- command_id ------- |                   |                   |
    |                       |-- pending cmd --> |                   |
    |                       |                   |-- TCP/SDK ------> |
    |                       |                   |<-- result --------|
    |                       |<-- result --------|                   |
    |-- GET command/{id} -> |                   |                   |
    |<-- completed ---------|                   |                   |
```

### Status Flow
`pending` -> `processing` (agent picks up) -> `completed` or `failed`

### Optimizations
- Batch UPDATE to mark commands as "processing" (eliminates N+1 queries)
- Agent long-polling with 2s timeout
- Agent re-polls immediately after processing (no sleep)

---

## Database Schema

### Key Tables

| Table | Description |
|-------|-------------|
| `enterprises` | Tenants with slug, name, quotas, license dates |
| `agents` | Agent services per enterprise |
| `doors` | Physical doors with terminal IP/port config |
| `users` | Users per enterprise with email/password/admin flag |
| `user_door_permissions` | Per-user, per-door permissions (open/close/status) |
| `command_queue` | Async command queue (pending/processing/completed/failed) |
| `door_events` | Activity log of all door operations |
| `notification_preferences` | Per-user notification settings per door |

---

## Installation & Deployment

1. **Database**: Run `Database/shema.sql` to create the schema, then run any migration files in `Database/`.
2. **Configuration**: Edit `app.config` with your MySQL credentials and a strong JWT secret.
3. **Build**: `dotnet build BioBridgeDoorControlService.sln --configuration Release`
4. **Install**: Install as Windows Service using `sc create` or `installutil`.
5. **HTTP Reservation**: Run `netsh http add urlacl url=http://+:8080/ user=Everyone` (as admin) to allow the service to listen on port 8080.
6. **Firewall**: Open port 8080 for inbound TCP connections.

---

## Security Notes

- JWT tokens are signed with HS256. Use a strong, unique `JWT_SECRET`.
- Passwords are hashed with SHA256. Consider upgrading to bcrypt for production.
- Multi-tenant isolation is enforced at every endpoint via enterprise_id checks.
- Admin-only operations are verified via the `isAdmin` JWT claim.
- All door operations are checked against `user_door_permissions`.
- License enforcement blocks all operations when expired (except `license-status`).
