Imports System.Net
Imports System.Text
Imports System.IO
Imports System.Collections.Generic
Imports System.Diagnostics

Public Class ServerClient
    Private ReadOnly _config As ConfigManager

    Public Sub New(config As ConfigManager)
        _config = config
    End Sub

    Public Function RegisterAgent() As Integer?
        Try
            If _config Is Nothing Then
                Return Nothing
            End If
            Dim url = _config.ServerUrl.TrimEnd("/"c) & "/agents/register"
            Dim json = "{""agent_key"":""" & _config.AgentKey & """,""enterprise_id"":" & _config.EnterpriseId & ",""name"":""Agent"",""version"":""1.0.0""}"

            Dim response = SendPostRequest(url, json)
            
            ' Log la réponse pour debug
            Try
                EventLog.WriteEntry("UDM-Agent", "RegisterAgent - Response: " & If(String.IsNullOrEmpty(response), "(empty)", response), EventLogEntryType.Information)
            Catch
            End Try
            
            If String.IsNullOrEmpty(response) Then 
                ' La réponse est vide, probablement une erreur HTTP
                Return Nothing
            End If

            ' Vérifier si c'est une erreur JSON
            If response.Contains("""error""") Then
                ' C'est une erreur, retourner Nothing
                Return Nothing
            End If

            ' Parser {"agent_id":123,"status":"registered"}
            Dim pattern = """agent_id"":"
            Dim patternIndex = response.IndexOf(pattern)
            If patternIndex = -1 Then 
                ' Pas de "agent_id" dans la réponse, peut-être une erreur
                Try
                    EventLog.WriteEntry("UDM-Agent", "RegisterAgent - No 'agent_id' in response: " & response, EventLogEntryType.Warning)
                Catch
                End Try
                Return Nothing
            End If
            
            ' Commencer après "agent_id":
            Dim idStart = patternIndex + pattern.Length
            ' Chercher la fin du nombre (virgule ou accolade)
            Dim idEnd = idStart
            While idEnd < response.Length AndAlso (Char.IsDigit(response(idEnd)) OrElse response(idEnd) = "-"c)
                idEnd += 1
            End While
            
            If idEnd <= idStart Then 
                Try
                    EventLog.WriteEntry("UDM-Agent", "RegisterAgent - Invalid ID range in response: " & response, EventLogEntryType.Warning)
                Catch
                End Try
                Return Nothing
            End If

            Dim idStr = response.Substring(idStart, idEnd - idStart).Trim()
            Dim agentId As Integer
            If Integer.TryParse(idStr, agentId) Then
                Try
                    EventLog.WriteEntry("UDM-Agent", "RegisterAgent - Successfully parsed agent_id: " & agentId, EventLogEntryType.Information)
                Catch
                End Try
                Return agentId
            Else
                Try
                    EventLog.WriteEntry("UDM-Agent", "RegisterAgent - Failed to parse ID from: '" & idStr & "' (response: " & response & ")", EventLogEntryType.Warning)
                Catch
                End Try
            End If
        Catch ex As Exception
            ' Log l'erreur
            Try
                EventLog.WriteEntry("UDM-Agent", "RegisterAgent - Exception: " & ex.ToString(), EventLogEntryType.Error)
            Catch
            End Try
        End Try
        Return Nothing
    End Function

    Public Function GetCommands(agentId As Integer) As List(Of CommandInfo)
        Try
            Dim url = _config.ServerUrl.TrimEnd("/"c) & "/agents/" & agentId & "/commands?timeout=" & _config.GetCommandTimeout()
            Dim response = SendGetRequest(url)
            If String.IsNullOrEmpty(response) Then Return New List(Of CommandInfo)()

            ' Parser {"commands":[{...}]}
            Dim commandsStart = response.IndexOf("""commands"":[") + 12
            If commandsStart < 12 Then Return New List(Of CommandInfo)()
            Dim commandsEnd = response.LastIndexOf("]")
            If commandsEnd <= commandsStart Then Return New List(Of CommandInfo)()

            Dim commandsJson = response.Substring(commandsStart, commandsEnd - commandsStart + 1)
            Return ParseCommands(commandsJson)
        Catch ex As Exception
            Return New List(Of CommandInfo)()
        End Try
    End Function

    Public Sub SendHeartbeat(agentId As Integer)
        Try
            Dim url = _config.ServerUrl.TrimEnd("/"c) & "/agents/" & agentId & "/heartbeat"
            SendPostRequest(url, "{}")
        Catch ex As Exception
        End Try
    End Sub

    Public Function GetDoorInfo(agentId As Integer) As List(Of DoorInfo)
        Try
            Dim url = _config.ServerUrl.TrimEnd("/"c) & "/agents/" & agentId & "/status"
            Dim response = SendGetRequest(url)
            If String.IsNullOrEmpty(response) Then Return New List(Of DoorInfo)()

            ' Parser {"doors":[{"id":1,"terminal_ip":"192.168.40.10","terminal_port":4370},...]}
            Dim doorsStart = response.IndexOf("""doors"":[") + 9
            If doorsStart < 9 Then Return New List(Of DoorInfo)()
            Dim doorsEnd = response.LastIndexOf("]")
            If doorsEnd <= doorsStart Then Return New List(Of DoorInfo)()

            Dim doorsJson = response.Substring(doorsStart, doorsEnd - doorsStart + 1)
            Return ParseDoors(doorsJson)
        Catch
            Return New List(Of DoorInfo)()
        End Try
    End Function

    Private Function ParseDoors(doorsJson As String) As List(Of DoorInfo)
        Dim doors As New List(Of DoorInfo)()
        If String.IsNullOrEmpty(doorsJson) OrElse doorsJson = "[]" Then Return doors

        Dim idx = 0
        While idx < doorsJson.Length
            Dim objStart = doorsJson.IndexOf("{"c, idx)
            If objStart = -1 Then Exit While
            Dim objEnd = doorsJson.IndexOf("}"c, objStart)
            If objEnd = -1 Then Exit While

            Dim objJson = doorsJson.Substring(objStart, objEnd - objStart + 1)
            Dim door = ParseDoor(objJson)
            If door IsNot Nothing Then
                doors.Add(door)
            End If
            idx = objEnd + 1
        End While

        Return doors
    End Function

    Private Function ParseDoor(objJson As String) As DoorInfo
        Try
            Dim door As New DoorInfo()
            door.Id = ExtractInt(objJson, "id")
            door.TerminalIP = ExtractString(objJson, "terminal_ip")
            door.TerminalPort = ExtractInt(objJson, "terminal_port")
            If door.Id > 0 AndAlso Not String.IsNullOrEmpty(door.TerminalIP) Then
                Return door
            End If
        Catch
        End Try
        Return Nothing
    End Function

    Public Class DoorInfo
        Public Property Id As Integer
        Public Property TerminalIP As String
        Public Property TerminalPort As Integer
    End Class

    Public Sub SendResult(agentId As Integer, commandId As Integer, success As Boolean, result As String, errorMessage As String)
        Try
            Dim url = _config.ServerUrl.TrimEnd("/"c) & "/agents/" & agentId & "/results"
            
            ' Échapper le result JSON pour qu'il soit une chaîne valide
            Dim escapedResult = result.Replace("""", "\""").Replace(vbCrLf, "\n").Replace(vbLf, "\n")
            
            Dim json = "{""command_id"":" & commandId & ",""success"":" & If(success, "true", "false") & ",""result"":""" & escapedResult & """"
            If Not String.IsNullOrEmpty(errorMessage) Then
                json &= ",""error_message"":""" & errorMessage.Replace("""", "\""") & """"
            End If
            json &= "}"
            
            ' Log pour debug
            Try
                EventLog.WriteEntry("UDM-Agent", "SendResult - Sending: " & json, EventLogEntryType.Information)
            Catch
            End Try
            
            Dim response = SendPostRequest(url, json)
            
            ' Log la réponse
            Try
                EventLog.WriteEntry("UDM-Agent", "SendResult - Response: " & If(String.IsNullOrEmpty(response), "(empty)", response), EventLogEntryType.Information)
            Catch
            End Try
        Catch ex As Exception
            Try
                EventLog.WriteEntry("UDM-Agent", "SendResult - Exception: " & ex.ToString(), EventLogEntryType.Error)
            Catch
            End Try
        End Try
    End Sub

    Private Function SendGetRequest(url As String) As String
        Dim request = CType(WebRequest.Create(url), HttpWebRequest)
        request.Method = "GET"
        request.Headers.Add("X-Agent-Key", _config.AgentKey)
        request.Timeout = (_config.GetCommandTimeout() + 2) * 1000

        Using response = request.GetResponse()
            Dim responseStream As System.IO.Stream = response.GetResponseStream()
            Using reader As New System.IO.StreamReader(responseStream)
                Return reader.ReadToEnd()
            End Using
        End Using
    End Function

    Private Function SendPostRequest(url As String, jsonBody As String) As String
        Try
            Dim request = CType(WebRequest.Create(url), HttpWebRequest)
            request.Method = "POST"
            request.ContentType = "application/json"
            request.Headers.Add("X-Agent-Key", _config.AgentKey)
            request.Timeout = 10000

            Dim bytes = Encoding.UTF8.GetBytes(jsonBody)
            request.ContentLength = bytes.Length

            Using stream = request.GetRequestStream()
                stream.Write(bytes, 0, bytes.Length)
            End Using

            Using response = request.GetResponse()
                Dim responseStream As System.IO.Stream = response.GetResponseStream()
                Using reader As New System.IO.StreamReader(responseStream)
                    Return reader.ReadToEnd()
                End Using
            End Using
        Catch webEx As System.Net.WebException
            ' Si c'est une erreur HTTP, essayer de lire la réponse d'erreur
            If webEx.Response IsNot Nothing Then
                Using errorResponse = webEx.Response
                    Dim errorStream As System.IO.Stream = errorResponse.GetResponseStream()
                    Using reader As New System.IO.StreamReader(errorStream)
                        Dim errorBody = reader.ReadToEnd()
                        ' Retourner le body d'erreur pour qu'on puisse le logger
                        Return errorBody
                    End Using
                End Using
            End If
            ' Sinon, retourner Nothing
            Return Nothing
        Catch ex As Exception
            ' Autre exception, retourner Nothing
            Return Nothing
        End Try
    End Function

    Private Function ParseCommands(commandsJson As String) As List(Of CommandInfo)
        Dim commands As New List(Of CommandInfo)()
        If String.IsNullOrEmpty(commandsJson) OrElse commandsJson = "[]" Then Return commands

        ' Parser simple: chercher chaque { "id":..., "door_id":..., ... }
        Dim idx = 0
        While idx < commandsJson.Length
            Dim objStart = commandsJson.IndexOf("{"c, idx)
            If objStart = -1 Then Exit While
            Dim objEnd = commandsJson.IndexOf("}"c, objStart)
            If objEnd = -1 Then Exit While

            Dim objJson = commandsJson.Substring(objStart, objEnd - objStart + 1)
            Dim cmd = ParseCommand(objJson)
            If cmd IsNot Nothing Then
                commands.Add(cmd)
            End If
            idx = objEnd + 1
        End While

        Return commands
    End Function

    Private Function ParseCommand(objJson As String) As CommandInfo
        Try
            Dim cmd As New CommandInfo()
            cmd.Id = ExtractInt(objJson, "id")
            cmd.DoorId = ExtractInt(objJson, "door_id")
            cmd.CommandType = ExtractString(objJson, "command_type")
            cmd.Parameters = ExtractString(objJson, "parameters")
            If String.IsNullOrEmpty(cmd.Parameters) Then cmd.Parameters = "{}"
            Return cmd
        Catch
            Return Nothing
        End Try
    End Function

    Private Function ExtractInt(json As String, field As String) As Integer
        Dim pattern = """" & field & """:"
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return 0
        Dim start = idx + pattern.Length
        Dim endIdx = start
        While endIdx < json.Length AndAlso Char.IsDigit(json(endIdx))
            endIdx += 1
        End While
        If endIdx <= start Then Return 0
        Dim val As Integer
        Integer.TryParse(json.Substring(start, endIdx - start), val)
        Return val
    End Function

    Private Function ExtractString(json As String, field As String) As String
        Dim pattern = """" & field & """:"""
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return Nothing
        Dim start = idx + pattern.Length
        Dim [end] = json.IndexOf(""""c, start)
        If [end] <= start Then Return Nothing
        Return json.Substring(start, [end] - start)
    End Function

    Public Class CommandInfo
        Public Property Id As Integer
        Public Property DoorId As Integer
        Public Property CommandType As String
        Public Property Parameters As String
    End Class
End Class
