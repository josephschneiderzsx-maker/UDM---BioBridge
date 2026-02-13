Imports System.Configuration

Public Class ConfigManager
    Private ReadOnly _serverUrl As String
    Private ReadOnly _agentKey As String
    Private ReadOnly _enterpriseId As Integer
    Private ReadOnly _pollingInterval As Integer
    Private ReadOnly _heartbeatInterval As Integer
    Private ReadOnly _commandTimeout As Integer

    ' Ingress settings
    Private ReadOnly _ingressEnabled As Boolean
    Private ReadOnly _ingressMysqlHost As String
    Private ReadOnly _ingressMysqlDatabase As String
    Private ReadOnly _ingressMysqlUser As String
    Private ReadOnly _ingressMysqlPassword As String
    Private ReadOnly _ingressSyncInterval As Integer

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

        ' Ingress config
        Dim ingressEnabledStr = ConfigurationManager.AppSettings("IngressEnabled")
        _ingressEnabled = (ingressEnabledStr IsNot Nothing AndAlso ingressEnabledStr.ToLower() = "true")

        _ingressMysqlHost = ConfigurationManager.AppSettings("IngressMysqlHost")
        If String.IsNullOrEmpty(_ingressMysqlHost) Then _ingressMysqlHost = "localhost"

        _ingressMysqlDatabase = ConfigurationManager.AppSettings("IngressMysqlDatabase")
        If String.IsNullOrEmpty(_ingressMysqlDatabase) Then _ingressMysqlDatabase = "ingress"

        _ingressMysqlUser = ConfigurationManager.AppSettings("IngressMysqlUser")
        If String.IsNullOrEmpty(_ingressMysqlUser) Then _ingressMysqlUser = "root"

        _ingressMysqlPassword = ConfigurationManager.AppSettings("IngressMysqlPassword")
        If String.IsNullOrEmpty(_ingressMysqlPassword) Then _ingressMysqlPassword = ""

        Dim syncStr = ConfigurationManager.AppSettings("IngressSyncInterval")
        If Not Integer.TryParse(syncStr, _ingressSyncInterval) OrElse _ingressSyncInterval <= 0 Then
            _ingressSyncInterval = 30000 ' 30 seconds default
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

    Public ReadOnly Property IngressEnabled As Boolean
        Get
            Return _ingressEnabled
        End Get
    End Property

    Public ReadOnly Property IngressConnectionString As String
        Get
            Return $"Server={_ingressMysqlHost};Database={_ingressMysqlDatabase};Uid={_ingressMysqlUser};Pwd={_ingressMysqlPassword};SslMode=Preferred;Convert Zero Datetime=True;"
        End Get
    End Property

    Public Function GetIngressSyncInterval() As Integer
        Return _ingressSyncInterval
    End Function
End Class
