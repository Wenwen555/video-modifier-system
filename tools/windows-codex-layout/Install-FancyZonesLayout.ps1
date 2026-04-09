param(
    [string]$TemplatePath = "$PSScriptRoot\FancyZones-CodexLayout.json",
    [string]$FancyZonesDir = "$env:LOCALAPPDATA\Microsoft\PowerToys\FancyZones"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $TemplatePath)) {
    throw "Template not found: $TemplatePath"
}

New-Item -ItemType Directory -Force -Path $FancyZonesDir | Out-Null
$target = Join-Path $FancyZonesDir "custom-layouts.json"

if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination "$target.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
}

Copy-Item -LiteralPath $TemplatePath -Destination $target -Force
Write-Output "Installed FancyZones custom layout: $target"

