Imports System.Configuration

Public Class ConfigManager
    Private ReadOnly _serverUrl As String
    Private ReadOnly _agentKey As String
    Private ReadOnly _enterpriseId As Integer
    Private ReadOnly _pollingInterval As Integer
    Private ReadOnly _heartbeatInterval As Integer
    Private ReadOnly _commandTimeout As Integer

    Public Sub New()
        _serverUrl = ConfigurationManager.AppSettings("ServerUrl")
        If String.IsNullOrEmpty(_serverUrl) Then
            _serverUrl = "http://localhost:8080"
        End If

        _agentKey = ConfigurationManager.AppSettings("AgentKey")
        If String.IsNullOrEmpty(_agentKey) Then
            Throw New Exception("AgentKey is required in app.config")
        End If

        Dim entStr = ConfigurationManager.AppSettings("EnterpriseId")
        If Not Integer.TryParse(entStr, _enterpriseId) Then
            _enterpriseId = 1
        End If

        Dim pollStr = ConfigurationManager.AppSettings("PollingInterval")
        If Not Integer.TryParse(pollStr, _pollingInterval) OrElse _pollingInterval <= 0 Then
            _pollingInterval = 500 ' Réduit de 3000ms à 500ms par défaut pour meilleure performance
        End If

        Dim hbStr = ConfigurationManager.AppSettings("HeartbeatInterval")
        If Not Integer.TryParse(hbStr, _heartbeatInterval) OrElse _heartbeatInterval <= 0 Then
            _heartbeatInterval = 30000
        End If

        Dim timeoutStr = ConfigurationManager.AppSettings("CommandTimeout")
        If Not Integer.TryParse(timeoutStr, _commandTimeout) OrElse _commandTimeout <= 0 Then
            _commandTimeout = 2 ' Réduit de 5s à 2s pour réduire la latence long polling
        End If
    End Sub

    Public ReadOnly Property ServerUrl As String
        Get
            Return _serverUrl
        End Get
    End Property

    Public ReadOnly Property AgentKey As String
        Get
            Return _agentKey
        End Get
    End Property

    Public ReadOnly Property EnterpriseId As Integer
        Get
            Return _enterpriseId
        End Get
    End Property

    Public Function GetPollingInterval() As Integer
        Return _pollingInterval
    End Function

    Public Function GetHeartbeatInterval() As Integer
        Return _heartbeatInterval
    End Function

    Public Function GetCommandTimeout() As Integer
        Return _commandTimeout
    End Function
End Class
