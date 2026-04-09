#Requires AutoHotkey v2.0
#SingleInstance Force

SetWinDelay -1

GetWorkArea() {
    MonitorGetWorkArea(1, &left, &top, &right, &bottom)
    return { L: left, T: top, R: right, B: bottom, W: right - left, H: bottom - top }
}

; Win+Alt+1: left large window (about 66%)
#!1::{
    a := GetWorkArea()
    w := Round(a.W * 0.66)
    WinMove a.L, a.T, w, a.H, "A"
}

; Win+Alt+2: right upper window
#!2::{
    a := GetWorkArea()
    x := a.L + Round(a.W * 0.66)
    w := a.W - Round(a.W * 0.66)
    h := Round(a.H * 0.5)
    WinMove x, a.T, w, h, "A"
}

; Win+Alt+3: right lower window
#!3::{
    a := GetWorkArea()
    x := a.L + Round(a.W * 0.66)
    y := a.T + Round(a.H * 0.5)
    w := a.W - Round(a.W * 0.66)
    h := a.H - Round(a.H * 0.5)
    WinMove x, y, w, h, "A"
}

; Win+Alt+Q: activate the most recent Windows Terminal window
#!q::{
    if WinExist("ahk_exe WindowsTerminal.exe") {
        WinActivate
    }
}

