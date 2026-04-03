[CmdletBinding()]
param(
    [string]$OriginUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Write-Host ("`n> git " + ($Arguments -join ' ')) -ForegroundColor Cyan
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git command failed: git $($Arguments -join ' ')"
    }
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & git @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "git command failed: git $($Arguments -join ' ')"
    }

    return ($output | Out-String).Trim()
}

function Test-RemoteExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $remotes = & git remote
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read git remotes."
    }

    return $Name -in $remotes
}

function Normalize-OriginUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return $Url
    }

    $trimmed = $Url.Trim()
    if ($trimmed -match '^https://github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/tree/[^/?#]+)?/?$') {
        return "https://github.com/$($Matches[1])/$($Matches[2]).git"
    }

    return $trimmed
}

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) {
    $repoRoot = Get-GitOutput -Arguments @('rev-parse', '--show-toplevel')
}

Set-Location -LiteralPath $repoRoot

if ([string]::IsNullOrWhiteSpace($OriginUrl)) {
    if (-not (Test-RemoteExists -Name 'origin')) {
        throw "Remote 'origin' was not found. Pass -OriginUrl to configure your repository."
    }
}
else {
    $OriginUrl = Normalize-OriginUrl -Url $OriginUrl

    if (Test-RemoteExists -Name 'origin') {
        $currentOrigin = Get-GitOutput -Arguments @('remote', 'get-url', 'origin')
        if ($currentOrigin -ne $OriginUrl) {
            Invoke-Git -Arguments @('remote', 'set-url', 'origin', $OriginUrl)
        }
    }
    else {
        Invoke-Git -Arguments @('remote', 'add', 'origin', $OriginUrl)
    }
}

$syncAlias = @'
!powershell -NoProfile -ExecutionPolicy Bypass -Command '& { $repo = (git rev-parse --show-toplevel).Trim(); & (Join-Path $repo tools/git_sync_project.ps1) -PullOnly }'
'@.Trim()

& git config --get alias.sync-research *> $null
if ($LASTEXITCODE -eq 0) {
    Invoke-Git -Arguments @('config', '--unset-all', 'alias.sync-research')
}
elseif ($LASTEXITCODE -gt 1) {
    throw "git command failed: git config --get alias.sync-research"
}

Invoke-Git -Arguments @('config', 'alias.sync-project', $syncAlias)
Invoke-Git -Arguments @('config', 'pull.rebase', 'true')
Invoke-Git -Arguments @('config', 'fetch.prune', 'true')

Write-Host "`nCurrent remotes:" -ForegroundColor Green
Invoke-Git -Arguments @('remote', '-v')

Write-Host "`nDual-machine sync setup is complete." -ForegroundColor Green
Write-Host "Before you start working: git sync-project" -ForegroundColor Green
Write-Host "When you finish: .\tools\git_sync_project.ps1 -CommitMessage `"checkpoint: current work`"" -ForegroundColor Green
