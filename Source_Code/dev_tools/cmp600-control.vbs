' Launch CMP600 Control GUI with no console window
Option Explicit
Dim shell, fso, dir, psCmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
psCmd = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\cmp600-control.ps1"""
shell.Run psCmd, 0, False
