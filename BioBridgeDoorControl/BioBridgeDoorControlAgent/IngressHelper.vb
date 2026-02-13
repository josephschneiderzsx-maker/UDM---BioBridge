Imports MySql.Data.MySqlClient
Imports System.Collections.Generic
Imports System.Diagnostics

Public Class IngressHelper
    Private ReadOnly _connectionString As String
    Private _lastSyncId As Integer = 0

    Public Sub New(connectionString As String)
        _connectionString = connectionString
    End Sub

    ''' <summary>
    ''' Get new events from ingress DB since last sync.
    ''' Joins door_eventlog with device (via serialno) to get IP address,
    ''' and door_eventlog_description for human-readable description.
    ''' </summary>
    Public Function GetNewEvents() As List(Of IngressEvent)
        Dim events As New List(Of IngressEvent)()
        Try
            Using conn As New MySqlConnection(_connectionString)
                conn.Open()
                Dim sql = "SELECT el.id, el.serialno, el.eventType, el.eventtime, el.userid, " &
                          "d.ipaddress, d.Port, " &
                          "COALESCE(eld.description, CONCAT('Event type ', el.eventType)) AS description " &
                          "FROM door_eventlog el " &
                          "LEFT JOIN device d ON d.serialno = el.serialno " &
                          "LEFT JOIN door_eventlog_description eld ON eld.eventtype = CAST(el.eventType AS UNSIGNED) " &
                          "WHERE el.id > @lastId " &
                          "ORDER BY el.id ASC " &
                          "LIMIT 100"
                Using cmd As New MySqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@lastId", _lastSyncId)
                    Using rdr = cmd.ExecuteReader()
                        While rdr.Read()
                            Dim ev As New IngressEvent()
                            ev.IngressId = rdr.GetInt32(0)
                            If Not rdr.IsDBNull(1) Then ev.SerialNo = rdr.GetString(1)
                            If Not rdr.IsDBNull(2) Then ev.EventType = rdr.GetString(2)
                            If Not rdr.IsDBNull(3) Then ev.EventTime = rdr.GetDateTime(3)
                            If Not rdr.IsDBNull(4) Then ev.UserId = rdr.GetString(4)
                            If Not rdr.IsDBNull(5) Then ev.DeviceIP = rdr.GetString(5)
                            If Not rdr.IsDBNull(6) Then ev.DevicePort = rdr.GetInt32(6)
                            If Not rdr.IsDBNull(7) Then ev.Description = rdr.GetString(7)
                            events.Add(ev)

                            ' Track highest ID for next sync
                            If ev.IngressId > _lastSyncId Then
                                _lastSyncId = ev.IngressId
                            End If
                        End While
                    End Using
                End Using
            End Using
        Catch ex As Exception
            ' Log but don't throw - ingress is optional
            Try
                EventLog.WriteEntry("UDM-Agent", "IngressHelper.GetNewEvents error: " & ex.Message, EventLogEntryType.Warning)
            Catch
            End Try
        End Try
        Return events
    End Function

    Public Class IngressEvent
        Public Property IngressId As Integer
        Public Property SerialNo As String
        Public Property EventType As String
        Public Property EventTime As DateTime
        Public Property UserId As String
        Public Property DeviceIP As String
        Public Property DevicePort As Integer
        Public Property Description As String
    End Class
End Class
