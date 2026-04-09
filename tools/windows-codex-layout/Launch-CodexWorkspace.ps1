param(
    [ValidateSet("3", "4")]
    [string]$Mode = "3",
    [string]$RepoPath = "D:\科研\LVLM\LVLM",
    [string]$MainBranch = "main",
    [string]$AgentCommand = "codex",
    [switch]$EnsureWorktrees,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Ensure-Worktree {
    param(
        [string]$Path,
        [string]$Branch
    )

    if (Test-Path -LiteralPath $Path) {
        return
    }

    $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path)
    git -C $RepoPath worktree add -b $Branch $Path $MainBranch | Out-Null
}

function Build-Commandline {
    param([string]$WorkingDir)
    $escapedDir = $WorkingDir.Replace("'", "''")
    $escapedCmd = $AgentCommand.Replace("'", "''")
    return "Set-Location -LiteralPath '$escapedDir'; $escapedCmd"
}

$repoName = Split-Path -Leaf $RepoPath
$parent = Split-Path -Parent $RepoPath

$mainDir = $RepoPath
$aDir = Join-Path $parent "$repoName-wt-a"
$bDir = Join-Path $parent "$repoName-wt-b"
$cDir = Join-Path $parent "$repoName-wt-c"

if ($EnsureWorktrees) {
    Ensure-Worktree -Path $aDir -Branch "$MainBranch-codex-a"
    Ensure-Worktree -Path $bDir -Branch "$MainBranch-codex-b"
    if ($Mode -eq "4") {
        Ensure-Worktree -Path $cDir -Branch "$MainBranch-codex-c"
    }
}

if (-not (Test-Path -LiteralPath $aDir)) { $aDir = $mainDir }
if (-not (Test-Path -LiteralPath $bDir)) { $bDir = $mainDir }
if ($Mode -eq "4" -and -not (Test-Path -LiteralPath $cDir)) { $cDir = $mainDir }

$mainCmd = Build-Commandline -WorkingDir $mainDir
$aCmd = Build-Commandline -WorkingDir $aDir
$bCmd = Build-Commandline -WorkingDir $bDir

$args = @(
    "new-tab", "-d", $mainDir, "powershell", "-NoExit", "-Command", $mainCmd,
    ";", "split-pane", "-V", "--size", "0.34", "-d", $aDir, "powershell", "-NoExit", "-Command", $aCmd,
    ";", "move-focus", "right",
    ";", "split-pane", "-H", "--size", "0.5", "-d", $bDir, "powershell", "-NoExit", "-Command", $bCmd
)

if ($Mode -eq "4") {
    $cCmd = Build-Commandline -WorkingDir $cDir
    $args += @(";", "new-tab", "-d", $cDir, "powershell", "-NoExit", "-Command", $cCmd)
}

if ($DryRun) {
    $args -join " "
    return
}

Start-Process -FilePath "wt.exe" -ArgumentList $args | Out-Null
