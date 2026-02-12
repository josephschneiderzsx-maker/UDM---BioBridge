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

End Class

