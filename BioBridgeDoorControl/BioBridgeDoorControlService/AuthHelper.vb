Imports System.Security.Claims
Imports System.Text
Imports System.Configuration
Imports System.Security.Cryptography
Imports System.Collections.Generic

Public Class AuthHelper
    Private ReadOnly _secret As String
    Private ReadOnly _expiryHours As Integer

    Public Sub New()
        _secret = ConfigurationManager.AppSettings("JWT_SECRET")
        If String.IsNullOrEmpty(_secret) Then
            _secret = "CHANGE_THIS_SECRET_TO_LONG_RANDOM"
        End If

        Dim expStr As String = ConfigurationManager.AppSettings("JWT_EXPIRATION_HOURS")
        Dim hours As Integer
        If Not Integer.TryParse(expStr, hours) OrElse hours <= 0 Then
            hours = 24
        End If
        _expiryHours = hours
    End Sub

    Private Function Base64UrlEncode(bytes As Byte()) As String
        Dim s = Convert.ToBase64String(bytes)
        s = s.Replace("+", "-").Replace("/", "_").TrimEnd("="c)
        Return s
    End Function

    Private Function Base64UrlDecode(input As String) As Byte()
        Dim s = input.Replace("-", "+").Replace("_", "/")
        Select Case s.Length Mod 4
            Case 2 : s &= "=="
            Case 3 : s &= "="
        End Select
        Return Convert.FromBase64String(s)
    End Function

    Public Function GenerateToken(userId As Integer, enterpriseId As Integer, email As String, isAdmin As Boolean) As String
        Dim headerJson = "{""alg"":""HS256"",""typ"":""JWT""}"
        Dim exp = DateTimeOffset.UtcNow.AddHours(_expiryHours).ToUnixTimeSeconds()
        Dim payloadJson = "{""sub"":""" & userId & """,""enterpriseId"":" & enterpriseId & ",""email"":""" & email & """,""isAdmin"":""" & If(isAdmin, "true", "false") & """,""exp"":" & exp & "}"

        Dim headerBytes = Encoding.UTF8.GetBytes(headerJson)
        Dim payloadBytes = Encoding.UTF8.GetBytes(payloadJson)

        Dim headerPart = Base64UrlEncode(headerBytes)
        Dim payloadPart = Base64UrlEncode(payloadBytes)
        Dim unsignedToken = headerPart & "." & payloadPart

        Dim key = Encoding.UTF8.GetBytes(_secret)
        Dim signatureBytes As Byte()
        Using hmac As New HMACSHA256(key)
            signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken))
        End Using

        Dim signaturePart = Base64UrlEncode(signatureBytes)
        Return unsignedToken & "." & signaturePart
    End Function

    Public Function ValidateToken(token As String) As ClaimsPrincipal
        Dim parts = token.Split("."c)
        If parts.Length <> 3 Then
            Throw New Exception("Invalid token format")
        End If

        Dim headerPart = parts(0)
        Dim payloadPart = parts(1)
        Dim signaturePart = parts(2)

        Dim unsignedToken = headerPart & "." & payloadPart
        Dim key = Encoding.UTF8.GetBytes(_secret)
        Dim expectedSig As Byte()
        Using hmac As New HMACSHA256(key)
            expectedSig = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken))
        End Using
        Dim expectedSigPart = Base64UrlEncode(expectedSig)

        If Not String.Equals(expectedSigPart, signaturePart, StringComparison.Ordinal) Then
            Throw New Exception("Invalid token signature")
        End If

        Dim payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(payloadPart))

        Dim userIdStr = ExtractJsonString(payloadJson, "sub")
        If String.IsNullOrEmpty(userIdStr) Then
            Throw New Exception("Missing 'sub' claim")
        End If
        Dim userId = Integer.Parse(userIdStr)
        
        Dim enterpriseIdStr = ExtractJsonNumber(payloadJson, "enterpriseId")
        If String.IsNullOrEmpty(enterpriseIdStr) Then
            Throw New Exception("Missing 'enterpriseId' claim")
        End If
        Dim enterpriseId = Integer.Parse(enterpriseIdStr)
        
        Dim email = ExtractJsonString(payloadJson, "email")
        Dim isAdmin = (ExtractJsonString(payloadJson, "isAdmin") = "true")
        Dim expStr = ExtractJsonNumber(payloadJson, "exp")
        If String.IsNullOrEmpty(expStr) Then
            Throw New Exception("Missing 'exp' claim")
        End If
        Dim expUnix As Long = Long.Parse(expStr)
        Dim expTime = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime
        If expTime < DateTime.UtcNow Then
            Throw New Exception("Token expired")
        End If

        Dim claims As New List(Of Claim) From {
            New Claim("sub", userId.ToString()),
            New Claim("enterpriseId", enterpriseId.ToString()),
            New Claim("email", email),
            New Claim("isAdmin", If(isAdmin, "true", "false"))
        }
        Dim identity As New ClaimsIdentity(claims, "jwt")
        Return New ClaimsPrincipal(identity)
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

    Private Function ExtractJsonNumber(json As String, field As String) As String
        Dim pattern = """" & field & """:"
        Dim idx = json.IndexOf(pattern)
        If idx = -1 Then Return Nothing
        Dim start = idx + pattern.Length
        Dim endIdx = start
        While endIdx < json.Length AndAlso Char.IsDigit(json(endIdx))
            endIdx += 1
        End While
        Return json.Substring(start, endIdx - start)
    End Function
End Class

