Imports MySql.Data.MySqlClient
Imports System.Collections.Generic
Imports System.Diagnostics

Public Class IngressHelper
    Private ReadOnly _connectionString As String
    Private _lastSyncId As Integer = 0
    Private _lastRemoteSyncId As Integer = 0

    Public Sub New(connectionString As String)
        _connectionString = connectionString
    End Sub

    ''' <summary>Update last sync id after successfully sending an event (streaming mode).</summary>
    Public Sub SetLastSyncId(id As Integer)
        _lastSyncId = id
    End Sub

    ''' <summary>Update last remote sync id after successfully sending a remote event.</summary>
    Public Sub SetLastRemoteSyncId(id As Integer)
        _lastRemoteSyncId = id
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
                          "COALESCE(eld.description, CONCAT('Event type ', el.eventType)) AS description, " &
                          "u.username " &
                          "FROM door_eventlog el " &
                          "LEFT JOIN device d ON d.serialno = el.serialno " &
                          "LEFT JOIN door_eventlog_description eld ON eld.eventtype = CAST(el.eventType AS UNSIGNED) " &
                          "LEFT JOIN user u ON u.userid = el.userid " &
                          "WHERE el.id > @lastId " &
                          "ORDER BY el.id ASC"
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
                            If Not rdr.IsDBNull(8) Then ev.UserName = rdr.GetString(8)
                            events.Add(ev)
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

    ''' <summary>
    ''' Get new events from door_eventlog_remote (event types 7, 8, 9).
    ''' Joins door_device and device to resolve serialno for door mapping.
    ''' </summary>
    Public Function GetNewEventsFromRemote() As List(Of IngressEvent)
        Dim events As New List(Of IngressEvent)()
        Try
            Using conn As New MySqlConnection(_connectionString)
                conn.Open()
                Dim sql = "SELECT r.id, r.idDoor, r.eventType, r.eventTime, d.serialno " &
                          "FROM door_eventlog_remote r " &
                          "LEFT JOIN door_device dd ON dd.idDoor = r.idDoor " &
                          "LEFT JOIN device d ON d.iddevice = dd.idDevice " &
                          "WHERE r.id > @lastRemoteId AND r.eventType IN (7, 8, 9) " &
                          "ORDER BY r.id ASC"
                Using cmd As New MySqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@lastRemoteId", _lastRemoteSyncId)
                    Using rdr = cmd.ExecuteReader()
                        While rdr.Read()
                            Dim ev As New IngressEvent()
                            ev.IngressId = rdr.GetInt32(0)
                            If Not rdr.IsDBNull(4) Then ev.SerialNo = rdr.GetString(4)
                            If Not rdr.IsDBNull(2) Then ev.EventType = rdr.GetString(2)
                            If Not rdr.IsDBNull(3) Then ev.EventTime = rdr.GetDateTime(3)
                            ev.Description = GetRemoteEventDescription(ev.EventType)
                            events.Add(ev)
                        End While
                    End Using
                End Using
            End Using
        Catch ex As Exception
            Try
                EventLog.WriteEntry("UDM-Agent", "IngressHelper.GetNewEventsFromRemote error: " & ex.Message, EventLogEntryType.Warning)
            Catch
            End Try
        End Try
        Return events
    End Function

    Private Shared Function GetRemoteEventDescription(eventType As String) As String
        If String.IsNullOrEmpty(eventType) Then Return "Remote event"
        Select Case eventType.Trim()
            Case "7" : Return "Remote Release Alarm"
            Case "8" : Return "Remote Open Door"
            Case "9" : Return "Remote Close Door"
            Case Else : Return "Event type " & eventType
        End Select
    End Function

    ''' <summary>
    ''' Get door devices from Ingress DB.
    ''' Only returns devices linked to a door via door_device table
    ''' (excludes punchers, time clocks, and other non-door terminals).
    ''' </summary>
    Public Function GetDoorDevices() As List(Of IngressDevice)
        Dim devices As New List(Of IngressDevice)()
        Try
            Using conn As New MySqlConnection(_connectionString)
                conn.Open()
                Dim sql = "SELECT d.DeviceName, d.ipaddress, d.Port, dr.name AS door_name, d.serialno " &
                          "FROM door_device dd " &
                          "INNER JOIN device d ON d.iddevice = dd.idDevice " &
                          "LEFT JOIN door dr ON dr.iddoor = dd.idDoor " &
                          "WHERE d.ipaddress IS NOT NULL AND d.ipaddress <> ''"
                Using cmd As New MySqlCommand(sql, conn)
                    Using rdr = cmd.ExecuteReader()
                        While rdr.Read()
                            Dim dev As New IngressDevice()
                            If Not rdr.IsDBNull(0) Then dev.DeviceName = rdr.GetString(0)
                            If Not rdr.IsDBNull(1) Then dev.IPAddress = rdr.GetString(1)
                            If Not rdr.IsDBNull(2) Then dev.Port = rdr.GetInt32(2)
                            If Not rdr.IsDBNull(3) Then dev.DoorName = rdr.GetString(3)
                            If Not rdr.IsDBNull(4) Then dev.SerialNo = rdr.GetString(4)
                            If Not String.IsNullOrEmpty(dev.IPAddress) Then
                                devices.Add(dev)
                            End If
                        End While
                    End Using
                End Using
            End Using
        Catch ex As Exception
            Try
                EventLog.WriteEntry("UDM-Agent", "IngressHelper.GetDoorDevices error: " & ex.Message, EventLogEntryType.Warning)
            Catch
            End Try
        End Try
        Return devices
    End Function

    Public Class IngressDevice
        Public Property DeviceName As String
        Public Property DoorName As String
        Public Property IPAddress As String
        Public Property Port As Integer = 4370
        Public Property SerialNo As String
    End Class

    Public Class IngressEvent
        Public Property IngressId As Integer
        Public Property SerialNo As String
        Public Property EventType As String
        Public Property EventTime As DateTime
        Public Property UserId As String
        Public Property UserName As String
        Public Property DeviceIP As String
        Public Property DevicePort As Integer
        Public Property Description As String
    End Class
End Class
