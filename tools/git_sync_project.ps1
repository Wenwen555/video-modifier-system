[CmdletBinding()]
param(
    [string]$CommitMessage,
    [switch]$PullOnly
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

function Test-WorkingTreeDirty {
    $status = & git status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read working tree status."
    }

    return -not [string]::IsNullOrWhiteSpace(($status | Out-String).Trim())
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

function Test-RemoteBranchExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Remote,

        [Parameter(Mandatory = $true)]
        [string]$Branch
    )

    & git ls-remote --exit-code --heads $Remote $Branch *> $null
    return $LASTEXITCODE -eq 0
}

function Test-HasStagedChanges {
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        return $false
    }

    if ($LASTEXITCODE -eq 1) {
        return $true
    }

    throw "Unable to detect staged changes."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) {
    $repoRoot = Get-GitOutput -Arguments @('rev-parse', '--show-toplevel')
}

Set-Location -LiteralPath $repoRoot

$branch = Get-GitOutput -Arguments @('branch', '--show-current')
if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Detached HEAD detected. Switch back to a real branch before syncing."
}

if (-not (Test-RemoteExists -Name 'origin')) {
    throw "Remote 'origin' was not found. Configure your repository as origin first."
}

Write-Host "Repository: $repoRoot" -ForegroundColor DarkGray
Write-Host "Branch: $branch" -ForegroundColor DarkGray

$remoteBranchExists = Test-RemoteBranchExists -Remote 'origin' -Branch $branch

if ($PullOnly) {
    if (Test-WorkingTreeDirty) {
        throw "Working tree is not clean. Commit or stash your changes before running git sync-project."
    }

    if ($remoteBranchExists) {
        Invoke-Git -Arguments @('fetch', 'origin', $branch)
        Invoke-Git -Arguments @('pull', '--rebase', 'origin', $branch)
        Write-Host "`nPull-only sync completed. You can start working now." -ForegroundColor Green
    }
    else {
        Invoke-Git -Arguments @('fetch', 'origin')
        Write-Host "`norigin/$branch does not exist yet, so there is nothing to pull." -ForegroundColor Yellow
    }

    return
}

Invoke-Git -Arguments @('add', '-A')

if (Test-HasStagedChanges) {
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = "checkpoint: auto sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    Invoke-Git -Arguments @('commit', '-m', $CommitMessage)
}
else {
    Write-Host "`nNo local changes detected, skipping commit." -ForegroundColor Yellow
}

if ($remoteBranchExists) {
    Invoke-Git -Arguments @('fetch', 'origin', $branch)
    Invoke-Git -Arguments @('pull', '--rebase', 'origin', $branch)
    Invoke-Git -Arguments @('push', 'origin', $branch)
}
else {
    Invoke-Git -Arguments @('fetch', 'origin')
    Invoke-Git -Arguments @('push', '-u', 'origin', $branch)
}

Write-Host "`nSync completed and remote branch is up to date." -ForegroundColor Green
