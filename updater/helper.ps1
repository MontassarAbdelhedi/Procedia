param(
  [Parameter(Mandatory = $true)][ValidateSet('prepare', 'install', 'rollback')][string]$Mode,
  [string]$Archive,
  [string]$Staging,
  [string]$ExpectedId,
  [string]$ExpectedVersion,
  [string]$Plan
)

$ErrorActionPreference = 'Stop'

function Write-JsonAtomic([string]$Path, [object]$Value) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
  $temp = $Path + '.tmp'
  $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temp -Encoding UTF8
  Move-Item -LiteralPath $temp -Destination $Path -Force
}

function Assert-Package([string]$Root, [string]$Id, [string]$Version) {
  $manifestPath = Join-Path $Root 'CSXS\manifest.xml'
  $entryPath = Join-Path $Root 'index.html'
  $required = @('data\scripts.json', 'bridge\evalBridge.js', 'jsx\dispatcher\dispatcher.jsx', 'updater\helper.ps1')
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'The package manifest is missing.' }
  if (-not (Test-Path -LiteralPath $entryPath -PathType Leaf)) { throw 'The application entry file is missing.' }
  foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $Root $relative) -PathType Leaf)) { throw "Required runtime file is missing: $relative" }
  }
  [xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
  $manifestId = [string]$manifest.ExtensionManifest.ExtensionBundleId
  $manifestVersion = [string]$manifest.ExtensionManifest.ExtensionBundleVersion
  $extensionId = [string]$manifest.ExtensionManifest.ExtensionList.Extension.Id
  $extensionVersion = [string]$manifest.ExtensionManifest.ExtensionList.Extension.Version
  if ($manifestId -ne $Id -or $extensionId -ne $Id) { throw 'The package extension ID does not match Procedia.' }
  if ($manifestVersion -ne $Version -or $extensionVersion -ne $Version) { throw 'The package version does not match the release metadata.' }
}

function Expand-SafeArchive([string]$ZipPath, [string]$Destination) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Recurse -Force }
  New-Item -ItemType Directory -Path $Destination | Out-Null
  $root = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
  $archiveObject = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    foreach ($entry in $archiveObject.Entries) {
      $name = $entry.FullName.Replace('/', '\')
      if ([System.IO.Path]::IsPathRooted($name)) { throw 'The archive contains an absolute path.' }
      $parts = $name.Split('\')
      if ($parts -contains '..') { throw 'The archive contains a parent-relative path.' }
      $unixType = (($entry.ExternalAttributes -shr 16) -band 0xF000)
      if ($unixType -eq 0xA000) { throw 'The archive contains an unsupported symbolic link.' }
      $target = [System.IO.Path]::GetFullPath((Join-Path $Destination $name))
      if (-not $target.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'The archive path escapes the staging directory.' }
      if ([string]::IsNullOrEmpty($entry.Name)) {
        if (-not (Test-Path -LiteralPath $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
        continue
      }
      $parent = Split-Path -Parent $target
      if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
      $input = $entry.Open()
      $output = [System.IO.File]::Open($target, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
    }
  } finally {
    $archiveObject.Dispose()
  }
}

function Copy-Uninstaller([string]$Source, [string]$Destination) {
  Get-ChildItem -LiteralPath $Source -File | Where-Object { $_.Name -like 'unins*.exe' -or $_.Name -like 'unins*.dat' -or $_.Name -like 'unins*.msg' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Force
  }
}

function Wait-ProcediaHost([int]$ProcessId) {
  while ((Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) -or (Get-Process -Name 'AfterFX' -ErrorAction SilentlyContinue)) {
    Start-Sleep -Seconds 1
  }
}

if ($Mode -eq 'prepare') {
  try {
    if (-not (Test-Path -LiteralPath $Archive -PathType Leaf)) { throw 'The downloaded archive was not found.' }
    Expand-SafeArchive $Archive $Staging
    Assert-Package $Staging $ExpectedId $ExpectedVersion
    @{ ok = $true; staging = $Staging } | ConvertTo-Json -Compress
    exit 0
  } catch {
    if ($Staging -and (Test-Path -LiteralPath $Staging)) { Remove-Item -LiteralPath $Staging -Recurse -Force -ErrorAction SilentlyContinue }
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
  }
}

$installPlan = Get-Content -LiteralPath $Plan -Raw | ConvertFrom-Json
$lockPath = $installPlan.target + '.update-lock'
try {
  $lockStream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch {
  Write-JsonAtomic $installPlan.resultFile @{ ok = $false; error = 'Another Procedia update operation is already running.'; failedAt = (Get-Date).ToUniversalTime().ToString('o') }
  exit 1
}

if ($Mode -eq 'rollback') {
  try {
    Wait-ProcediaHost ([int]$installPlan.waitPid)
    if (Test-Path -LiteralPath $installPlan.backup) {
      $current = $installPlan.target + '.rollback-current'
      if (Test-Path -LiteralPath $current) { Remove-Item -LiteralPath $current -Recurse -Force }
      if (Test-Path -LiteralPath $installPlan.target) { Move-Item -LiteralPath $installPlan.target -Destination $current }
      try {
        Move-Item -LiteralPath $installPlan.backup -Destination $installPlan.target
        if (-not (Test-Path -LiteralPath (Join-Path $installPlan.target 'CSXS\manifest.xml'))) { throw 'The previous installation is invalid.' }
        if (Test-Path -LiteralPath $current) { Remove-Item -LiteralPath $current -Recurse -Force }
      } catch {
        if (Test-Path -LiteralPath $installPlan.target) { Remove-Item -LiteralPath $installPlan.target -Recurse -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $current) { Move-Item -LiteralPath $current -Destination $installPlan.target }
        throw
      }
    }
  } finally {
    $lockStream.Dispose()
    Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
  }
  exit 0
}

Wait-ProcediaHost ([int]$installPlan.waitPid)

try {
  if (Test-Path -LiteralPath $installPlan.backup) { Remove-Item -LiteralPath $installPlan.backup -Recurse -Force }
  Move-Item -LiteralPath $installPlan.target -Destination $installPlan.backup
  try {
    Move-Item -LiteralPath $installPlan.staging -Destination $installPlan.target
    Copy-Uninstaller $installPlan.backup $installPlan.target
    Assert-Package $installPlan.target $installPlan.expectedId $installPlan.expectedVersion
    Write-JsonAtomic $installPlan.resultFile @{ ok = $true; version = $installPlan.expectedVersion; installedAt = (Get-Date).ToUniversalTime().ToString('o') }
  } catch {
    if (Test-Path -LiteralPath $installPlan.target) { Remove-Item -LiteralPath $installPlan.target -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $installPlan.backup) { Move-Item -LiteralPath $installPlan.backup -Destination $installPlan.target }
    throw
  }
} catch {
  Write-JsonAtomic $installPlan.resultFile @{ ok = $false; error = $_.Exception.Message; failedAt = (Get-Date).ToUniversalTime().ToString('o') }
  $lockStream.Dispose()
  Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
  exit 1
}

$lockStream.Dispose()
Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
exit 0
