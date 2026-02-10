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

    Public Class DoorInfo
        Public Property Id As Integer
        Public Property Name As String
        Public Property TerminalIP As String
        Public Property TerminalPort As Integer
        Public Property DefaultDelay As Integer
        Public Property AgentId As Integer
    End Class

End Class

