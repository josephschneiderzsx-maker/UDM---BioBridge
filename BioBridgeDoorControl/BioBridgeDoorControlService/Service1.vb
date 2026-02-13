Imports System.ServiceProcess
Imports System.Net
Imports System.Threading
Imports System.Text
Imports System.IO
Imports System.Collections.Generic
Imports System.Security.Claims
Imports BioBridgeSDKDLL

Public Class Service1
    Inherits System.ServiceProcess.ServiceBase

#Region " Component Designer generated code "

    Public Sub New()
        MyBase.New()

        ' This call is required by the Component Designer.
        InitializeComponent()

        ' Add any initialization after the InitializeComponent() call

    End Sub

    'UserService overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    ' The main entry point for the process
    <STAThread()> _
    Shared Sub Main()
        Dim ServicesToRun() As System.ServiceProcess.ServiceBase

        ' More than one NT Service may run within the same process. To add
        ' another service to this process, change the following line to
        ' create a second service object. For example,
        '
        '   ServicesToRun = New System.ServiceProcess.ServiceBase () {New Service1, New MySecondUserService}
        '
        ServicesToRun = New System.ServiceProcess.ServiceBase() {New Service1}

        System.ServiceProcess.ServiceBase.Run(ServicesToRun)

    End Sub

    'Required by the Component Designer
    Private components As System.ComponentModel.IContainer

    ' NOTE: The following procedure is required by the Component Designer
    ' It can be modified using the Component Designer.
    ' Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        '
        'Service1
        '
        Me.ServiceName = "UDM"

    End Sub

#End Region

    ' Variables de classe pour le serveur HTTP et SDK
    Private httpListener As HttpListener
    Private httpThread As Thread
    ' Utiliser BioBridgeSDKDLLv3.dll (assembly .NET) avec Interop.zkemkeeper.dll
    Private axBioBridgeSDK1 As BioBridgeSDKDLL.BioBridgeSDKClass
    Private isRunning As Boolean = False
    Private Const HTTP_PORT As Integer = 8080
    Private Const DEFAULT_TERMINAL_IP As String = "192.168.40.10"
    Private Const DEFAULT_TERMINAL_PORT As Integer = 4370
    Private Const LICENSE_EXPIRED_JSON As String = "{""error"":""license_expired"",""message"":""Your license has expired. You will not be able to use the service within 3 days. Please contact URZIS for renewal or suspension: sales@urzis.com. If you think this is a mistake, we are sorry; contact us for arrangement.""}"

    ' Accès base et auth
    Private ReadOnly db As New DatabaseHelper()
    Private ReadOnly auth As New AuthHelper()
    Private ReadOnly commandQueue As New CommandQueueManager(db)

    ' État de la porte et connexion
    Private currentConnectedIP As String = ""
    Private doorStatus As String = "Unknown"
    Private lastDoorEvent As DateTime = DateTime.MinValue
    Private doorEventsHistory As New List(Of DoorEvent)
    Private doorStatusLock As New Object()

    ' Structure pour stocker les événements de porte
    Private Structure DoorEvent
        Dim EventType As Integer
        Dim EventTime As DateTime
        Dim Description As String
    End Structure

    Protected Overrides Sub OnStart(ByVal args() As String)
        Try
            ' Démarrer le serveur HTTP en premier (peut fonctionner même sans BioBridge)
            isRunning = True
            httpListener = New HttpListener()
            ' Ecouter sur toutes les interfaces (localhost + IP reseau)
            httpListener.Prefixes.Add("http://+:" & HTTP_PORT & "/")
            httpListener.Start()

            httpThread = New Thread(AddressOf StartHttpServer)
            httpThread.IsBackground = True
            httpThread.Start()

            CreateLog("HTTP Server started on port " & HTTP_PORT)
            CreateLog("Service ready - Endpoints: /open, /close, /status")

            ' Essayer d'initialiser la connexion BioBridge
            Try
                axBioBridgeSDK1 = New BioBridgeSDKDLL.BioBridgeSDKClass()
                CreateLog("BioBridge SDK instance created successfully")

                ' Connecter l'événement OnDoor
                Try
                    AddHandler axBioBridgeSDK1.OnDoor, AddressOf OnDoorEvent
                    AddHandler axBioBridgeSDK1.OnConnected, AddressOf OnConnectedEvent
                    AddHandler axBioBridgeSDK1.OnDisConnected, AddressOf OnDisConnectedEvent
                    CreateLog("Event handlers attached (OnDoor, OnConnected, OnDisConnected)")
                Catch ex As Exception
                    CreateLog("Warning: Could not attach event handlers. Error: " & ex.Message)
                End Try

                ' Tenter la connexion au terminal
                CreateLog("Connecting to terminal at " & DEFAULT_TERMINAL_IP & ":" & DEFAULT_TERMINAL_PORT & "...")
                If axBioBridgeSDK1.Connect_TCPIP("", 1, DEFAULT_TERMINAL_IP, DEFAULT_TERMINAL_PORT, 0) = 0 Then
                    currentConnectedIP = DEFAULT_TERMINAL_IP
                    Dim sFw As String = ""
                    If axBioBridgeSDK1.GetFirmwareVersion(sFw) = 0 Then
                        CreateLog("BioBridge Connected. Firmware: " & sFw)
                        doorStatus = "Connected"
                    End If
                Else
                    CreateLog("Failed to connect to BioBridge terminal at " & DEFAULT_TERMINAL_IP)
                    doorStatus = "Disconnected"
                End If
            Catch comEx As System.Runtime.InteropServices.COMException
                CreateLog("WARNING: BioBridge SDK COM error. Error: " & comEx.Message)
                CreateLog("The HTTP server is running, but BioBridge functions will not work.")
                doorStatus = "SDK Not Registered"
            Catch ex As Exception
                CreateLog("Warning: Could not initialize BioBridge SDK. Error: " & ex.GetType().Name & ": " & ex.Message)
                If ex.InnerException IsNot Nothing Then
                    CreateLog("Inner exception: " & ex.InnerException.Message)
                End If
                CreateLog("The HTTP server is running, but BioBridge functions may not work.")
                doorStatus = "Initialization Failed"
            End Try

        Catch ex As Exception
            CreateLog("Error in OnStart: " & ex.ToString())
            ' Même en cas d'erreur, essayer de démarrer le serveur HTTP
            Try
                If httpListener Is Nothing Then
                    isRunning = True
                    httpListener = New HttpListener()
                    httpListener.Prefixes.Add("http://localhost:" & HTTP_PORT & "/")
                    httpListener.Start()
                    httpThread = New Thread(AddressOf StartHttpServer)
                    httpThread.IsBackground = True
                    httpThread.Start()
                    CreateLog("HTTP Server started despite initialization errors")
                End If
            Catch httpEx As Exception
                CreateLog("CRITICAL: Could not start HTTP server. Error: " & httpEx.Message)
            End Try
        End Try
    End Sub

    Protected Overrides Sub OnStop()
        Try
            isRunning = False

            ' Arrêter le serveur HTTP
            If httpListener IsNot Nothing Then
                httpListener.Stop()
                httpListener.Close()
            End If

            If httpThread IsNot Nothing AndAlso httpThread.IsAlive Then
                httpThread.Join(2000) ' Attendre max 2 secondes
            End If

            ' Déconnecter le SDK
            If axBioBridgeSDK1 IsNot Nothing Then
                Try
                    axBioBridgeSDK1.Disconnect()
                Catch ex As Exception
                    CreateLog("Warning during SDK disconnect: " & ex.Message)
                End Try
                axBioBridgeSDK1 = Nothing
            End If

            CreateLog("Service stopped")

        Catch ex As Exception
            CreateLog("Error in OnStop: " & ex.ToString())
        End Try
    End Sub

    Private Sub StartHttpServer()
        While isRunning
            Try
                Dim context As HttpListenerContext = httpListener.GetContext()
                ThreadPool.QueueUserWorkItem(AddressOf HandleRequest, context)
            Catch ex As HttpListenerException
                ' Normal quand on arrête le listener
                If isRunning Then
                    CreateLog("HTTP Listener error: " & ex.Message)
                End If
            Catch ex As Exception
                If isRunning Then
                    CreateLog("HTTP Server error: " & ex.ToString())
                End If
            End Try
        End While
    End Sub

    Private Sub AddCorsHeaders(response As HttpListenerResponse)
        response.Headers.Add("Access-Control-Allow-Origin", "*")
        response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    End Sub

    Private Sub HandleRequest(state As Object)
        Dim context As HttpListenerContext = CType(state, HttpListenerContext)
        Dim request As HttpListenerRequest = context.Request
        Dim response As HttpListenerResponse = context.Response

        Try
            AddCorsHeaders(response)
            Dim path As String = request.Url.AbsolutePath.TrimEnd("/"c).ToLower()

            ' Repondre au preflight CORS
            If request.HttpMethod = "OPTIONS" Then
                response.StatusCode = 204
                Return
            End If

            Dim segments = path.Split(New Char() {"/"c}, StringSplitOptions.RemoveEmptyEntries)

            If segments.Length = 0 Then
                ' compatibilité ancienne API /status
                If request.HttpMethod = "GET" AndAlso path = "/status" Then
                    HandleStatusRequest(context)
                ElseIf request.HttpMethod = "POST" AndAlso (path = "/open" OrElse path = "/close") Then
                    ' Anciennes routes; à terme seront remplacées par les routes multi-tenant
                    If path = "/open" Then
                        HandleOpenRequest(context)
                    Else
                        HandleCloseRequest(context)
                    End If
                Else
                    SendNotFound(response)
                End If
                Return
            End If

            ' Routes agent sans tenant
            If segments(0) = "agents" Then
                HandleAgentRoutes(context, segments)
                Return
            End If

            ' Multi-tenant: premier segment = slug tenant
            Dim tenantSlug As String = segments(0)
            Dim enterpriseIdOpt As System.Nullable(Of Integer) = db.GetEnterpriseIdBySlug(tenantSlug)
            If Not enterpriseIdOpt.HasValue Then
                response.StatusCode = 404
                SendJsonResponse(response, "{""error"":""Unknown tenant""}")
                Return
            End If

            Dim enterpriseId As Integer = enterpriseIdOpt.Value

            ' Login ne nécessite pas de token
            If segments.Length >= 3 AndAlso segments(1) = "auth" AndAlso segments(2) = "login" AndAlso request.HttpMethod = "POST" Then
                HandleLoginRequest(context, enterpriseId)
                Return
            End If

            ' À partir d'ici, endpoints protégés (JWT)
            Dim principal = RequireUser(context)
            If principal Is Nothing Then
                Return
            End If

            Dim userEnterpriseId As Integer = PermissionChecker.GetEnterpriseIdFromClaims(principal)
            If userEnterpriseId <> enterpriseId Then
                response.StatusCode = 403
                SendJsonResponse(response, "{""error"":""Tenant mismatch""}")
                Return
            End If

            ' /{tenant}/license-status (avant le blocage licence pour que le mobile puisse toujours le consulter)
            If segments.Length = 2 AndAlso segments(1) = "license-status" AndAlso request.HttpMethod = "GET" Then
                HandleLicenseStatusRequest(context, principal, enterpriseId)
                Return
            End If

            ' Licence entreprise: bloquer si Expired ou NotStarted
            Dim licenseStatus As String = db.GetEnterpriseLicenseStatus(enterpriseId)
            If licenseStatus = "Expired" OrElse licenseStatus = "NotStarted" Then
                response.StatusCode = 403
                SendJsonResponse(response, LICENSE_EXPIRED_JSON)
                Return
            End If

            ' /{tenant}/quota
            If segments.Length = 2 AndAlso segments(1) = "quota" AndAlso request.HttpMethod = "GET" Then
                HandleQuotaRequest(context, principal, enterpriseId)
                Return
            End If

            ' /{tenant}/users-quota
            If segments.Length = 2 AndAlso segments(1) = "users-quota" AndAlso request.HttpMethod = "GET" Then
                HandleUsersQuotaRequest(context, principal, enterpriseId)
                Return
            End If

            ' /{tenant}/agents
            If segments.Length = 2 AndAlso segments(1) = "agents" AndAlso request.HttpMethod = "GET" Then
                HandleAgentsRequest(context, principal, enterpriseId)
                Return
            End If

            ' /{tenant}/users/me...
            If segments.Length >= 3 AndAlso segments(1) = "users" AndAlso segments(2) = "me" Then
                HandleUserMeRoutes(context, principal, enterpriseId, segments)
                Return
            End If

            ' /{tenant}/users... (admin)
            If segments.Length >= 2 AndAlso segments(1) = "users" Then
                HandleUserRoutes(context, principal, enterpriseId, segments)
                Return
            End If

            ' /{tenant}/events
            If segments.Length >= 2 AndAlso segments(1) = "events" AndAlso request.HttpMethod = "GET" Then
                HandleEventsRequest(context, principal, enterpriseId)
                Return
            End If

            ' /{tenant}/notifications...
            If segments.Length >= 2 AndAlso segments(1) = "notifications" Then
                HandleNotificationRoutes(context, principal, enterpriseId, segments)
                Return
            End If

            ' /{tenant}/commands/{id}
            If segments.Length = 3 AndAlso segments(1) = "commands" AndAlso request.HttpMethod = "GET" Then
                Dim cmdId As Integer
                If Integer.TryParse(segments(2), cmdId) Then
                    HandleGetCommandResult(context, principal, enterpriseId, cmdId)
                    Return
                End If
            End If

            ' /{tenant}/doors...
            If segments.Length >= 2 AndAlso segments(1) = "doors" Then
                HandleDoorRoutes(context, principal, enterpriseId, segments)
                Return
            End If

            SendNotFound(response)

        Catch ex As Exception
            CreateLog("Error handling request: " & ex.ToString())
            SendError(response, ex.Message)
        Finally
            response.Close()
        End Try
    End Sub

    Private Function RequireUser(context As HttpListenerContext) As ClaimsPrincipal
        Dim request = context.Request
        Dim response = context.Response

        Dim authHeader = request.Headers("Authorization")
        If String.IsNullOrEmpty(authHeader) OrElse Not authHeader.StartsWith("Bearer ") Then
            response.StatusCode = 401
            SendJsonResponse(response, "{""error"":""Missing or invalid Authorization header""}")
            Return Nothing
        End If

        Dim token = authHeader.Substring("Bearer ".Length).Trim()
        Try
            Return auth.ValidateToken(token)
        Catch ex As Exception
            response.StatusCode = 401
            SendJsonResponse(response, "{""error"":""Invalid token""}")
            Return Nothing
        End Try
    End Function

    Private Function ExtractJsonString(json As String, field As String) As String
        Dim pattern = """" & field & """:"""
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return Nothing
        Dim start = idx + pattern.Length
        Dim [end] = json.IndexOf(""""c, start)
        If [end] <= start Then Return Nothing
        Return json.Substring(start, [end] - start)
    End Function

    Private Function ExtractJsonBoolean(json As String, field As String) As String
        Dim pattern = """" & field & """:"
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return Nothing
        Dim start = idx + pattern.Length
        ' Skip whitespace
        While start < json.Length AndAlso (json(start) = " "c OrElse json(start) = vbTab)
            start += 1
        End While
        ' Check for "true" or "false"
        If start + 4 <= json.Length AndAlso json.Substring(start, 4).ToLower() = "true" Then
            Return "true"
        ElseIf start + 5 <= json.Length AndAlso json.Substring(start, 5).ToLower() = "false" Then
            Return "false"
        End If
        Return Nothing
    End Function

    Private Function ExtractJsonNumber(json As String, field As String) As String
        Dim pattern = """" & field & """:"
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return Nothing
        Dim start = idx + pattern.Length
        Dim endIdx = start
        While endIdx < json.Length AndAlso (Char.IsDigit(json(endIdx)) OrElse json(endIdx) = "-"c)
            endIdx += 1
        End While
        If endIdx <= start Then Return Nothing
        Return json.Substring(start, endIdx - start).Trim()
    End Function

    Private Sub HandleLoginRequest(context As HttpListenerContext, enterpriseId As Integer)
        Dim request As HttpListenerRequest = context.Request
        Dim response As HttpListenerResponse = context.Response

        If request.HttpMethod <> "POST" Then
            response.StatusCode = 405
            SendJsonResponse(response, "{""error"":""Method not allowed""}")
            Return
        End If

        Dim body As String
        Dim inputStream As System.IO.Stream = request.InputStream
        Dim encoding As System.Text.Encoding = request.ContentEncoding
        Using reader As New System.IO.StreamReader(inputStream, encoding)
            body = reader.ReadToEnd()
        End Using

        Dim email = ExtractJsonString(body, "email")
        Dim password = ExtractJsonString(body, "password")

        If String.IsNullOrEmpty(email) OrElse String.IsNullOrEmpty(password) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Missing email or password""}")
            Return
        End If

        Dim user = GetUserByEmailAndEnterprise(email, enterpriseId)
        If user Is Nothing OrElse Not PasswordMatches(password, user.PasswordHash) Then
            response.StatusCode = 401
            SendJsonResponse(response, "{""error"":""Invalid credentials""}")
            Return
        End If

        ' Licence entreprise: ne pas délivrer de token si Expired ou NotStarted
        Dim licenseStatus As String = db.GetEnterpriseLicenseStatus(enterpriseId)
        If licenseStatus = "Expired" OrElse licenseStatus = "NotStarted" Then
            response.StatusCode = 403
            SendJsonResponse(response, LICENSE_EXPIRED_JSON)
            Return
        End If

        Dim token = auth.GenerateToken(user.Id, enterpriseId, email, user.IsAdmin)
        response.StatusCode = 200
        SendJsonResponse(response, "{""token"":""" & token & """}")
    End Sub

    Private Sub HandleQuotaRequest(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer)
        Dim response = context.Response
        Dim quota As Integer = db.GetEnterpriseQuota(enterpriseId)
        Dim currentCount As Integer = db.GetActiveDoorCount(enterpriseId)
        Dim remaining As Integer = Math.Max(0, quota - currentCount)
        
        response.StatusCode = 200
        SendJsonResponse(response, "{""quota"":" & quota & ",""used"":" & currentCount & ",""remaining"":" & remaining & "}")
    End Sub

    Private Sub HandleUsersQuotaRequest(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer)
        Dim response = context.Response
        Dim quota As Integer = db.GetEnterpriseUserQuota(enterpriseId)
        Dim currentCount As Integer = db.GetActiveUserCount(enterpriseId)
        Dim remaining As Integer = Math.Max(0, quota - currentCount)
        
        response.StatusCode = 200
        SendJsonResponse(response, "{""quota"":" & quota & ",""used"":" & currentCount & ",""remaining"":" & remaining & "}")
    End Sub

    Private Sub HandleLicenseStatusRequest(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer)
        Dim response = context.Response
        Dim info As DatabaseHelper.LicenseInfo = db.GetEnterpriseLicenseInfo(enterpriseId)
        Dim endStr As String = If(info.EndDate.HasValue, """" & info.EndDate.Value.ToString("yyyy-MM-dd") & """", "null")
        Dim graceStr As String = If(info.GraceUntil.HasValue, """" & info.GraceUntil.Value.ToString("yyyy-MM-dd") & """", "null")
        Dim json = "{""status"":""" & info.Status.Replace("""", "\""") & """,""end_date"":" & endStr & ",""grace_until"":" & graceStr & "}"
        response.StatusCode = 200
        SendJsonResponse(response, json)
    End Sub

    Private Sub HandleAgentsRequest(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer)
        Dim response = context.Response
        Dim agents = db.GetAgentsForEnterprise(enterpriseId)
        
        Dim agentsJson As New System.Text.StringBuilder()
        agentsJson.Append("{""agents"":[")
        Dim first As Boolean = True
        For Each agent As DatabaseHelper.AgentInfo In agents
            If Not first Then agentsJson.Append(",")
            first = False
            agentsJson.Append("{""id"":").Append(agent.Id).Append(",")
            agentsJson.Append("""name"":""").Append(agent.Name.Replace("""", "\""")).Append("""}")
        Next
        agentsJson.Append("]}")
        
        response.StatusCode = 200
        SendJsonResponse(response, agentsJson.ToString())
    End Sub

    Private Class UserRecord
        Public Property Id As Integer
        Public Property PasswordHash As String
        Public Property IsAdmin As Boolean
    End Class

    Private Function GetUserByEmailAndEnterprise(email As String, enterpriseId As Integer) As UserRecord
        Using conn As MySql.Data.MySqlClient.MySqlConnection = db.GetConnection()
            Dim sql As String = "SELECT id, password_hash, is_admin FROM users WHERE email = @e AND enterprise_id = @ent AND is_active = 1"
            Using cmd As New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@e", email)
                cmd.Parameters.AddWithValue("@ent", enterpriseId)
                Using rdr As MySql.Data.MySqlClient.MySqlDataReader = cmd.ExecuteReader()
                    If Not rdr.Read() Then
                        Return Nothing
                    End If
                    Dim u As New UserRecord()
                    u.Id = rdr.GetInt32(0)
                    u.PasswordHash = rdr.GetString(1)
                    u.IsAdmin = rdr.GetBoolean(2)
                    Return u
                End Using
            End Using
        End Using
    End Function

    Private Function PasswordMatches(plainPassword As String, storedHash As String) As Boolean
        ' TODO: remplacer par bcrypt; pour l'instant SHA256 simple
        If String.IsNullOrEmpty(storedHash) Then
            Return False
        End If
        
        Dim bytes = Encoding.UTF8.GetBytes(plainPassword)
        Dim hashString As String
        Using sha = System.Security.Cryptography.SHA256.Create()
            Dim hash = sha.ComputeHash(bytes)
            hashString = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant()
        End Using
        
        ' Nettoyer le hash stocké
        Dim cleanStoredHash = storedHash.Trim().ToLowerInvariant()
        
        ' Si le hash stocké fait 128 caractères, c'est qu'il a été double-encodé en hex par MySQL
        ' On le décode : chaque paire de caractères hex représente un caractère ASCII
        If cleanStoredHash.Length = 128 Then
            Dim decodedHash As New System.Text.StringBuilder()
            For i As Integer = 0 To cleanStoredHash.Length - 1 Step 2
                Dim hexByte = cleanStoredHash.Substring(i, 2)
                Dim byteValue = Convert.ToByte(hexByte, 16)
                decodedHash.Append(ChrW(byteValue))
            Next
            cleanStoredHash = decodedHash.ToString().ToLowerInvariant()
        End If
        
        Return String.Equals(hashString, cleanStoredHash, StringComparison.Ordinal)
    End Function

    ' ===== Utility Methods =====
    Private Function HashPassword(plainPassword As String) As String
        Dim bytes = Encoding.UTF8.GetBytes(plainPassword)
        Using sha = System.Security.Cryptography.SHA256.Create()
            Dim hash = sha.ComputeHash(bytes)
            Return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant()
        End Using
    End Function

    Private Function ReadRequestBody(request As HttpListenerRequest) As String
        If Not request.HasEntityBody Then Return ""
        Dim inputStream As System.IO.Stream = request.InputStream
        Dim encoding As System.Text.Encoding = request.ContentEncoding
        Using reader As New System.IO.StreamReader(inputStream, encoding)
            Return reader.ReadToEnd()
        End Using
    End Function

    ' ===== User Profile Routes =====
    Private Sub HandleUserMeRoutes(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer, segments As String())
        Dim request = context.Request
        Dim response = context.Response
        Dim userId As Integer = PermissionChecker.GetUserIdFromClaims(principal)

        ' GET /{tenant}/users/me
        If segments.Length = 3 AndAlso request.HttpMethod = "GET" Then
            Dim profile = db.GetUserProfile(userId, enterpriseId)
            If profile Is Nothing Then
                response.StatusCode = 404
                SendJsonResponse(response, "{""error"":""User not found""}")
                Return
            End If
            Dim json = "{""id"":" & profile.Id & ",""email"":""" & profile.Email.Replace("""", "\""") & """,""first_name"":""" & profile.FirstName.Replace("""", "\""") & """,""last_name"":""" & profile.LastName.Replace("""", "\""") & """,""is_admin"":" & If(profile.IsAdmin, "true", "false") & "}"
            response.StatusCode = 200
            SendJsonResponse(response, json)
            Return
        End If

        ' PUT /{tenant}/users/me
        If segments.Length = 3 AndAlso request.HttpMethod = "PUT" Then
            Dim body = ReadRequestBody(request)
            Dim firstName = ExtractJsonString(body, "first_name")
            Dim lastName = ExtractJsonString(body, "last_name")
            If String.IsNullOrEmpty(firstName) OrElse String.IsNullOrEmpty(lastName) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing first_name or last_name""}")
                Return
            End If
            db.UpdateUserProfile(userId, firstName, lastName)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""Profile updated""}")
            Return
        End If

        ' PUT /{tenant}/users/me/password
        If segments.Length = 4 AndAlso segments(3) = "password" AndAlso request.HttpMethod = "PUT" Then
            Dim body = ReadRequestBody(request)
            Dim currentPassword = ExtractJsonString(body, "current_password")
            Dim newPassword = ExtractJsonString(body, "new_password")
            If String.IsNullOrEmpty(currentPassword) OrElse String.IsNullOrEmpty(newPassword) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing current_password or new_password""}")
                Return
            End If

            ' Verify current password
            Dim storedHash = db.GetUserPasswordHash(userId)
            If Not PasswordMatches(currentPassword, storedHash) Then
                response.StatusCode = 401
                SendJsonResponse(response, "{""error"":""Current password is incorrect""}")
                Return
            End If

            Dim newHash = HashPassword(newPassword)
            db.UpdateUserPassword(userId, newHash)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""Password changed""}")
            Return
        End If

        SendNotFound(response)
    End Sub

    ' ===== User Management Routes (Admin) =====
    Private Sub HandleUserRoutes(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer, segments As String())
        Dim request = context.Request
        Dim response = context.Response
        Dim isAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)

        If Not isAdmin Then
            response.StatusCode = 403
            SendJsonResponse(response, "{""error"":""Admin access required""}")
            Return
        End If

        ' GET /{tenant}/users
        If segments.Length = 2 AndAlso request.HttpMethod = "GET" Then
            Dim users = db.GetUsersForEnterprise(enterpriseId)
            Dim json As New System.Text.StringBuilder()
            json.Append("{""users"":[")
            Dim first As Boolean = True
            For Each u As DatabaseHelper.UserProfile In users
                If Not first Then json.Append(",")
                first = False
                json.Append("{""id"":").Append(u.Id)
                json.Append(",""email"":""").Append(u.Email.Replace("""", "\""")).Append("""")
                json.Append(",""first_name"":""").Append(u.FirstName.Replace("""", "\""")).Append("""")
                json.Append(",""last_name"":""").Append(u.LastName.Replace("""", "\""")).Append("""")
                json.Append(",""is_admin"":").Append(If(u.IsAdmin, "true", "false"))
                json.Append("}")
            Next
            json.Append("]}")
            response.StatusCode = 200
            SendJsonResponse(response, json.ToString())
            Return
        End If

        ' POST /{tenant}/users
        If segments.Length = 2 AndAlso request.HttpMethod = "POST" Then
            Dim body = ReadRequestBody(request)
            Dim email = ExtractJsonString(body, "email")
            Dim password = ExtractJsonString(body, "password")
            Dim firstName = ExtractJsonString(body, "first_name")
            Dim lastName = ExtractJsonString(body, "last_name")
            Dim isAdminStr = ExtractJsonBoolean(body, "is_admin")

            If String.IsNullOrEmpty(email) OrElse String.IsNullOrEmpty(password) OrElse String.IsNullOrEmpty(firstName) OrElse String.IsNullOrEmpty(lastName) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing required fields: email, password, first_name, last_name""}")
                Return
            End If

            Dim newIsAdmin As Boolean = (isAdminStr = "true")
            Dim passwordHash = HashPassword(password)

            Try
                Dim newUserId = db.CreateUser(enterpriseId, email, passwordHash, firstName, lastName, newIsAdmin)
                response.StatusCode = 201
                SendJsonResponse(response, "{""success"":true,""user_id"":" & newUserId & "}")
            Catch ex As Exception
                If ex.Message.Contains("Duplicate") Then
                    response.StatusCode = 409
                    SendJsonResponse(response, "{""error"":""Email already exists""}")
                Else
                    response.StatusCode = 500
                    SendJsonResponse(response, "{""error"":""Failed to create user""}")
                End If
            End Try
            Return
        End If

        If segments.Length < 3 Then
            SendNotFound(response)
            Return
        End If

        Dim targetUserId As Integer
        If Not Integer.TryParse(segments(2), targetUserId) Then
            SendNotFound(response)
            Return
        End If

        ' PUT /{tenant}/users/{id}
        If segments.Length = 3 AndAlso request.HttpMethod = "PUT" Then
            Dim body = ReadRequestBody(request)
            Dim firstName = ExtractJsonString(body, "first_name")
            Dim lastName = ExtractJsonString(body, "last_name")
            Dim isAdminStr = ExtractJsonBoolean(body, "is_admin")

            If String.IsNullOrEmpty(firstName) OrElse String.IsNullOrEmpty(lastName) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing first_name or last_name""}")
                Return
            End If

            Dim targetIsAdmin As Boolean = (isAdminStr = "true")
            db.UpdateUser(targetUserId, firstName, lastName, targetIsAdmin)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""User updated""}")
            Return
        End If

        ' DELETE /{tenant}/users/{id}
        If segments.Length = 3 AndAlso request.HttpMethod = "DELETE" Then
            db.DeleteUser(targetUserId)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""User deleted""}")
            Return
        End If

        ' GET /{tenant}/users/{id}/permissions
        If segments.Length = 4 AndAlso segments(3) = "permissions" AndAlso request.HttpMethod = "GET" Then
            Dim perms = db.GetUserPermissions(targetUserId)
            Dim json As New System.Text.StringBuilder()
            json.Append("{""permissions"":[")
            Dim first As Boolean = True
            For Each p As DatabaseHelper.UserPermission In perms
                If Not first Then json.Append(",")
                first = False
                json.Append("{""door_id"":").Append(p.DoorId)
                json.Append(",""door_name"":""").Append(p.DoorName.Replace("""", "\""")).Append("""")
                json.Append(",""can_open"":").Append(If(p.CanOpen, "true", "false"))
                json.Append(",""can_close"":").Append(If(p.CanClose, "true", "false"))
                json.Append(",""can_view_status"":").Append(If(p.CanViewStatus, "true", "false"))
                json.Append("}")
            Next
            json.Append("]}")
            response.StatusCode = 200
            SendJsonResponse(response, json.ToString())
            Return
        End If

        ' PUT /{tenant}/users/{id}/permissions
        If segments.Length = 4 AndAlso segments(3) = "permissions" AndAlso request.HttpMethod = "PUT" Then
            Dim body = ReadRequestBody(request)
            ' Parse permissions array from body: {"permissions":[{"door_id":1,"can_open":true,...},...]}
            Dim permissions As New List(Of DatabaseHelper.UserPermission)()
            Dim permsStart = body.IndexOf("[")
            Dim permsEnd = body.LastIndexOf("]")
            If permsStart >= 0 AndAlso permsEnd > permsStart Then
                Dim permsJson = body.Substring(permsStart, permsEnd - permsStart + 1)
                Dim idx = 0
                While idx < permsJson.Length
                    Dim objStart = permsJson.IndexOf("{"c, idx)
                    If objStart = -1 Then Exit While
                    Dim objEnd = permsJson.IndexOf("}"c, objStart)
                    If objEnd = -1 Then Exit While
                    Dim objJson = permsJson.Substring(objStart, objEnd - objStart + 1)

                    Dim perm As New DatabaseHelper.UserPermission()
                    Dim doorIdStr = ExtractJsonNumber(objJson, "door_id")
                    If Not String.IsNullOrEmpty(doorIdStr) Then
                        perm.DoorId = Integer.Parse(doorIdStr)
                        perm.CanOpen = (ExtractJsonBoolean(objJson, "can_open") = "true")
                        perm.CanClose = (ExtractJsonBoolean(objJson, "can_close") = "true")
                        perm.CanViewStatus = (ExtractJsonBoolean(objJson, "can_view_status") = "true")
                        permissions.Add(perm)
                    End If
                    idx = objEnd + 1
                End While
            End If

            db.SetUserPermissions(targetUserId, permissions)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""Permissions updated""}")
            Return
        End If

        SendNotFound(response)
    End Sub

    ' ===== Events Route =====
    Private Sub HandleEventsRequest(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer)
        Dim request = context.Request
        Dim response = context.Response
        Dim userId As Integer = PermissionChecker.GetUserIdFromClaims(principal)
        Dim isAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)

        Dim doorIdParam = request.QueryString("door_id")
        Dim limitParam = request.QueryString("limit")
        Dim doorId As Integer? = Nothing
        Dim limit As Integer = 50

        If Not String.IsNullOrEmpty(doorIdParam) Then
            Dim did As Integer
            If Integer.TryParse(doorIdParam, did) Then doorId = did
        End If
        If Not String.IsNullOrEmpty(limitParam) Then
            Integer.TryParse(limitParam, limit)
        End If
        If limit > 200 Then limit = 200

        Dim events = db.GetDoorEvents(enterpriseId, userId, isAdmin, doorId, limit)
        Dim json As New System.Text.StringBuilder()
        json.Append("{""events"":[")
        Dim first As Boolean = True
        For Each ev As DatabaseHelper.DoorEventInfo In events
            If Not first Then json.Append(",")
            first = False
            json.Append("{""id"":").Append(ev.Id)
            json.Append(",""door_id"":").Append(ev.DoorId)
            json.Append(",""door_name"":""").Append(ev.DoorName.Replace("""", "\""")).Append("""")
            json.Append(",""event_type"":""").Append(ev.EventType.Replace("""", "\""")).Append("""")
            If Not String.IsNullOrEmpty(ev.EventData) Then
                json.Append(",""event_data"":""").Append(ev.EventData.Replace("""", "\""")).Append("""")
            End If
            json.Append(",""source"":""").Append(ev.Source).Append("""")
            json.Append(",""created_at"":""").Append(ev.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss")).Append("""")
            json.Append("}")
        Next
        json.Append("]}")
        response.StatusCode = 200
        SendJsonResponse(response, json.ToString())
    End Sub

    ' ===== Notification Preferences Routes =====
    Private Sub HandleNotificationRoutes(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer, segments As String())
        Dim request = context.Request
        Dim response = context.Response
        Dim userId As Integer = PermissionChecker.GetUserIdFromClaims(principal)

        ' GET /{tenant}/notifications
        If segments.Length = 2 AndAlso request.HttpMethod = "GET" Then
            Dim prefs = db.GetNotificationPreferences(userId)
            Dim json As New System.Text.StringBuilder()
            json.Append("{""preferences"":[")
            Dim first As Boolean = True
            For Each p As DatabaseHelper.NotificationPreference In prefs
                If Not first Then json.Append(",")
                first = False
                json.Append("{""door_id"":").Append(p.DoorId)
                json.Append(",""door_name"":""").Append(p.DoorName.Replace("""", "\""")).Append("""")
                json.Append(",""notify_on_open"":").Append(If(p.NotifyOnOpen, "true", "false"))
                json.Append(",""notify_on_close"":").Append(If(p.NotifyOnClose, "true", "false"))
                json.Append(",""notify_on_forced"":").Append(If(p.NotifyOnForced, "true", "false"))
                json.Append("}")
            Next
            json.Append("]}")
            response.StatusCode = 200
            SendJsonResponse(response, json.ToString())
            Return
        End If

        ' PUT /{tenant}/notifications
        If segments.Length = 2 AndAlso request.HttpMethod = "PUT" Then
            Dim body = ReadRequestBody(request)
            Dim doorIdStr = ExtractJsonNumber(body, "door_id")
            If String.IsNullOrEmpty(doorIdStr) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing door_id""}")
                Return
            End If
            Dim doorId = Integer.Parse(doorIdStr)
            Dim notifyOpen = (ExtractJsonBoolean(body, "notify_on_open") = "true")
            Dim notifyClose = (ExtractJsonBoolean(body, "notify_on_close") = "true")
            Dim notifyForced = (ExtractJsonBoolean(body, "notify_on_forced") = "true")
            db.SetNotificationPreference(userId, doorId, notifyOpen, notifyClose, notifyForced)
            response.StatusCode = 200
            SendJsonResponse(response, "{""success"":true,""message"":""Notification preferences updated""}")
            Return
        End If

        SendNotFound(response)
    End Sub

    Private Sub HandleGetCommandResult(context As HttpListenerContext, principal As ClaimsPrincipal, enterpriseId As Integer, cmdId As Integer)
        Dim response = context.Response
        Dim userId As Integer = PermissionChecker.GetUserIdFromClaims(principal)
        Dim isAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)

        Dim cmdResult = commandQueue.GetCommandById(cmdId)
        If cmdResult Is Nothing Then
            response.StatusCode = 404
            SendJsonResponse(response, "{""error"":""Command not found""}")
            Return
        End If

        ' Verify ownership: admin or own command
        If Not isAdmin AndAlso cmdResult.UserId.HasValue AndAlso cmdResult.UserId.Value <> userId Then
            response.StatusCode = 403
            SendJsonResponse(response, "{""error"":""Access denied""}")
            Return
        End If

        Dim json As New System.Text.StringBuilder()
        json.Append("{""id"":").Append(cmdResult.Id)
        json.Append(",""status"":""").Append(cmdResult.Status).Append("""")
        json.Append(",""command_type"":""").Append(cmdResult.CommandType).Append("""")
        If Not String.IsNullOrEmpty(cmdResult.Result) Then
            json.Append(",""result"":""").Append(cmdResult.Result.Replace("""", "\""")).Append("""")
        End If
        If Not String.IsNullOrEmpty(cmdResult.ErrorMessage) Then
            json.Append(",""error_message"":""").Append(cmdResult.ErrorMessage.Replace("""", "\""")).Append("""")
        End If
        json.Append("}")

        response.StatusCode = 200
        SendJsonResponse(response, json.ToString())
    End Sub

    Private Sub HandleDoorRoutes(context As HttpListenerContext,
                                 principal As ClaimsPrincipal,
                                 enterpriseId As Integer,
                                 segments As String())
        Dim request = context.Request
        Dim response = context.Response

        ' GET /{tenant}/doors
        If segments.Length = 2 AndAlso request.HttpMethod = "GET" Then
            Dim userId As Integer = PermissionChecker.GetUserIdFromClaims(principal)
            Dim isAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)
            Dim doors As List(Of DatabaseHelper.DoorInfo) = db.GetDoorsForUser(userId, enterpriseId, isAdmin)
            
            Dim doorsJson As New System.Text.StringBuilder()
            doorsJson.Append("{""doors"":[")
            Dim first As Boolean = True
            For Each door As DatabaseHelper.DoorInfo In doors
                If Not first Then doorsJson.Append(",")
                first = False
                doorsJson.Append("{""id"":").Append(door.Id).Append(",")
                doorsJson.Append("""name"":""").Append(door.Name.Replace("""", "\""")).Append(""",")
                doorsJson.Append("""terminal_ip"":""").Append(door.TerminalIP).Append(""",")
                doorsJson.Append("""terminal_port"":").Append(door.TerminalPort).Append(",")
                doorsJson.Append("""default_delay"":").Append(door.DefaultDelay).Append(",")
                doorsJson.Append("""agent_id"":").Append(door.AgentId).Append("}")
            Next
            doorsJson.Append("]}")
            
            response.StatusCode = 200
            SendJsonResponse(response, doorsJson.ToString())
            Return
        End If

        ' POST /{tenant}/doors - Créer une nouvelle porte
        If segments.Length = 2 AndAlso request.HttpMethod = "POST" Then
            Dim postUserId As Integer = PermissionChecker.GetUserIdFromClaims(principal)
            Dim postIsAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)
            
            ' Seuls les admins peuvent créer des portes
            If Not postIsAdmin Then
                response.StatusCode = 403
                SendJsonResponse(response, "{""error"":""Only administrators can create doors""}")
                Return
            End If

            ' Vérifier le quota
            Dim quota As Integer = db.GetEnterpriseQuota(enterpriseId)
            Dim currentCount As Integer = db.GetActiveDoorCount(enterpriseId)
            If currentCount >= quota Then
                response.StatusCode = 403
                SendJsonResponse(response, "{""error"":""Door quota exceeded. You have reached your limit of " & quota & " doors.""}")
                Return
            End If

            ' Lire le body
            Dim body As String = ""
            If request.HasEntityBody Then
                Dim inputStream As System.IO.Stream = request.InputStream
                Dim encoding As System.Text.Encoding = request.ContentEncoding
                Using reader As New System.IO.StreamReader(inputStream, encoding)
                    body = reader.ReadToEnd()
                End Using
            End If

            Dim name = ExtractJsonString(body, "name")
            Dim terminalIp = ExtractJsonString(body, "terminal_ip")
            Dim agentIdStr = ExtractJsonNumber(body, "agent_id")
            Dim terminalPortStr = ExtractJsonNumber(body, "terminal_port")
            Dim defaultDelayStr = ExtractJsonNumber(body, "default_delay")

            If String.IsNullOrEmpty(name) OrElse String.IsNullOrEmpty(terminalIp) OrElse String.IsNullOrEmpty(agentIdStr) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Missing required fields: name, terminal_ip, agent_id""}")
                Return
            End If

            Dim agentId As Integer
            If Not Integer.TryParse(agentIdStr, agentId) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Invalid agent_id""}")
                Return
            End If

            Dim terminalPort As Integer = 4370
            If Not String.IsNullOrEmpty(terminalPortStr) Then
                Integer.TryParse(terminalPortStr, terminalPort)
            End If

            Dim defaultDelay As Integer = 3000
            If Not String.IsNullOrEmpty(defaultDelayStr) Then
                Integer.TryParse(defaultDelayStr, defaultDelay)
            End If

            ' Vérifier que l'agent appartient à l'entreprise
            Dim agents = db.GetAgentsForEnterprise(enterpriseId)
            Dim agentExists As Boolean = False
            For Each agentItem As DatabaseHelper.AgentInfo In agents
                If agentItem.Id = agentId Then
                    agentExists = True
                    Exit For
                End If
            Next

            If Not agentExists Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Invalid agent_id for this enterprise""}")
                Return
            End If

            ' Créer la porte
            Try
                Dim newDoorId = db.CreateDoor(enterpriseId, agentId, name, terminalIp, terminalPort, defaultDelay)
                response.StatusCode = 201
                SendJsonResponse(response, "{""success"":true,""door_id"":" & newDoorId & ",""message"":""Door created successfully""}")
            Catch ex As Exception
                CreateLog("Error creating door: " & ex.ToString())
                response.StatusCode = 500
                SendJsonResponse(response, "{""error"":""Failed to create door""}")
            End Try
            Return
        End If

        ' PUT /{tenant}/doors/{id} - Modifier une porte
        If segments.Length = 3 AndAlso request.HttpMethod = "PUT" Then
            Dim putIsAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)
            If Not putIsAdmin Then
                response.StatusCode = 403
                SendJsonResponse(response, "{""error"":""Only administrators can update doors""}")
                Return
            End If

            Dim putDoorId As Integer
            If Not Integer.TryParse(segments(2), putDoorId) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Invalid door id""}")
                Return
            End If

            ' Vérifier que la porte existe et appartient à l'entreprise
            Dim existingDoor = db.GetDoorById(putDoorId, enterpriseId)
            If existingDoor Is Nothing Then
                response.StatusCode = 404
                SendJsonResponse(response, "{""error"":""Door not found""}")
                Return
            End If

            Dim body As String = ""
            If request.HasEntityBody Then
                Dim inputStream As System.IO.Stream = request.InputStream
                Dim encoding As System.Text.Encoding = request.ContentEncoding
                Using reader As New System.IO.StreamReader(inputStream, encoding)
                    body = reader.ReadToEnd()
                End Using
            End If

            Dim putName = ExtractJsonString(body, "name")
            Dim putTerminalIp = ExtractJsonString(body, "terminal_ip")
            Dim putAgentIdStr = ExtractJsonNumber(body, "agent_id")
            Dim putTerminalPortStr = ExtractJsonNumber(body, "terminal_port")
            Dim putDefaultDelayStr = ExtractJsonNumber(body, "default_delay")

            If String.IsNullOrEmpty(putName) Then putName = existingDoor.Name
            If String.IsNullOrEmpty(putTerminalIp) Then putTerminalIp = existingDoor.TerminalIP

            Dim putAgentId As Integer = existingDoor.AgentId
            If Not String.IsNullOrEmpty(putAgentIdStr) Then
                Integer.TryParse(putAgentIdStr, putAgentId)
            End If

            Dim putTerminalPort As Integer = existingDoor.TerminalPort
            If Not String.IsNullOrEmpty(putTerminalPortStr) Then
                Integer.TryParse(putTerminalPortStr, putTerminalPort)
            End If

            Dim putDefaultDelay As Integer = existingDoor.DefaultDelay
            If Not String.IsNullOrEmpty(putDefaultDelayStr) Then
                Integer.TryParse(putDefaultDelayStr, putDefaultDelay)
            End If

            Try
                db.UpdateDoor(putDoorId, putName, putTerminalIp, putTerminalPort, putDefaultDelay, putAgentId)
                response.StatusCode = 200
                SendJsonResponse(response, "{""success"":true,""message"":""Door updated successfully""}")
            Catch ex As Exception
                CreateLog("Error updating door: " & ex.ToString())
                response.StatusCode = 500
                SendJsonResponse(response, "{""error"":""Failed to update door""}")
            End Try
            Return
        End If

        ' DELETE /{tenant}/doors/{id} - Supprimer une porte (soft delete)
        If segments.Length = 3 AndAlso request.HttpMethod = "DELETE" Then
            Dim delIsAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)
            If Not delIsAdmin Then
                response.StatusCode = 403
                SendJsonResponse(response, "{""error"":""Only administrators can delete doors""}")
                Return
            End If

            Dim delDoorId As Integer
            If Not Integer.TryParse(segments(2), delDoorId) Then
                response.StatusCode = 400
                SendJsonResponse(response, "{""error"":""Invalid door id""}")
                Return
            End If

            Dim existingDoor = db.GetDoorById(delDoorId, enterpriseId)
            If existingDoor Is Nothing Then
                response.StatusCode = 404
                SendJsonResponse(response, "{""error"":""Door not found""}")
                Return
            End If

            Try
                db.DeleteDoor(delDoorId)
                response.StatusCode = 200
                SendJsonResponse(response, "{""success"":true,""message"":""Door deleted successfully""}")
            Catch ex As Exception
                CreateLog("Error deleting door: " & ex.ToString())
                response.StatusCode = 500
                SendJsonResponse(response, "{""error"":""Failed to delete door""}")
            End Try
            Return
        End If

        If segments.Length < 4 Then
            SendNotFound(response)
            Return
        End If

        Dim doorId As Integer
        If Not Integer.TryParse(segments(2), doorId) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Invalid door id""}")
            Return
        End If

        Dim action As String = segments(3)
        Dim currentUserId As Integer = PermissionChecker.GetUserIdFromClaims(principal)
        Dim currentIsAdmin As Boolean = PermissionChecker.IsAdminFromClaims(principal)
        Dim permChecker As New PermissionChecker(db)

        Select Case action
            Case "open"
                If Not permChecker.HasDoorPermission(currentUserId, doorId, "open", currentIsAdmin) Then
                    response.StatusCode = 403
                    SendJsonResponse(response, "{""error"":""No permission to open door""}")
                    Return
                End If
                
                ' Lire le body pour delay si présent
                Dim body As String = ""
                If request.HasEntityBody Then
                    Dim inputStream As System.IO.Stream = request.InputStream
                    Dim encoding As System.Text.Encoding = request.ContentEncoding
                    Using reader As New System.IO.StreamReader(inputStream, encoding)
                        body = reader.ReadToEnd()
                    End Using
                End If
                Dim delay As Integer = 3000
                If body.Contains("delay") Then
                    Dim delayStr = ExtractJsonNumber(body, "delay")
                    If Not String.IsNullOrEmpty(delayStr) Then
                        Integer.TryParse(delayStr, delay)
                    End If
                End If
                
                ' Récupérer agent_id pour cette porte
                Dim agentIdOpt As System.Nullable(Of Integer) = db.GetAgentIdForDoor(doorId)
                If Not agentIdOpt.HasValue Then
                    response.StatusCode = 500
                    SendJsonResponse(response, "{""error"":""No agent configured for this door""}")
                    Return
                End If
                
                ' Mettre en file d'attente
                Dim paramsJson = "{""delay"":" & delay & "}"
                Dim cmdId = commandQueue.EnqueueCommand(agentIdOpt.Value, doorId, currentUserId, "open", paramsJson)
                response.StatusCode = 200
                SendJsonResponse(response, "{""success"":true,""command_id"":" & cmdId & ",""message"":""Command queued""}")
                
            Case "close"
                If Not permChecker.HasDoorPermission(currentUserId, doorId, "close", currentIsAdmin) Then
                    response.StatusCode = 403
                    SendJsonResponse(response, "{""error"":""No permission to close door""}")
                    Return
                End If
                
                Dim agentIdOpt As System.Nullable(Of Integer) = db.GetAgentIdForDoor(doorId)
                If Not agentIdOpt.HasValue Then
                    response.StatusCode = 500
                    SendJsonResponse(response, "{""error"":""No agent configured for this door""}")
                    Return
                End If
                
                Dim cmdId = commandQueue.EnqueueCommand(agentIdOpt.Value, doorId, currentUserId, "close", "{}")
                response.StatusCode = 200
                SendJsonResponse(response, "{""success"":true,""command_id"":" & cmdId & ",""message"":""Command queued""}")
                
            Case "status"
                If Not permChecker.HasDoorPermission(currentUserId, doorId, "status", currentIsAdmin) Then
                    response.StatusCode = 403
                    SendJsonResponse(response, "{""error"":""No permission to view status""}")
                    Return
                End If
                
                Dim agentIdOpt As System.Nullable(Of Integer) = db.GetAgentIdForDoor(doorId)
                If Not agentIdOpt.HasValue Then
                    response.StatusCode = 500
                    SendJsonResponse(response, "{""error"":""No agent configured for this door""}")
                    Return
                End If
                
                Dim cmdId = commandQueue.EnqueueCommand(agentIdOpt.Value, doorId, currentUserId, "status", "{}")
                response.StatusCode = 200
                SendJsonResponse(response, "{""success"":true,""command_id"":" & cmdId & ",""message"":""Status request queued""}")
                
            Case Else
                SendNotFound(response)
        End Select
    End Sub

    Private Sub HandleOpenRequest(context As HttpListenerContext)
        Dim request As HttpListenerRequest = context.Request
        Dim response As HttpListenerResponse = context.Response

        Try
            ' Lire le body JSON
            Dim inputStream As System.IO.Stream = request.InputStream
            Dim encoding As System.Text.Encoding = request.ContentEncoding
            Dim reader As New System.IO.StreamReader(inputStream, encoding)
            Dim jsonBody As String = reader.ReadToEnd()

            ' Parser simple du JSON
            Dim terminalIP As String = DEFAULT_TERMINAL_IP
            Dim delay As Integer = 1000 ' 1 seconde par défaut

            If jsonBody.Contains("terminalIP") Then
                Dim ipStart As Integer = jsonBody.IndexOf("""terminalIP"":""") + 14
                Dim ipEnd As Integer = jsonBody.IndexOf("""", ipStart)
                If ipEnd > ipStart Then
                    terminalIP = jsonBody.Substring(ipStart, ipEnd - ipStart)
                End If
            End If

            If jsonBody.Contains("delay") Then
                Dim delayStart As Integer = jsonBody.IndexOf("""delay"":") + 8
                Dim delayEnd As Integer = jsonBody.IndexOf("}", delayStart)
                If delayEnd = -1 Then delayEnd = jsonBody.IndexOf(",", delayStart)
                If delayEnd = -1 Then delayEnd = jsonBody.Length
                Dim delayStr As String = jsonBody.Substring(delayStart, delayEnd - delayStart).Trim()
                Integer.TryParse(delayStr, delay)
            End If

            ' Valider les paramètres
            If delay <= 0 Then
                delay = 1000 ' Valeur par défaut
            End If

            ' Ouvrir la porte
            Dim result As Boolean = OpenDoor(terminalIP, delay)

            ' Préparer la réponse JSON
            Dim jsonResponse As String
            If result Then
                response.StatusCode = 200
                jsonResponse = "{""success"":true,""message"":""Door opened successfully"",""delay"":" & delay & ",""status"":""open""}"
                CreateLog("Door opened via HTTP - IP: " & terminalIP & ", Delay: " & delay & "ms")
            Else
                response.StatusCode = 500
                jsonResponse = "{""success"":false,""message"":""Failed to open door""}"
                CreateLog("Failed to open door via HTTP - IP: " & terminalIP)
            End If

            SendJsonResponse(response, jsonResponse)

        Catch ex As Exception
            CreateLog("Error in HandleOpenRequest: " & ex.ToString())
            SendError(response, ex.Message)
        End Try
    End Sub

    Private Sub HandleCloseRequest(context As HttpListenerContext)
        Dim request As HttpListenerRequest = context.Request
        Dim response As HttpListenerResponse = context.Response

        Try
            SyncLock doorStatusLock
                Dim jsonResponse As String
                If doorStatus = "Closed" OrElse doorStatus = "closed" Then
                    response.StatusCode = 200
                    jsonResponse = "{""success"":true,""message"":""Door is already closed"",""status"":""closed""}"
                Else
                    response.StatusCode = 200
                    jsonResponse = "{""success"":true,""message"":""Door will close automatically after unlock delay"",""status"":""closing""}"
                End If
                SendJsonResponse(response, jsonResponse)
            End SyncLock

            CreateLog("Door close status checked via HTTP")

        Catch ex As Exception
            CreateLog("Error in HandleCloseRequest: " & ex.ToString())
            SendError(response, ex.Message)
        End Try
    End Sub

    Private Sub HandleStatusRequest(context As HttpListenerContext)
        Dim response As HttpListenerResponse = context.Response

        Try
            SyncLock doorStatusLock
                Dim lastEventDesc As String = "None"
                If doorEventsHistory.Count > 0 Then
                    Dim lastEvt As DoorEvent = doorEventsHistory(doorEventsHistory.Count - 1)
                    lastEventDesc = lastEvt.Description & " at " & lastEvt.EventTime.ToString("yyyy-MM-dd HH:mm:ss")
                End If

                Dim connectedStr As String = If(axBioBridgeSDK1 IsNot Nothing, "true", "false")
                Dim jsonResponse As String = "{""status"":""" & doorStatus & """,""lastEvent"":""" & lastEventDesc & """,""eventsCount"":" & doorEventsHistory.Count & ",""connected"":" & connectedStr & "}"
                SendJsonResponse(response, jsonResponse)
            End SyncLock

        Catch ex As Exception
            CreateLog("Error in HandleStatusRequest: " & ex.ToString())
            SendError(response, ex.Message)
        End Try
    End Sub

    Private Function OpenDoor(terminalIP As String, delay As Integer) As Boolean
        Try
            If axBioBridgeSDK1 Is Nothing Then
                CreateLog("ERROR: BioBridge SDK not initialized")
                Return False
            End If

            ' Déconnecter si on change de terminal
            If currentConnectedIP <> "" AndAlso currentConnectedIP <> terminalIP Then
                CreateLog("Switching terminal: disconnecting from " & currentConnectedIP & " to connect to " & terminalIP)
                Try
                    axBioBridgeSDK1.Disconnect()
                Catch ex As Exception
                    CreateLog("Warning during disconnect: " & ex.Message)
                End Try
                currentConnectedIP = ""
                Thread.Sleep(500) ' Laisser le SDK se stabiliser après déconnexion
            End If

            ' Connecter au terminal
            Dim connectResult As Integer = -1
            Try
                connectResult = axBioBridgeSDK1.Connect_TCPIP("", 1, terminalIP, DEFAULT_TERMINAL_PORT, 0)
            Catch connEx As Exception
                CreateLog("Exception during Connect_TCPIP to " & terminalIP & ": " & connEx.Message)
                currentConnectedIP = ""
                Return False
            End Try

            If connectResult = 0 Then
                currentConnectedIP = terminalIP
                Dim result As Integer = axBioBridgeSDK1.UnlockDoor(delay)

                If result = 0 Then
                    SyncLock doorStatusLock
                        doorStatus = "Open"
                        lastDoorEvent = DateTime.Now
                        Dim doorEvt As New DoorEvent With {
                            .EventType = 1,
                            .EventTime = DateTime.Now,
                            .Description = "Door opened (UnlockDoor called)"
                        }
                        doorEventsHistory.Add(doorEvt)
                        If doorEventsHistory.Count > 100 Then
                            doorEventsHistory.RemoveAt(0)
                        End If
                    End SyncLock

                    CreateLog("Door opened successfully - IP: " & terminalIP & ", Delay: " & delay & "ms")
                    Return True
                Else
                    CreateLog("Failed to open door - IP: " & terminalIP & ", Error code: " & result)
                    Return False
                End If
            Else
                CreateLog("Failed to connect to terminal: " & terminalIP & " (result=" & connectResult & ")")
                currentConnectedIP = ""
                SyncLock doorStatusLock
                    doorStatus = "Disconnected"
                End SyncLock
                Return False
            End If

        Catch ex As Exception
            CreateLog("Exception in OpenDoor: " & ex.ToString())
            Return False
        End Try
    End Function

    ' Événement OnDoor du SDK BioBridge
    ' Types d'événements possibles :
    ' - Type 1 : La porte est ouverte soudainement
    ' - Type 4 : La porte n'est pas bien fermée
    ' - Type 5 : La porte est fermée
    ' - Type 53 : La porte est ouverte en appuyant sur le bouton Off-Exit
    Private Sub OnDoorEvent(eventType As Integer)
        Try
            SyncLock doorStatusLock
                Dim eventDesc As String = ""
                Select Case eventType
                    Case 1
                        eventDesc = "Door opened suddenly"
                        doorStatus = "Open"
                    Case 4
                        eventDesc = "Door not closed well"
                        doorStatus = "Ajar"
                    Case 5
                        eventDesc = "Door closed"
                        doorStatus = "Closed"
                    Case 53
                        eventDesc = "Door opened by Off-Exit button"
                        doorStatus = "Open"
                    Case Else
                        eventDesc = "Door event type " & eventType
                End Select

                lastDoorEvent = DateTime.Now
                Dim doorEvt As New DoorEvent With {
                    .EventType = eventType,
                    .EventTime = DateTime.Now,
                    .Description = eventDesc
                }
                doorEventsHistory.Add(doorEvt)

                If doorEventsHistory.Count > 100 Then
                    doorEventsHistory.RemoveAt(0)
                End If

                CreateLog("Door Event: " & eventDesc & " (Type: " & eventType & ")")
            End SyncLock

        Catch ex As Exception
            CreateLog("Error in OnDoorEvent: " & ex.ToString())
        End Try
    End Sub

    Private Sub OnConnectedEvent()
        CreateLog("BioBridge Connected event received")
        SyncLock doorStatusLock
            doorStatus = "Connected"
        End SyncLock
    End Sub

    Private Sub OnDisConnectedEvent()
        CreateLog("BioBridge Disconnected event received")
        SyncLock doorStatusLock
            doorStatus = "Disconnected"
        End SyncLock
    End Sub

    Private Sub HandleAgentRoutes(context As HttpListenerContext, segments As String())
        Dim request = context.Request
        Dim response = context.Response

        ' POST /agents/register
        If segments.Length = 2 AndAlso segments(1) = "register" AndAlso request.HttpMethod = "POST" Then
            HandleAgentRegister(context)
            Return
        End If

        If segments.Length < 3 Then
            SendNotFound(response)
            Return
        End If

        Dim agentId As Integer
        If Not Integer.TryParse(segments(1), agentId) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Invalid agent id""}")
            Return
        End If

        ' Vérifier agent_key
        Dim agentKey = request.Headers("X-Agent-Key")
        If String.IsNullOrEmpty(agentKey) Then
            Dim authHeader = request.Headers("Authorization")
            If Not String.IsNullOrEmpty(authHeader) AndAlso authHeader.StartsWith("Bearer ") Then
                agentKey = authHeader.Substring("Bearer ".Length).Trim()
            End If
        End If

        If Not ValidateAgentKey(agentId, agentKey) Then
            CreateLog("HandleAgentRoutes - Invalid agent key for agent " & agentId & ", key: " & If(String.IsNullOrEmpty(agentKey), "(empty)", agentKey))
            response.StatusCode = 401
            SendJsonResponse(response, "{""error"":""Invalid agent key""}")
            Return
        End If

        Dim action = segments(2)
        CreateLog("HandleAgentRoutes - Routing to action: " & action & " for agent " & agentId)

        Select Case action
            Case "heartbeat"
                If request.HttpMethod = "POST" Then
                    HandleAgentHeartbeat(agentId)
                    response.StatusCode = 200
                    SendJsonResponse(response, "{""status"":""ok""}")
                Else
                    SendNotFound(response)
                End If
            Case "commands"
                If request.HttpMethod = "GET" Then
                    HandleAgentGetCommands(context, agentId)
                Else
                    SendNotFound(response)
                End If
            Case "results"
                If request.HttpMethod = "POST" Then
                    CreateLog("HandleAgentRoutes - Calling HandleAgentResults for agent " & agentId)
                    HandleAgentResults(context, agentId)
                Else
                    SendNotFound(response)
                End If
            Case "status"
                If request.HttpMethod = "GET" Then
                    HandleAgentStatus(context, agentId)
                Else
                    SendNotFound(response)
                End If
            Case "events"
                If request.HttpMethod = "POST" Then
                    HandleAgentIngressEvents(context, agentId)
                Else
                    SendNotFound(response)
                End If
            Case Else
                SendNotFound(response)
        End Select
    End Sub

    Private Function ValidateAgentKey(agentId As Integer, agentKey As String) As Boolean
        If String.IsNullOrEmpty(agentKey) Then Return False
        Using conn = db.GetConnection()
            Dim sql = "SELECT COUNT(*) FROM agents WHERE id = @id AND agent_key = @key AND is_active = 1"
            Using cmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@id", agentId)
                cmd.Parameters.AddWithValue("@key", agentKey)
                Dim count = CInt(cmd.ExecuteScalar())
                Return count > 0
            End Using
        End Using
    End Function

    Private Sub HandleAgentRegister(context As HttpListenerContext)
        Dim request = context.Request
        Dim response = context.Response

        Dim body As String
        Dim inputStream As System.IO.Stream = request.InputStream
        Dim encoding As System.Text.Encoding = request.ContentEncoding
        Using reader As New System.IO.StreamReader(inputStream, encoding)
            body = reader.ReadToEnd()
        End Using

        ' Debug: logger le body reçu
        CreateLog("Agent register - Body received: " & body)

        Dim agentKey As String = ExtractJsonString(body, "agent_key")
        Dim enterpriseIdStr As String = ExtractJsonNumber(body, "enterprise_id")
        Dim name As String = ExtractJsonString(body, "name")
        Dim version As String = ExtractJsonString(body, "version")
        If String.IsNullOrEmpty(version) Then version = "1.0.0"

        ' Debug: logger les valeurs extraites
        CreateLog("Agent register - agentKey: " & If(String.IsNullOrEmpty(agentKey), "NULL", agentKey) & ", enterpriseIdStr: " & If(String.IsNullOrEmpty(enterpriseIdStr), "NULL", enterpriseIdStr))

        If String.IsNullOrEmpty(agentKey) OrElse String.IsNullOrEmpty(enterpriseIdStr) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Missing agent_key or enterprise_id""}")
            Return
        End If

        Dim enterpriseId As Integer
        If Not Integer.TryParse(enterpriseIdStr, enterpriseId) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Invalid enterprise_id""}")
            Return
        End If

        Try
            Using conn = db.GetConnection()
                ' Chercher si l'agent existe déjà
                Dim sql = "SELECT id FROM agents WHERE agent_key = @key"
                Using cmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@key", agentKey)
                    Dim existingId = cmd.ExecuteScalar()
                    
                    CreateLog("Agent register - Existing agent check: " & If(existingId Is Nothing OrElse IsDBNull(existingId), "NOT FOUND", "FOUND ID=" & existingId.ToString()))
                    
                    If existingId IsNot Nothing AndAlso Not IsDBNull(existingId) Then
                        ' Agent existe déjà, retourner son ID
                        Dim agentId = CInt(existingId)
                        CreateLog("Agent register - Updating existing agent ID: " & agentId)
                        ' Mettre à jour last_heartbeat et is_online
                        sql = "UPDATE agents SET last_heartbeat = NOW(), is_online = 1, version = @ver WHERE id = @id"
                        Using updCmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                            updCmd.Parameters.AddWithValue("@id", agentId)
                            updCmd.Parameters.AddWithValue("@ver", version)
                            updCmd.ExecuteNonQuery()
                        End Using
                        response.StatusCode = 200
                        SendJsonResponse(response, "{""agent_id"":" & agentId & ",""status"":""registered""}")
                        CreateLog("Agent register - Success: Agent ID " & agentId & " updated")
                    Else
                        ' Créer nouvel agent
                        CreateLog("Agent register - Creating new agent")
                        sql = "INSERT INTO agents (enterprise_id, name, agent_key, version, is_online, last_heartbeat) " &
                              "VALUES (@ent, @name, @key, @ver, 1, NOW())"
                        Using insCmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                            insCmd.Parameters.AddWithValue("@ent", enterpriseId)
                            insCmd.Parameters.AddWithValue("@name", If(String.IsNullOrEmpty(name), "Agent", name))
                            insCmd.Parameters.AddWithValue("@key", agentKey)
                            insCmd.Parameters.AddWithValue("@ver", version)
                            insCmd.ExecuteNonQuery()
                            Dim newAgentId = CInt(insCmd.LastInsertedId)
                            response.StatusCode = 200
                            SendJsonResponse(response, "{""agent_id"":" & newAgentId & ",""status"":""registered""}")
                            CreateLog("Agent register - Success: New agent created with ID " & newAgentId)
                        End Using
                    End If
                End Using
            End Using
        Catch ex As Exception
            CreateLog("Agent register - Exception: " & ex.ToString())
            response.StatusCode = 500
            SendJsonResponse(response, "{""error"":""" & ex.Message.Replace("""", "\""") & """}")
        End Try
    End Sub

    Private Sub HandleAgentHeartbeat(agentId As Integer)
        Using conn = db.GetConnection()
            Dim sql = "UPDATE agents SET last_heartbeat = NOW(), is_online = 1 WHERE id = @id"
            Using cmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@id", agentId)
                cmd.ExecuteNonQuery()
            End Using
        End Using
    End Sub

    Private Sub HandleAgentGetCommands(context As HttpListenerContext, agentId As Integer)
        Dim response = context.Response
        Dim timeout = 5
        Dim timeoutStr = context.Request.QueryString("timeout")
        If Not String.IsNullOrEmpty(timeoutStr) Then
            Integer.TryParse(timeoutStr, timeout)
        End If

        Dim startTime As DateTime = DateTime.Now
        Dim commands As List(Of CommandQueueManager.CommandInfo) = Nothing

        ' Vérifier immédiatement s'il y a des commandes
        commands = commandQueue.GetPendingCommands(agentId, 10)
        If commands.Count > 0 Then
            ' Commandes disponibles, retourner immédiatement
        Else
            ' Long polling: attendre jusqu'à timeout secondes ou jusqu'à avoir des commandes
            While (DateTime.Now - startTime).TotalSeconds < timeout
                commands = commandQueue.GetPendingCommands(agentId, 10)
                If commands.Count > 0 Then
                    Exit While
                End If
                Thread.Sleep(100) ' Réduit à 100ms pour détection plus rapide des commandes
            End While

            If commands Is Nothing Then
                commands = commandQueue.GetPendingCommands(agentId, 10)
            End If
        End If

        Dim json As New System.Text.StringBuilder()
        json.Append("{""commands"":[")
        Dim first As Boolean = True
        For Each cmd As CommandQueueManager.CommandInfo In commands
            If Not first Then json.Append(",")
            first = False
            json.Append("{""id"":").Append(cmd.Id).Append(",")
            json.Append("""door_id"":").Append(cmd.DoorId).Append(",")
            json.Append("""command_type"":""").Append(cmd.CommandType).Append(""",")
            json.Append("""parameters"":").Append(If(String.IsNullOrEmpty(cmd.Parameters), "{}", cmd.Parameters)).Append("}")
        Next
        json.Append("]}")

        response.StatusCode = 200
        SendJsonResponse(response, json.ToString())
    End Sub

    Private Sub HandleAgentResults(context As HttpListenerContext, agentId As Integer)
        Dim request = context.Request
        Dim response = context.Response

        Dim body As String
        Dim inputStream As System.IO.Stream = request.InputStream
        Dim encoding As System.Text.Encoding = request.ContentEncoding
        Using reader As New System.IO.StreamReader(inputStream, encoding)
            body = reader.ReadToEnd()
        End Using

        CreateLog("Agent results - Body received: " & body)

        Dim cmdIdStr As String = ExtractJsonNumber(body, "command_id")
        Dim successStr As String = ExtractJsonBoolean(body, "success")
        ' result est une chaîne JSON échappée, on la récupère telle quelle
        Dim result As String = ExtractJsonString(body, "result")
        Dim errorMsg As String = ExtractJsonString(body, "error_message")

        CreateLog("Agent results - Parsed: cmdId=" & If(String.IsNullOrEmpty(cmdIdStr), "NULL", cmdIdStr) & ", success=" & If(String.IsNullOrEmpty(successStr), "NULL", successStr) & ", result=" & If(String.IsNullOrEmpty(result), "NULL", result) & ", errorMsg=" & If(String.IsNullOrEmpty(errorMsg), "NULL", errorMsg))

        If String.IsNullOrEmpty(cmdIdStr) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Missing command_id""}")
            Return
        End If

        Dim cmdId As Integer
        If Not Integer.TryParse(cmdIdStr, cmdId) Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Invalid command_id""}")
            Return
        End If

        Dim success As Boolean = (successStr = "true" OrElse successStr = "True")
        CreateLog("Agent results - Command " & cmdId & " - success=" & success.ToString())
        
        If success Then
            commandQueue.MarkAsCompleted(cmdId, If(String.IsNullOrEmpty(result), "{}", result))
            CreateLog("Agent results - Command " & cmdId & " marked as completed")
        Else
            commandQueue.MarkAsFailed(cmdId, If(String.IsNullOrEmpty(errorMsg), "Unknown error", errorMsg))
            CreateLog("Agent results - Command " & cmdId & " marked as failed: " & If(String.IsNullOrEmpty(errorMsg), "Unknown error", errorMsg))
        End If

        response.StatusCode = 200
        SendJsonResponse(response, "{""status"":""ok""}")
    End Sub

    Private Sub HandleAgentStatus(context As HttpListenerContext, agentId As Integer)
        Dim response = context.Response
        ' Retourner les portes gérées par cet agent
        Using conn = db.GetConnection()
            Dim sql = "SELECT id, terminal_ip, terminal_port FROM doors WHERE agent_id = @aid AND is_active = 1"
            Using cmd = New MySql.Data.MySqlClient.MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@aid", agentId)
                Dim json As New System.Text.StringBuilder()
                json.Append("{""doors"":[")
                Dim first = True
                Using rdr = cmd.ExecuteReader()
                    While rdr.Read()
                        If Not first Then json.Append(",")
                        first = False
                        json.Append("{""id"":").Append(rdr.GetInt32(0)).Append(",")
                        json.Append("""terminal_ip"":""").Append(rdr.GetString(1)).Append(""",")
                        json.Append("""terminal_port"":").Append(rdr.GetInt32(2)).Append("}")
                    End While
                End Using
                json.Append("]}")
                response.StatusCode = 200
                SendJsonResponse(response, json.ToString())
            End Using
        End Using
    End Sub

    Private Sub HandleAgentIngressEvents(context As HttpListenerContext, agentId As Integer)
        Dim request = context.Request
        Dim response = context.Response

        Dim body = ReadRequestBody(request)
        CreateLog("Agent ingress events - Body: " & body)

        ' Get enterprise_id for this agent
        Dim enterpriseIdOpt = db.GetEnterpriseIdForAgent(agentId)
        If Not enterpriseIdOpt.HasValue Then
            response.StatusCode = 400
            SendJsonResponse(response, "{""error"":""Unknown agent""}")
            Return
        End If
        Dim enterpriseId = enterpriseIdOpt.Value

        ' Parse events array: {"events":[{"ingress_id":1,"event_type":"door_open","event_time":"...","device_ip":"...","description":"..."},...]}
        Dim inserted As Integer = 0
        Dim eventsStart = body.IndexOf("[")
        Dim eventsEnd = body.LastIndexOf("]")
        If eventsStart >= 0 AndAlso eventsEnd > eventsStart Then
            Dim eventsJson = body.Substring(eventsStart, eventsEnd - eventsStart + 1)
            Dim idx = 0
            While idx < eventsJson.Length
                Dim objStart = eventsJson.IndexOf("{"c, idx)
                If objStart = -1 Then Exit While
                Dim objEnd = eventsJson.IndexOf("}"c, objStart)
                If objEnd = -1 Then Exit While
                Dim objJson = eventsJson.Substring(objStart, objEnd - objStart + 1)

                Dim deviceIp = ExtractJsonString(objJson, "device_ip")
                Dim eventType = ExtractJsonString(objJson, "event_type")
                Dim description = ExtractJsonString(objJson, "description")
                Dim ingressIdStr = ExtractJsonNumber(objJson, "ingress_id")

                If Not String.IsNullOrEmpty(deviceIp) Then
                    ' Map device_ip to door_id
                    Dim doorIdOpt = db.GetDoorIdByTerminalIP(enterpriseId, deviceIp)
                    If doorIdOpt.HasValue Then
                        Dim ingressId As Integer? = Nothing
                        If Not String.IsNullOrEmpty(ingressIdStr) Then
                            Dim iid As Integer
                            If Integer.TryParse(ingressIdStr, iid) Then ingressId = iid
                        End If
                        db.InsertDoorEvent(doorIdOpt.Value, If(String.IsNullOrEmpty(eventType), "ingress_event", eventType), description, Nothing, agentId, "ingress", ingressId)
                        inserted += 1
                    Else
                        CreateLog("Agent ingress - No door found for IP: " & deviceIp)
                    End If
                End If

                idx = objEnd + 1
            End While
        End If

        response.StatusCode = 200
        SendJsonResponse(response, "{""status"":""ok"",""inserted"":" & inserted & "}")
    End Sub

    Private Sub SendJsonResponse(response As HttpListenerResponse, jsonResponse As String)
        response.ContentType = "application/json"
        response.ContentEncoding = Encoding.UTF8
        Dim buffer As Byte() = Encoding.UTF8.GetBytes(jsonResponse)
        response.ContentLength64 = buffer.Length
        response.OutputStream.Write(buffer, 0, buffer.Length)
    End Sub

    Private Sub SendError(response As HttpListenerResponse, errorMessage As String)
        response.StatusCode = 500
        Dim errorResponse As String = "{""success"":false,""error"":""" & errorMessage & """}"
        SendJsonResponse(response, errorResponse)
    End Sub

    Private Sub SendNotFound(response As HttpListenerResponse)
        response.StatusCode = 404
        response.StatusDescription = "Not Found"
        Dim buffer As Byte() = Encoding.UTF8.GetBytes("{""error"":""Endpoint not found""}")
        response.ContentLength64 = buffer.Length
        response.OutputStream.Write(buffer, 0, buffer.Length)
    End Sub

    Protected Sub CreateLog(ByVal sMsg As String)
        Dim sSource As String
        Dim sLog As String
        Dim sEvent As String
        Dim sMachine As String

        sSource = "UDM"
        sLog = "Application"
        sEvent = "Door Control Event"
        sMachine = "."
        Dim eSource As EventSourceCreationData = New EventSourceCreationData(sSource, sLog)

        If Not EventLog.SourceExists(sSource, sMachine) Then
            EventLog.CreateEventSource(eSource)
        End If

        Dim ELog As New EventLog(sLog, sMachine, sSource)
        ELog.WriteEntry(sMsg)
    End Sub

End Class
