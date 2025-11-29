#Requires AutoHotkey v2.0
#SingleInstance Force
#NoTrayIcon
Persistent

; Ethaniko Keybinder - Auto-generated script
; Do not edit manually - changes will be overwritten

; Store the script path for auto-reload
global ScriptPath := A_ScriptFullPath
global ConfigModTime := FileGetTime("C:\\Users\\AHMED ADEEL\\Desktop\\ethaniko keybinder\\keybinds.txt", "M")

; Check for config changes every 2 seconds
SetTimer(CheckConfigUpdate, 2000)

CheckConfigUpdate() {
    global ConfigModTime
    try {
        currentModTime := FileGetTime("C:\\Users\\AHMED ADEEL\\Desktop\\ethaniko keybinder\\keybinds.txt", "M")
        if (currentModTime != ConfigModTime) {
            Reload
        }
    }
}

; Send message to SA-MP
SendToSAMP(message, delay := 0) {
    if (delay > 0) {
        Sleep(delay)
    }
    
    ; Try to find SA-MP window
    sampWindow := WinExist("ahk_class Grand theft auto San Andreas")
    if (!sampWindow) {
        sampWindow := WinExist("GTA:SA:MP")
    }
    
    if (sampWindow) {
        ; Focus the window briefly
        WinActivate
        Sleep(50)
    }
    
    ; Send the message
    Send("{Enter}")
    Sleep(30)
    Send(message)
    Sleep(30)
    Send("{Enter}")
}

; Keybind definitions

; Keybind 1: Numpad3 -> hello...
Numpad3:: {
    SendToSAMP("hello", 0)
}

; Exit hotkey (Ctrl+Shift+Alt+E)
^+!e:: {
    ExitApp
}
