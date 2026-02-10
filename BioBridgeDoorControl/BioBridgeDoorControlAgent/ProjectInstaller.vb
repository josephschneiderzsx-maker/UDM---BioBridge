Imports System.ComponentModel
Imports System.Configuration.Install
Imports System.ServiceProcess

<RunInstaller(True)> _
Public Class ProjectInstaller
    Inherits System.Configuration.Install.Installer

    Private serviceInstaller As System.ServiceProcess.ServiceInstaller
    Private processInstaller As System.ServiceProcess.ServiceProcessInstaller

    Public Sub New()
        MyBase.New()
        InitializeComponent()
    End Sub

    Private Sub InitializeComponent()
        serviceInstaller = New System.ServiceProcess.ServiceInstaller()
        processInstaller = New System.ServiceProcess.ServiceProcessInstaller()

        processInstaller.Account = System.ServiceProcess.ServiceAccount.LocalSystem

        serviceInstaller.ServiceName = "UDM-Agent"
        serviceInstaller.DisplayName = "UDM Agent - URZIS Door Monitoring Agent"
        serviceInstaller.Description = "Agent local pour le contrôle des portes BioBridge via le serveur central UDM"
        serviceInstaller.StartType = System.ServiceProcess.ServiceStartMode.Automatic

        Installers.Add(serviceInstaller)
        Installers.Add(processInstaller)
    End Sub
End Class
