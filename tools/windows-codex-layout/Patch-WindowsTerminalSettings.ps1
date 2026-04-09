param(
    [string]$SettingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SettingsPath)) {
    throw "Windows Terminal settings.json not found: $SettingsPath"
}

$backupPath = "$SettingsPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $SettingsPath -Destination $backupPath -Force

$json = Get-Content -Raw -LiteralPath $SettingsPath | ConvertFrom-Json

if (-not $json.keybindings) {
    $json | Add-Member -NotePropertyName keybindings -NotePropertyValue @()
}

$newBindings = @(
    @{ keys = "alt+h"; command = @{ action = "moveFocus"; direction = "left" } },
    @{ keys = "alt+l"; command = @{ action = "moveFocus"; direction = "right" } },
    @{ keys = "alt+k"; command = @{ action = "moveFocus"; direction = "up" } },
    @{ keys = "alt+j"; command = @{ action = "moveFocus"; direction = "down" } },
    @{ keys = "alt+shift+h"; command = @{ action = "resizePane"; direction = "left" } },
    @{ keys = "alt+shift+l"; command = @{ action = "resizePane"; direction = "right" } },
    @{ keys = "alt+shift+k"; command = @{ action = "resizePane"; direction = "up" } },
    @{ keys = "alt+shift+j"; command = @{ action = "resizePane"; direction = "down" } },
    @{ keys = "ctrl+alt+n"; command = "nextTab" },
    @{ keys = "ctrl+alt+p"; command = "prevTab" },
    @{ keys = "ctrl+alt+1"; command = @{ action = "switchToTab"; index = 0 } },
    @{ keys = "ctrl+alt+2"; command = @{ action = "switchToTab"; index = 1 } },
    @{ keys = "ctrl+alt+3"; command = @{ action = "switchToTab"; index = 2 } }
)

$existing = @($json.keybindings)
$filtered = foreach ($item in $existing) {
    $k = $item.keys
    if ($newBindings.keys -contains $k) { continue }
    $item
}

$json.keybindings = @($filtered + $newBindings)
$json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $SettingsPath -Encoding UTF8

Write-Output "Patched: $SettingsPath"
Write-Output "Backup:  $backupPath"

