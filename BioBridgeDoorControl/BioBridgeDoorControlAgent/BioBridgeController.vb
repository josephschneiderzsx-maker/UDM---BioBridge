Imports BioBridgeSDKDLL
Imports System.Collections.Generic
Imports System.Threading

Public Class BioBridgeController
    Private axBioBridgeSDK1 As BioBridgeSDKDLL.BioBridgeSDKClass
    Private doorConnections As New Dictionary(Of Integer, DoorConnection)()
    Private connectionLock As New Object()
    Private Const DEFAULT_TERMINAL_PORT As Integer = 4370
    Private _serverClient As ServerClient
    Private _agentId As Integer
    ' Cache de connexion persistante : éviter de se reconnecter au même terminal
    Private _connectedTerminalIP As String = Nothing
    Private _connectedTerminalPort As Integer = 0
    Private _isConnected As Boolean = False

    Private Class DoorConnection
        Public Property DoorId As Integer
        Public Property TerminalIP As String
        Public Property TerminalPort As Integer
        Public Property Status As String
        Public Property LastEvent As DateTime
    End Class

    Public Sub New()
        Try
            axBioBridgeSDK1 = New BioBridgeSDKDLL.BioBridgeSDKClass()
            AddHandler axBioBridgeSDK1.OnDoor, AddressOf OnDoorEvent
            AddHandler axBioBridgeSDK1.OnConnected, AddressOf OnConnectedEvent
            AddHandler axBioBridgeSDK1.OnDisConnected, AddressOf OnDisConnectedEvent
        Catch ex As Exception
            ' SDK non disponible, continuer quand même
        End Try
    End Sub

    Public Sub SetServerInfo(serverClient As ServerClient, agentId As Integer)
        _serverClient = serverClient
        _agentId = agentId
    End Sub

    Public Function OpenDoor(doorId As Integer, delay As Integer) As Boolean
        If axBioBridgeSDK1 Is Nothing Then Return False

        Dim doorInfo = GetDoorInfo(doorId)
        If doorInfo Is Nothing Then 
            ' Porte non trouvée dans doorConnections, essayer de la charger depuis le serveur
            If _serverClient IsNot Nothing AndAlso _agentId > 0 Then
                Try
                    Dim doors = _serverClient.GetDoorInfo(_agentId)
                    For Each door As ServerClient.DoorInfo In doors
                        If door.Id = doorId Then
                            RegisterDoor(door.Id, door.TerminalIP, door.TerminalPort)
                            doorInfo = GetDoorInfo(doorId)
                            Exit For
                        End If
                    Next
                Catch
                End Try
            End If
            
            If doorInfo Is Nothing Then
                ' Toujours pas trouvé, retourner False
                Return False
            End If
        End If

        SyncLock connectionLock
            Try
                Dim needReconnect As Boolean = False

                ' Vérifier si on est déjà connecté au bon terminal
                If _isConnected AndAlso _connectedTerminalIP = doorInfo.TerminalIP AndAlso _connectedTerminalPort = doorInfo.TerminalPort Then
                    ' Connexion persistante réutilisée - pas besoin de se reconnecter
                    needReconnect = False
                Else
                    ' Déconnecter si on est connecté à un autre terminal
                    If _isConnected Then
                        axBioBridgeSDK1.Disconnect()
                        Thread.Sleep(200) ' Réduit de 500ms à 200ms
                        _isConnected = False
                    End If
                    needReconnect = True
                End If

                If needReconnect Then
                    ' Nouvelle connexion nécessaire
                    Dim connectResult = axBioBridgeSDK1.Connect_TCPIP("", 1, doorInfo.TerminalIP, doorInfo.TerminalPort, 0)
                    If connectResult <> 0 Then
                        _isConnected = False
                        _connectedTerminalIP = Nothing
                        Return False
                    End If
                    _isConnected = True
                    _connectedTerminalIP = doorInfo.TerminalIP
                    _connectedTerminalPort = doorInfo.TerminalPort
                End If

                ' Ouvrir la porte
                Dim result = axBioBridgeSDK1.UnlockDoor(delay)
                If result = 0 Then
                    If doorConnections.ContainsKey(doorId) Then
                        doorConnections(doorId).Status = "Open"
                        doorConnections(doorId).LastEvent = DateTime.Now
                    End If
                    Return True
                End If
            Catch ex As Exception
                ' Connexion probablement perdue, réinitialiser l'état
                _isConnected = False
                _connectedTerminalIP = Nothing
                Return False
            End Try
        End SyncLock
        Return False
    End Function

    Public Function CloseDoor(doorId As Integer) As Boolean
        ' La fermeture est automatique après le délai, on retourne juste OK
        Return True
    End Function

    Public Function GetDoorStatus(doorId As Integer) As String
        SyncLock connectionLock
            If doorConnections.ContainsKey(doorId) Then
                Return doorConnections(doorId).Status
            End If
        End SyncLock
        Return "Unknown"
    End Function

    Private Function GetDoorInfo(doorId As Integer) As DoorConnection
        SyncLock connectionLock
            If doorConnections.ContainsKey(doorId) Then
                Return doorConnections(doorId)
            End If
        End SyncLock
        Return Nothing
    End Function

    Public Sub RegisterDoor(doorId As Integer, terminalIP As String, terminalPort As Integer)
        SyncLock connectionLock
            If Not doorConnections.ContainsKey(doorId) Then
                Dim door As New DoorConnection()
                door.DoorId = doorId
                door.TerminalIP = terminalIP
                door.TerminalPort = terminalPort
                door.Status = "Unknown"
                doorConnections(doorId) = door
            Else
                doorConnections(doorId).TerminalIP = terminalIP
                doorConnections(doorId).TerminalPort = terminalPort
            End If
        End SyncLock
    End Sub

    Public Function GetDoorCount() As Integer
        SyncLock connectionLock
            Return doorConnections.Count
        End SyncLock
    End Function

    Private Sub OnDoorEvent(eventType As Integer)
        ' Gérer les événements de porte
    End Sub

    Private Sub OnConnectedEvent()
    End Sub

    Private Sub OnDisConnectedEvent()
    End Sub

    Public Sub Dispose()
        If axBioBridgeSDK1 IsNot Nothing Then
            Try
                axBioBridgeSDK1.Disconnect()
                _isConnected = False
                _connectedTerminalIP = Nothing
            Catch
            End Try
        End If
    End Sub
End Class
