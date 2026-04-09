# Codex Multi-Pane Workspace (Windows)

## One-shot setup

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\windows-codex-layout\Setup-CodexWorkspace.ps1 -InstallPackages
```

This script:

- repairs `winget` source package if missing
- tries to install `PowerToys` and `AutoHotkey` (3 retries each)
- patches Windows Terminal keybindings
- installs FancyZones custom layout template
- puts `CodexLayout.ahk` into Startup

## Launch layouts

```powershell
# left large + right top/bottom
powershell -ExecutionPolicy Bypass -File .\tools\windows-codex-layout\Launch-CodexWorkspace.ps1 -Mode 3

# same as above + one extra tab for the 4th Codex
powershell -ExecutionPolicy Bypass -File .\tools\windows-codex-layout\Launch-CodexWorkspace.ps1 -Mode 4
```

Optional:

```powershell
# create git worktrees first
powershell -ExecutionPolicy Bypass -File .\tools\windows-codex-layout\Launch-CodexWorkspace.ps1 -Mode 4 -EnsureWorktrees
```

## Terminal shortcuts

- `Alt+H/J/K/L`: focus pane left/down/up/right
- `Alt+Shift+H/J/K/L`: resize pane
- `Ctrl+Alt+N` / `Ctrl+Alt+P`: next/previous tab
- `Ctrl+Alt+1/2/3`: switch tab index

## AutoHotkey shortcuts

- `Win+Alt+1`: left large
- `Win+Alt+2`: right top
- `Win+Alt+3`: right bottom
- `Win+Alt+Q`: activate Windows Terminal

