Imports System.ServiceProcess
Imports System.Threading
Imports System.Configuration

Public Class AgentService
    Inherits System.ServiceProcess.ServiceBase

#Region " Component Designer generated code "

    Public Sub New()
        MyBase.New()
        InitializeComponent()
    End Sub

    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    <STAThread()> _
    Shared Sub Main()
        Dim ServicesToRun() As System.ServiceProcess.ServiceBase
        ServicesToRun = New System.ServiceProcess.ServiceBase() {New AgentService}
        System.ServiceProcess.ServiceBase.Run(ServicesToRun)
    End Sub

    Private components As System.ComponentModel.IContainer

    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Me.ServiceName = "UDM-Agent"
    End Sub

#End Region

    Private isRunning As Boolean = False
    Private pollingThread As Thread
    Private heartbeatThread As Thread
    Private serverClient As ServerClient
    Private bioBridgeController As BioBridgeController
    Private agentId As Integer = 0
    Private configManager As ConfigManager

    Protected Overrides Sub OnStart(ByVal args() As String)
        Try
            isRunning = True
            configManager = New ConfigManager()
            serverClient = New ServerClient(configManager)
            bioBridgeController = New BioBridgeController()
            bioBridgeController.SetServerInfo(serverClient, 0) ' Sera mis à jour après l'enregistrement

            ' Enregistrer l'agent
            Try
                Dim registered As System.Nullable(Of Integer) = serverClient.RegisterAgent()
                If Not registered.HasValue Then
                    CreateLog("ERROR: Failed to register agent. Check server URL and agent_key in config.")
                    CreateLog("Config - ServerUrl: " & configManager.ServerUrl & ", AgentKey: " & configManager.AgentKey & ", EnterpriseId: " & configManager.EnterpriseId)
                    Return
                End If
                agentId = registered.Value
                CreateLog("Agent registered with ID: " & agentId)
                ' Mettre à jour les infos serveur dans le contrôleur
                bioBridgeController.SetServerInfo(serverClient, agentId)
            Catch ex As Exception
                CreateLog("ERROR: Exception during agent registration: " & ex.ToString())
                Return
            End Try

            ' Charger les infos des portes depuis le serveur
            LoadDoorInfo()
            CreateLog("Door info loaded. Total doors: " & bioBridgeController.GetDoorCount())

            ' Démarrer le polling des commandes
            pollingThread = New Thread(AddressOf PollCommandsLoop)
            pollingThread.IsBackground = True
            pollingThread.Start()

            ' Démarrer le heartbeat
            heartbeatThread = New Thread(AddressOf HeartbeatLoop)
            heartbeatThread.IsBackground = True
            heartbeatThread.Start()

            CreateLog("UDM-Agent service started successfully")
        Catch ex As Exception
            CreateLog("Error in OnStart: " & ex.ToString())
        End Try
    End Sub

    Protected Overrides Sub OnStop()
        Try
            isRunning = False

            If pollingThread IsNot Nothing AndAlso pollingThread.IsAlive Then
                pollingThread.Join(2000)
            End If

            If heartbeatThread IsNot Nothing AndAlso heartbeatThread.IsAlive Then
                heartbeatThread.Join(2000)
            End If

            If bioBridgeController IsNot Nothing Then
                bioBridgeController.Dispose()
            End If

            CreateLog("UDM-Agent service stopped")
        Catch ex As Exception
            CreateLog("Error in OnStop: " & ex.ToString())
        End Try
    End Sub

    Private Sub PollCommandsLoop()
        Dim pollingInterval = configManager.GetPollingInterval()
        While isRunning
            Try
                Dim hadCommands As Boolean = False
                If agentId > 0 Then
                    Dim commands = serverClient.GetCommands(agentId)
                    If commands IsNot Nothing AndAlso commands.Count > 0 Then
                        hadCommands = True
                        For Each cmd As ServerClient.CommandInfo In commands
                            ProcessCommand(cmd)
                        Next
                    End If
                End If
                ' Si des commandes ont été traitées, re-poll immédiatement
                ' pour vérifier s'il y en a d'autres en attente
                If Not hadCommands Then
                    Thread.Sleep(pollingInterval)
                End If
            Catch ex As Exception
                CreateLog("Error in PollCommandsLoop: " & ex.Message)
                Thread.Sleep(2000) ' Réduit de 5s à 2s en cas d'erreur
            End Try
        End While
    End Sub

    Private Sub HeartbeatLoop()
        Dim heartbeatInterval = configManager.GetHeartbeatInterval()
        While isRunning
            Try
                If agentId > 0 Then
                    serverClient.SendHeartbeat(agentId)
                End If
                Thread.Sleep(heartbeatInterval)
            Catch ex As Exception
                CreateLog("Error in HeartbeatLoop: " & ex.Message)
                Thread.Sleep(30000) ' Retry dans 30s en cas d'erreur
            End Try
        End While
    End Sub

    Private Sub ProcessCommand(cmd As ServerClient.CommandInfo)
        Try
            CreateLog("Processing command: " & cmd.CommandType & " for door " & cmd.DoorId)
            Dim result As String = ""
            Dim success As Boolean = False

            Select Case cmd.CommandType.ToLower()
                Case "open"
                    Dim delay = ExtractDelayFromParams(cmd.Parameters)
                    CreateLog("Attempting to open door " & cmd.DoorId & " with delay " & delay)
                    success = bioBridgeController.OpenDoor(cmd.DoorId, delay)
                    CreateLog("OpenDoor returned: " & If(success, "True", "False"))
                    result = "{""status"":""" & If(success, "open", "failed") & """,""delay"":" & delay & "}"
                Case "close"
                    success = bioBridgeController.CloseDoor(cmd.DoorId)
                    result = "{""status"":""" & If(success, "closed", "failed") & """}"
                Case "status"
                    Dim status = bioBridgeController.GetDoorStatus(cmd.DoorId)
                    success = True
                    result = "{""status"":""" & status & """}"
                Case Else
                    result = "{""error"":""Unknown command type: " & cmd.CommandType & """}"
            End Select

            serverClient.SendResult(agentId, cmd.Id, success, result, If(success, Nothing, "Unknown error"))
        Catch ex As Exception
            CreateLog("Error processing command " & cmd.Id & ": " & ex.ToString())
            serverClient.SendResult(agentId, cmd.Id, False, "{}", ex.Message)
        End Try
    End Sub

    Private Sub LoadDoorInfo()
        Try
            Dim doors = serverClient.GetDoorInfo(agentId)
            CreateLog("LoadDoorInfo - Found " & doors.Count & " doors")
            For Each door As ServerClient.DoorInfo In doors
                CreateLog("LoadDoorInfo - Registering door " & door.Id & " at " & door.TerminalIP & ":" & door.TerminalPort)
                bioBridgeController.RegisterDoor(door.Id, door.TerminalIP, door.TerminalPort)
            Next
        Catch ex As Exception
            CreateLog("Warning: Could not load door info: " & ex.Message)
        End Try
    End Sub

    Private Function ExtractDelayFromParams(paramsJson As String) As Integer
        If String.IsNullOrEmpty(paramsJson) Then Return 3000
        Try
            Dim delayStart = paramsJson.IndexOf("""delay"":") + 9
            If delayStart < 9 Then Return 3000
            Dim delayEnd = paramsJson.IndexOf("}", delayStart)
            If delayEnd = -1 Then delayEnd = paramsJson.Length
            Dim delayStr = paramsJson.Substring(delayStart, delayEnd - delayStart).Trim().TrimEnd(","c)
            Dim delay As Integer
            If Integer.TryParse(delayStr, delay) Then
                Return delay
            End If
        Catch
        End Try
        Return 3000
    End Function

    Protected Sub CreateLog(ByVal sMsg As String)
        Dim sSource As String = "UDM-Agent"
        Dim sLog As String = "Application"
        Dim sMachine As String = "."
        Dim eSource As EventSourceCreationData = New EventSourceCreationData(sSource, sLog)

        If Not EventLog.SourceExists(sSource, sMachine) Then
            EventLog.CreateEventSource(eSource)
        End If

        Dim ELog As New EventLog(sLog, sMachine, sSource)
        ELog.WriteEntry(sMsg)
    End Sub

End Class
