Imports MySql.Data.MySqlClient
Imports System.Configuration
Imports System.Collections.Generic

Public Class DatabaseHelper
    Private ReadOnly _connectionString As String

    Public Sub New()
        Dim host = ConfigurationManager.AppSettings("MYSQL_HOST")
        Dim db = ConfigurationManager.AppSettings("MYSQL_DATABASE")
        Dim user = ConfigurationManager.AppSettings("MYSQL_USER")
        Dim pwd = ConfigurationManager.AppSettings("MYSQL_PASSWORD")

        _connectionString = $"Server={host};Database={db};Uid={user};Pwd={pwd};SslMode=Preferred;Convert Zero Datetime=True;"
    End Sub

    Public Function GetConnection() As MySqlConnection
        Dim conn As New MySqlConnection(_connectionString)
        conn.Open()
        Return conn
    End Function

    Public Function GetEnterpriseIdBySlug(slug As String) As Integer?
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT id FROM enterprises WHERE slug = @slug AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@slug", slug)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then
                    Return Nothing
                End If
                Return CInt(obj)
            End Using
        End Using
    End Function

    ''' <summary>Returns "Valid", "GracePeriod", "Expired", or "NotStarted". No end_date = Valid. Expired = today > end_date + 3 days.</summary>
    Public Function GetEnterpriseLicenseStatus(enterpriseId As Integer) As String
        Dim info = GetEnterpriseLicenseInfo(enterpriseId)
        Return info.Status
    End Function

    ''' <summary>Returns status, end_date (nullable), grace_until (end_date + 3 days, nullable).</summary>
    Public Function GetEnterpriseLicenseInfo(enterpriseId As Integer) As LicenseInfo
        Dim result As New LicenseInfo()
        result.Status = "Valid"
        result.EndDate = Nothing
        result.GraceUntil = Nothing
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT license_start_date, license_end_date FROM enterprises WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    If Not rdr.Read() Then Return result
                    Dim startDate As DateTime? = Nothing
                    Dim endDate As DateTime? = Nothing
                    If Not rdr.IsDBNull(0) Then startDate = rdr.GetDateTime(0)
                    If Not rdr.IsDBNull(1) Then endDate = rdr.GetDateTime(1)
                    Dim today = DateTime.Today
                    If startDate.HasValue AndAlso today < startDate.Value.Date Then
                        result.Status = "NotStarted"
                        Return result
                    End If
                    If Not endDate.HasValue Then Return result
                    Dim endVal = endDate.Value.Date
                    result.EndDate = endVal
                    result.GraceUntil = endVal.AddDays(3)
                    If today > endVal.AddDays(3) Then
                        result.Status = "Expired"
                        Return result
                    End If
                    If today > endVal Then
                        result.Status = "GracePeriod"
                        Return result
                    End If
                    result.Status = "Valid"
                    Return result
                End Using
            End Using
        End Using
    End Function

    Public Function GetAgentIdForDoor(doorId As Integer) As Integer?
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT agent_id FROM doors WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", doorId)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then
                    Return Nothing
                End If
                Return CInt(obj)
            End Using
        End Using
    End Function

    Public Function GetDoorIdsForAgent(agentId As Integer) As List(Of Integer)
        Dim ids As New List(Of Integer)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT id FROM doors WHERE agent_id = @aid AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@aid", agentId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        ids.Add(rdr.GetInt32(0))
                    End While
                End Using
            End Using
        End Using
        Return ids
    End Function

    Public Function GetDoorsForUser(userId As Integer, enterpriseId As Integer, isAdmin As Boolean) As List(Of DoorInfo)
        Dim doors As New List(Of DoorInfo)()
        Using conn = GetConnection()
            Dim sql As String
            If isAdmin Then
                ' Admin voit toutes les portes de l'entreprise
                sql = "SELECT d.id, d.name, d.terminal_ip, d.terminal_port, d.default_delay, d.agent_id " &
                      "FROM doors d " &
                      "WHERE d.enterprise_id = @ent AND d.is_active = 1 " &
                      "ORDER BY d.name"
            Else
                ' Utilisateur normal voit seulement les portes où il a des permissions
                sql = "SELECT DISTINCT d.id, d.name, d.terminal_ip, d.terminal_port, d.default_delay, d.agent_id " &
                      "FROM doors d " &
                      "INNER JOIN user_door_permissions udp ON d.id = udp.door_id " &
                      "WHERE d.enterprise_id = @ent AND d.is_active = 1 AND udp.user_id = @uid " &
                      "ORDER BY d.name"
            End If
            
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                If Not isAdmin Then
                    cmd.Parameters.AddWithValue("@uid", userId)
                End If
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim door As New DoorInfo()
                        door.Id = rdr.GetInt32(0)
                        door.Name = rdr.GetString(1)
                        door.TerminalIP = rdr.GetString(2)
                        door.TerminalPort = rdr.GetInt32(3)
                        door.DefaultDelay = rdr.GetInt32(4)
                        door.AgentId = rdr.GetInt32(5)
                        doors.Add(door)
                    End While
                End Using
            End Using
        End Using
        Return doors
    End Function

    Public Function GetEnterpriseQuota(enterpriseId As Integer) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT door_quota FROM enterprises WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", enterpriseId)
                Dim result = cmd.ExecuteScalar()
                If result Is Nothing OrElse result Is DBNull.Value Then
                    Return 10 ' Default
                End If
                Return CInt(result)
            End Using
        End Using
    End Function

    Public Function GetActiveDoorCount(enterpriseId As Integer) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT COUNT(*) FROM doors WHERE enterprise_id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", enterpriseId)
                Return CInt(cmd.ExecuteScalar())
            End Using
        End Using
    End Function

    Public Function GetEnterpriseUserQuota(enterpriseId As Integer) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT user_quota FROM enterprises WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", enterpriseId)
                Dim result = cmd.ExecuteScalar()
                If result Is Nothing OrElse result Is DBNull.Value Then
                    Return 20 ' Default
                End If
                Return CInt(result)
            End Using
        End Using
    End Function

    Public Function GetActiveUserCount(enterpriseId As Integer) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT COUNT(*) FROM users WHERE enterprise_id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", enterpriseId)
                Return CInt(cmd.ExecuteScalar())
            End Using
        End Using
    End Function

    Public Function CreateDoor(enterpriseId As Integer, agentId As Integer, name As String, terminalIp As String, terminalPort As Integer, defaultDelay As Integer) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay) VALUES (@ent, @agent, @name, @ip, @port, @delay)", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@agent", agentId)
                cmd.Parameters.AddWithValue("@name", name)
                cmd.Parameters.AddWithValue("@ip", terminalIp)
                cmd.Parameters.AddWithValue("@port", terminalPort)
                cmd.Parameters.AddWithValue("@delay", defaultDelay)
                cmd.ExecuteNonQuery()
                Return CInt(cmd.LastInsertedId)
            End Using
        End Using
    End Function

    Public Sub UpdateDoor(doorId As Integer, name As String, terminalIp As String, terminalPort As Integer, defaultDelay As Integer, agentId As Integer)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "UPDATE doors SET name = @name, terminal_ip = @ip, terminal_port = @port, default_delay = @delay, agent_id = @agent WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", doorId)
                cmd.Parameters.AddWithValue("@name", name)
                cmd.Parameters.AddWithValue("@ip", terminalIp)
                cmd.Parameters.AddWithValue("@port", terminalPort)
                cmd.Parameters.AddWithValue("@delay", defaultDelay)
                cmd.Parameters.AddWithValue("@agent", agentId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Sub DeleteDoor(doorId As Integer)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE doors SET is_active = 0 WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", doorId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Function GetDoorById(doorId As Integer, enterpriseId As Integer) As DoorInfo
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id, name, terminal_ip, terminal_port, default_delay, agent_id FROM doors WHERE id = @id AND enterprise_id = @ent AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", doorId)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    If rdr.Read() Then
                        Dim door As New DoorInfo()
                        door.Id = rdr.GetInt32(0)
                        door.Name = rdr.GetString(1)
                        door.TerminalIP = rdr.GetString(2)
                        door.TerminalPort = rdr.GetInt32(3)
                        door.DefaultDelay = rdr.GetInt32(4)
                        door.AgentId = rdr.GetInt32(5)
                        Return door
                    End If
                End Using
            End Using
        End Using
        Return Nothing
    End Function

    Public Function GetAgentsForEnterprise(enterpriseId As Integer) As List(Of AgentInfo)
        Dim agents As New List(Of AgentInfo)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT id, name FROM agents WHERE enterprise_id = @ent AND is_active = 1 ORDER BY name", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim agent As New AgentInfo()
                        agent.Id = rdr.GetInt32(0)
                        agent.Name = rdr.GetString(1)
                        agents.Add(agent)
                    End While
                End Using
            End Using
        End Using
        Return agents
    End Function

    ' ===== User Profile =====
    Public Function GetUserProfile(userId As Integer, enterpriseId As Integer) As UserProfile
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id, email, first_name, last_name, is_admin FROM users WHERE id = @id AND enterprise_id = @ent AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    If Not rdr.Read() Then Return Nothing
                    Dim p As New UserProfile()
                    p.Id = rdr.GetInt32(0)
                    p.Email = rdr.GetString(1)
                    p.FirstName = rdr.GetString(2)
                    p.LastName = rdr.GetString(3)
                    p.IsAdmin = rdr.GetBoolean(4)
                    Return p
                End Using
            End Using
        End Using
    End Function

    Public Sub UpdateUserProfile(userId As Integer, firstName As String, lastName As String)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE users SET first_name = @fn, last_name = @ln WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                cmd.Parameters.AddWithValue("@fn", firstName)
                cmd.Parameters.AddWithValue("@ln", lastName)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Function GetUserPasswordHash(userId As Integer) As String
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT password_hash FROM users WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then Return Nothing
                Return CStr(obj)
            End Using
        End Using
    End Function

    Public Sub UpdateUserPassword(userId As Integer, passwordHash As String)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE users SET password_hash = @hash WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                cmd.Parameters.AddWithValue("@hash", passwordHash)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    ' ===== User Management (Admin) =====
    Public Function GetUsersForEnterprise(enterpriseId As Integer) As List(Of UserProfile)
        Dim users As New List(Of UserProfile)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id, email, first_name, last_name, is_admin FROM users WHERE enterprise_id = @ent AND is_active = 1 ORDER BY first_name, last_name", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim u As New UserProfile()
                        u.Id = rdr.GetInt32(0)
                        u.Email = rdr.GetString(1)
                        u.FirstName = rdr.GetString(2)
                        u.LastName = rdr.GetString(3)
                        u.IsAdmin = rdr.GetBoolean(4)
                        users.Add(u)
                    End While
                End Using
            End Using
        End Using
        Return users
    End Function

    Public Function CreateUser(enterpriseId As Integer, email As String, passwordHash As String, firstName As String, lastName As String, isAdmin As Boolean) As Integer
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "INSERT INTO users (enterprise_id, email, password_hash, first_name, last_name, is_admin) VALUES (@ent, @email, @hash, @fn, @ln, @admin)", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@email", email)
                cmd.Parameters.AddWithValue("@hash", passwordHash)
                cmd.Parameters.AddWithValue("@fn", firstName)
                cmd.Parameters.AddWithValue("@ln", lastName)
                cmd.Parameters.AddWithValue("@admin", isAdmin)
                cmd.ExecuteNonQuery()
                Return CInt(cmd.LastInsertedId)
            End Using
        End Using
    End Function

    Public Sub UpdateUser(userId As Integer, firstName As String, lastName As String, isAdmin As Boolean)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "UPDATE users SET first_name = @fn, last_name = @ln, is_admin = @admin WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                cmd.Parameters.AddWithValue("@fn", firstName)
                cmd.Parameters.AddWithValue("@ln", lastName)
                cmd.Parameters.AddWithValue("@admin", isAdmin)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Sub DeleteUser(userId As Integer)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE users SET is_active = 0 WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", userId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Function GetUserPermissions(userId As Integer) As List(Of UserPermission)
        Dim perms As New List(Of UserPermission)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT udp.door_id, d.name, udp.can_open, udp.can_close, udp.can_view_status " &
                "FROM user_door_permissions udp " &
                "INNER JOIN doors d ON d.id = udp.door_id AND d.is_active = 1 " &
                "WHERE udp.user_id = @uid ORDER BY d.name", conn)
                cmd.Parameters.AddWithValue("@uid", userId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim p As New UserPermission()
                        p.DoorId = rdr.GetInt32(0)
                        p.DoorName = rdr.GetString(1)
                        p.CanOpen = rdr.GetBoolean(2)
                        p.CanClose = rdr.GetBoolean(3)
                        p.CanViewStatus = rdr.GetBoolean(4)
                        perms.Add(p)
                    End While
                End Using
            End Using
        End Using
        Return perms
    End Function

    Public Sub SetUserPermissions(userId As Integer, permissions As List(Of UserPermission))
        Using conn = GetConnection()
            ' Delete existing permissions
            Using delCmd = New MySqlCommand("DELETE FROM user_door_permissions WHERE user_id = @uid", conn)
                delCmd.Parameters.AddWithValue("@uid", userId)
                delCmd.ExecuteNonQuery()
            End Using
            ' Insert new permissions
            For Each perm As UserPermission In permissions
                Using insCmd = New MySqlCommand(
                    "INSERT INTO user_door_permissions (user_id, door_id, can_open, can_close, can_view_status) VALUES (@uid, @did, @open, @close, @status)", conn)
                    insCmd.Parameters.AddWithValue("@uid", userId)
                    insCmd.Parameters.AddWithValue("@did", perm.DoorId)
                    insCmd.Parameters.AddWithValue("@open", perm.CanOpen)
                    insCmd.Parameters.AddWithValue("@close", perm.CanClose)
                    insCmd.Parameters.AddWithValue("@status", perm.CanViewStatus)
                    insCmd.ExecuteNonQuery()
                End Using
            Next
        End Using
    End Sub

    ' ===== Door Events =====
    Public Function GetDoorEvents(enterpriseId As Integer, userId As Integer, isAdmin As Boolean, Optional doorId As Integer? = Nothing, Optional limit As Integer = 50) As List(Of DoorEventInfo)
        Dim events As New List(Of DoorEventInfo)()
        Using conn = GetConnection()
            Dim sql As String
            If isAdmin Then
                If doorId.HasValue Then
                    sql = "SELECT de.id, de.door_id, d.name, de.event_type, de.event_data, de.created_at, de.source " &
                          "FROM door_events de INNER JOIN doors d ON d.id = de.door_id " &
                          "WHERE d.enterprise_id = @ent AND de.door_id = @did " &
                          "ORDER BY de.created_at DESC LIMIT @limit"
                Else
                    sql = "SELECT de.id, de.door_id, d.name, de.event_type, de.event_data, de.created_at, de.source " &
                          "FROM door_events de INNER JOIN doors d ON d.id = de.door_id " &
                          "WHERE d.enterprise_id = @ent " &
                          "ORDER BY de.created_at DESC LIMIT @limit"
                End If
            Else
                If doorId.HasValue Then
                    sql = "SELECT de.id, de.door_id, d.name, de.event_type, de.event_data, de.created_at, de.source " &
                          "FROM door_events de INNER JOIN doors d ON d.id = de.door_id " &
                          "INNER JOIN user_door_permissions udp ON udp.door_id = d.id AND udp.user_id = @uid " &
                          "WHERE d.enterprise_id = @ent AND de.door_id = @did " &
                          "ORDER BY de.created_at DESC LIMIT @limit"
                Else
                    sql = "SELECT de.id, de.door_id, d.name, de.event_type, de.event_data, de.created_at, de.source " &
                          "FROM door_events de INNER JOIN doors d ON d.id = de.door_id " &
                          "INNER JOIN user_door_permissions udp ON udp.door_id = d.id AND udp.user_id = @uid " &
                          "WHERE d.enterprise_id = @ent " &
                          "ORDER BY de.created_at DESC LIMIT @limit"
                End If
            End If

            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@limit", limit)
                If Not isAdmin Then cmd.Parameters.AddWithValue("@uid", userId)
                If doorId.HasValue Then cmd.Parameters.AddWithValue("@did", doorId.Value)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim ev As New DoorEventInfo()
                        ev.Id = rdr.GetInt32(0)
                        ev.DoorId = rdr.GetInt32(1)
                        ev.DoorName = rdr.GetString(2)
                        ev.EventType = rdr.GetString(3)
                        If Not rdr.IsDBNull(4) Then ev.EventData = rdr.GetString(4)
                        ev.CreatedAt = rdr.GetDateTime(5)
                        If Not rdr.IsDBNull(6) Then ev.Source = rdr.GetString(6) Else ev.Source = "command"
                        events.Add(ev)
                    End While
                End Using
            End Using
        End Using
        Return events
    End Function

    Public Function GetEnterpriseIdForAgent(agentId As Integer) As Integer?
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("SELECT enterprise_id FROM agents WHERE id = @id AND is_active = 1", conn)
                cmd.Parameters.AddWithValue("@id", agentId)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then Return Nothing
                Return CInt(obj)
            End Using
        End Using
    End Function

    Public Function GetDoorIdByTerminalIP(enterpriseId As Integer, terminalIp As String) As Integer?
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id FROM doors WHERE enterprise_id = @ent AND terminal_ip = @ip AND is_active = 1 LIMIT 1", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@ip", terminalIp)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then Return Nothing
                Return CInt(obj)
            End Using
        End Using
    End Function

    ''' <summary>
    ''' Create a door if it doesn't already exist (matched by terminal_ip within the enterprise).
    ''' Returns the door ID (existing or newly created).
    ''' </summary>
    Public Function CreateDoorIfNotExists(enterpriseId As Integer, agentId As Integer, name As String, terminalIp As String, terminalPort As Integer) As Integer
        ' Check if door already exists
        Dim existingId As Integer? = GetDoorIdByTerminalIP(enterpriseId, terminalIp)
        If existingId.HasValue Then Return existingId.Value

        ' Create new door
        Using conn = GetConnection()
            Dim sql = "INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay, is_active, created_at) " &
                      "VALUES (@ent, @aid, @name, @ip, @port, 3000, 1, NOW())"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@aid", agentId)
                cmd.Parameters.AddWithValue("@name", name)
                cmd.Parameters.AddWithValue("@ip", terminalIp)
                cmd.Parameters.AddWithValue("@port", terminalPort)
                cmd.ExecuteNonQuery()
                Return CInt(cmd.LastInsertedId)
            End Using
        End Using
    End Function

    ' ===== Discovered Devices =====

    Public Sub InsertDiscoveredDevice(enterpriseId As Integer, agentId As Integer, deviceName As String, terminalIp As String, terminalPort As Integer)
        Using conn = GetConnection()
            Dim sql = "INSERT INTO discovered_devices (enterprise_id, agent_id, device_name, terminal_ip, terminal_port, status, discovered_at) " &
                      "VALUES (@ent, @aid, @name, @ip, @port, 'pending', NOW()) " &
                      "ON DUPLICATE KEY UPDATE device_name = @name, terminal_port = @port, agent_id = @aid, discovered_at = NOW(), status = IF(status = 'dismissed', 'dismissed', 'pending')"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.Parameters.AddWithValue("@aid", agentId)
                cmd.Parameters.AddWithValue("@name", deviceName)
                cmd.Parameters.AddWithValue("@ip", terminalIp)
                cmd.Parameters.AddWithValue("@port", terminalPort)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Function GetPendingDiscoveredDevices(enterpriseId As Integer) As List(Of DiscoveredDeviceInfo)
        Dim devices As New List(Of DiscoveredDeviceInfo)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id, agent_id, device_name, terminal_ip, terminal_port, discovered_at " &
                "FROM discovered_devices WHERE enterprise_id = @ent AND status = 'pending' ORDER BY discovered_at DESC", conn)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim d As New DiscoveredDeviceInfo()
                        d.Id = rdr.GetInt32(0)
                        d.AgentId = rdr.GetInt32(1)
                        d.DeviceName = rdr.GetString(2)
                        d.TerminalIP = rdr.GetString(3)
                        d.TerminalPort = rdr.GetInt32(4)
                        d.DiscoveredAt = rdr.GetDateTime(5)
                        devices.Add(d)
                    End While
                End Using
            End Using
        End Using
        Return devices
    End Function

    Public Sub ApproveDiscoveredDevice(deviceId As Integer, enterpriseId As Integer)
        ' Get device info first
        Dim dev As DiscoveredDeviceInfo = Nothing
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT id, agent_id, device_name, terminal_ip, terminal_port FROM discovered_devices WHERE id = @id AND enterprise_id = @ent AND status = 'pending'", conn)
                cmd.Parameters.AddWithValue("@id", deviceId)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr = cmd.ExecuteReader()
                    If rdr.Read() Then
                        dev = New DiscoveredDeviceInfo()
                        dev.Id = rdr.GetInt32(0)
                        dev.AgentId = rdr.GetInt32(1)
                        dev.DeviceName = rdr.GetString(2)
                        dev.TerminalIP = rdr.GetString(3)
                        dev.TerminalPort = rdr.GetInt32(4)
                    End If
                End Using
            End Using
        End Using
        If dev Is Nothing Then Return

        ' Create the door
        CreateDoorIfNotExists(enterpriseId, dev.AgentId, dev.DeviceName, dev.TerminalIP, dev.TerminalPort)

        ' Mark as approved
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE discovered_devices SET status = 'approved', resolved_at = NOW() WHERE id = @id", conn)
                cmd.Parameters.AddWithValue("@id", deviceId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Sub DismissDiscoveredDevice(deviceId As Integer, enterpriseId As Integer)
        Using conn = GetConnection()
            Using cmd = New MySqlCommand("UPDATE discovered_devices SET status = 'dismissed', resolved_at = NOW() WHERE id = @id AND enterprise_id = @ent", conn)
                cmd.Parameters.AddWithValue("@id", deviceId)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Class DiscoveredDeviceInfo
        Public Property Id As Integer
        Public Property AgentId As Integer
        Public Property DeviceName As String
        Public Property TerminalIP As String
        Public Property TerminalPort As Integer
        Public Property DiscoveredAt As DateTime
    End Class

    Public Sub InsertDoorEvent(doorId As Integer, eventType As String, eventData As String, Optional userId As Integer? = Nothing, Optional agentId As Integer? = Nothing, Optional source As String = "command", Optional ingressEventId As Integer? = Nothing)
        Using conn = GetConnection()
            Dim sql = "INSERT INTO door_events (door_id, user_id, agent_id, event_type, event_data, source, ingress_event_id) " &
                      "VALUES (@did, @uid, @aid, @type, @data, @source, @ingId)"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@did", doorId)
                If userId.HasValue Then cmd.Parameters.AddWithValue("@uid", userId.Value) Else cmd.Parameters.AddWithValue("@uid", DBNull.Value)
                If agentId.HasValue Then cmd.Parameters.AddWithValue("@aid", agentId.Value) Else cmd.Parameters.AddWithValue("@aid", DBNull.Value)
                cmd.Parameters.AddWithValue("@type", eventType)
                cmd.Parameters.AddWithValue("@data", If(String.IsNullOrEmpty(eventData), DBNull.Value, CObj(eventData)))
                cmd.Parameters.AddWithValue("@source", source)
                If ingressEventId.HasValue Then cmd.Parameters.AddWithValue("@ingId", ingressEventId.Value) Else cmd.Parameters.AddWithValue("@ingId", DBNull.Value)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    ' ===== Notification Preferences =====
    Public Function GetNotificationPreferences(userId As Integer) As List(Of NotificationPreference)
        Dim prefs As New List(Of NotificationPreference)()
        Using conn = GetConnection()
            Using cmd = New MySqlCommand(
                "SELECT np.door_id, d.name, np.notify_on_open, np.notify_on_close, np.notify_on_forced " &
                "FROM notification_preferences np " &
                "INNER JOIN doors d ON d.id = np.door_id AND d.is_active = 1 " &
                "WHERE np.user_id = @uid ORDER BY d.name", conn)
                cmd.Parameters.AddWithValue("@uid", userId)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim p As New NotificationPreference()
                        p.DoorId = rdr.GetInt32(0)
                        p.DoorName = rdr.GetString(1)
                        p.NotifyOnOpen = rdr.GetBoolean(2)
                        p.NotifyOnClose = rdr.GetBoolean(3)
                        p.NotifyOnForced = rdr.GetBoolean(4)
                        prefs.Add(p)
                    End While
                End Using
            End Using
        End Using
        Return prefs
    End Function

    Public Sub SetNotificationPreference(userId As Integer, doorId As Integer, notifyOnOpen As Boolean, notifyOnClose As Boolean, notifyOnForced As Boolean)
        Using conn = GetConnection()
            Dim sql = "INSERT INTO notification_preferences (user_id, door_id, notify_on_open, notify_on_close, notify_on_forced) " &
                      "VALUES (@uid, @did, @open, @close, @forced) " &
                      "ON DUPLICATE KEY UPDATE notify_on_open = @open, notify_on_close = @close, notify_on_forced = @forced"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@uid", userId)
                cmd.Parameters.AddWithValue("@did", doorId)
                cmd.Parameters.AddWithValue("@open", notifyOnOpen)
                cmd.Parameters.AddWithValue("@close", notifyOnClose)
                cmd.Parameters.AddWithValue("@forced", notifyOnForced)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Class UserProfile
        Public Property Id As Integer
        Public Property Email As String
        Public Property FirstName As String
        Public Property LastName As String
        Public Property IsAdmin As Boolean
    End Class

    Public Class UserPermission
        Public Property DoorId As Integer
        Public Property DoorName As String
        Public Property CanOpen As Boolean
        Public Property CanClose As Boolean
        Public Property CanViewStatus As Boolean
    End Class

    Public Class DoorEventInfo
        Public Property Id As Integer
        Public Property DoorId As Integer
        Public Property DoorName As String
        Public Property EventType As String
        Public Property EventData As String
        Public Property CreatedAt As DateTime
        Public Property Source As String
    End Class

    Public Class NotificationPreference
        Public Property DoorId As Integer
        Public Property DoorName As String
        Public Property NotifyOnOpen As Boolean
        Public Property NotifyOnClose As Boolean
        Public Property NotifyOnForced As Boolean
    End Class

    Public Class DoorInfo
        Public Property Id As Integer
        Public Property Name As String
        Public Property TerminalIP As String
        Public Property TerminalPort As Integer
        Public Property DefaultDelay As Integer
        Public Property AgentId As Integer
    End Class

    Public Class AgentInfo
        Public Property Id As Integer
        Public Property Name As String
    End Class

    Public Class LicenseInfo
        Public Property Status As String
        Public Property EndDate As DateTime?
        Public Property GraceUntil As DateTime?
    End Class

End Class

