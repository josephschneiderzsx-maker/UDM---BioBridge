Imports MySql.Data.MySqlClient
Imports System.Text
Imports System.Collections.Generic

Public Class CommandQueueManager
    Private ReadOnly _db As DatabaseHelper

    Public Sub New(db As DatabaseHelper)
        _db = db
    End Sub

    Public Function EnqueueCommand(agentId As Integer, doorId As Integer, userId As Integer?, commandType As String, parameters As String) As Integer
        Using conn = _db.GetConnection()
            Dim sql = "INSERT INTO command_queue (agent_id, door_id, user_id, command_type, parameters, status, created_at) " &
                      "VALUES (@aid, @did, @uid, @type, @params, 'pending', NOW())"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@aid", agentId)
                cmd.Parameters.AddWithValue("@did", doorId)
                If userId.HasValue Then
                    cmd.Parameters.AddWithValue("@uid", userId.Value)
                Else
                    cmd.Parameters.AddWithValue("@uid", DBNull.Value)
                End If
                cmd.Parameters.AddWithValue("@type", commandType)
                cmd.Parameters.AddWithValue("@params", parameters)
                cmd.ExecuteNonQuery()
                Return CInt(cmd.LastInsertedId)
            End Using
        End Using
    End Function

    Public Function GetPendingCommands(agentId As Integer, maxCount As Integer) As List(Of CommandInfo)
        Dim commands As New List(Of CommandInfo)()
        Using conn = _db.GetConnection()
            Dim sql = "SELECT id, door_id, user_id, command_type, parameters " &
                      "FROM command_queue " &
                      "WHERE agent_id = @aid AND status = 'pending' " &
                      "ORDER BY created_at ASC " &
                      "LIMIT @limit"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@aid", agentId)
                cmd.Parameters.AddWithValue("@limit", maxCount)
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        Dim cmdInfo As New CommandInfo()
                        cmdInfo.Id = rdr.GetInt32(0)
                        cmdInfo.DoorId = rdr.GetInt32(1)
                        If Not rdr.IsDBNull(2) Then
                            cmdInfo.UserId = rdr.GetInt32(2)
                        End If
                        cmdInfo.CommandType = rdr.GetString(3)
                        If Not rdr.IsDBNull(4) Then
                            cmdInfo.Parameters = rdr.GetString(4)
                        End If
                        commands.Add(cmdInfo)
                    End While
                End Using
            End Using
            
            ' Marquer comme "processing"
            For Each cmdInfo As CommandInfo In commands
                MarkAsProcessing(cmdInfo.Id)
            Next
        End Using
        Return commands
    End Function

    Private Sub MarkAsProcessing(commandId As Integer)
        Using conn = _db.GetConnection()
            Dim sql = "UPDATE command_queue SET status = 'processing', processed_at = NOW() WHERE id = @id"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@id", commandId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Sub MarkAsCompleted(commandId As Integer, result As String)
        Using conn = _db.GetConnection()
            Dim sql = "UPDATE command_queue SET status = 'completed', result = @result, completed_at = NOW() WHERE id = @id"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@id", commandId)
                cmd.Parameters.AddWithValue("@result", result)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Sub MarkAsFailed(commandId As Integer, errorMessage As String)
        Using conn = _db.GetConnection()
            Dim sql = "UPDATE command_queue SET status = 'failed', error_message = @err, completed_at = NOW() WHERE id = @id"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@id", commandId)
                cmd.Parameters.AddWithValue("@err", errorMessage)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Public Class CommandInfo
        Public Property Id As Integer
        Public Property DoorId As Integer
        Public Property UserId As Integer?
        Public Property CommandType As String
        Public Property Parameters As String
    End Class
End Class
