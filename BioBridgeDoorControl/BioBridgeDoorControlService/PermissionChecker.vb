Imports System.Security.Claims
Imports MySql.Data.MySqlClient

Public Class PermissionChecker
    Private ReadOnly _db As DatabaseHelper

    Public Sub New(db As DatabaseHelper)
        _db = db
    End Sub

    Public Function HasDoorPermission(userId As Integer, doorId As Integer, permission As String, isAdmin As Boolean) As Boolean
        If isAdmin Then
            Return True
        End If

        Dim column As String
        Select Case permission.ToLower()
            Case "open"
                column = "can_open"
            Case "close"
                column = "can_close"
            Case "status"
                column = "can_view_status"
            Case Else
                Return False
        End Select

        Using conn = _db.GetConnection()
            Dim sql = $"SELECT {column} FROM user_door_permissions WHERE user_id = @uid AND door_id = @did"
            Using cmd = New MySqlCommand(sql, conn)
                cmd.Parameters.AddWithValue("@uid", userId)
                cmd.Parameters.AddWithValue("@did", doorId)
                Dim obj = cmd.ExecuteScalar()
                If obj Is Nothing OrElse obj Is DBNull.Value Then
                    Return False
                End If
                Return CInt(obj) = 1
            End Using
        End Using
    End Function

    Public Shared Function GetUserIdFromClaims(principal As ClaimsPrincipal) As Integer
        Dim subClaim = principal.FindFirst("sub")
        Return Integer.Parse(subClaim.Value)
    End Function

    Public Shared Function GetEnterpriseIdFromClaims(principal As ClaimsPrincipal) As Integer
        Dim claim = principal.FindFirst("enterpriseId")
        Return Integer.Parse(claim.Value)
    End Function

    Public Shared Function IsAdminFromClaims(principal As ClaimsPrincipal) As Boolean
        Dim claim = principal.FindFirst("isAdmin")
        Return claim IsNot Nothing AndAlso claim.Value = "true"
    End Function

    Public Shared Function GetEmailFromClaims(principal As ClaimsPrincipal) As String
        Dim claim = principal.FindFirst("email")
        If claim IsNot Nothing Then Return claim.Value
        Return Nothing
    End Function
End Class


