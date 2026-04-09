param(
    [string]$RepoPath = "D:\科研\LVLM\LVLM",
    [switch]$InstallPackages
)

$ErrorActionPreference = "Stop"

function Ensure-WingetSourcePackage {
    $installed = Get-AppxPackage Microsoft.Winget.Source* -ErrorAction SilentlyContinue
    if ($installed) {
        return
    }

    $pkg = Join-Path $env:TEMP "Microsoft.Winget.Source_8wekyb3d8bbwe.msix"
    Invoke-WebRequest -Uri "https://cdn.winget.microsoft.com/cache/source2.msix" -OutFile $pkg
    Add-AppxPackage -Path $pkg
}

function Install-WithWinget {
    param([string]$Id)
    $attempt = 1
    $maxAttempts = 3
    while ($attempt -le $maxAttempts) {
        try {
            winget install --source winget --id $Id -e --accept-source-agreements --accept-package-agreements --disable-interactivity
            return $true
        }
        catch {
            if ($attempt -ge $maxAttempts) {
                Write-Warning "$Id install failed after $maxAttempts attempts: $($_.Exception.Message)"
                return $false
            }
            Start-Sleep -Seconds (5 * $attempt)
            $attempt++
        }
    }
}

Ensure-WingetSourcePackage

if ($InstallPackages) {
    $null = Install-WithWinget -Id "Microsoft.PowerToys"
    $null = Install-WithWinget -Id "AutoHotkey.AutoHotkey"
}

& "$PSScriptRoot\Patch-WindowsTerminalSettings.ps1"
& "$PSScriptRoot\Install-FancyZonesLayout.ps1"

$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
$ahkTarget = Join-Path $startupDir "CodexLayout.ahk"
Copy-Item -LiteralPath "$PSScriptRoot\CodexLayout.ahk" -Destination $ahkTarget -Force

Write-Output "Setup done."
Write-Output "Run 3 panes: powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\Launch-CodexWorkspace.ps1`" -Mode 3"
Write-Output "Run 4 panes: powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\Launch-CodexWorkspace.ps1`" -Mode 4"
Write-Output "AHK startup:  $ahkTarget"
Write-Output "Repo path:    $RepoPath"
