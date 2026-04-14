param(
  [Parameter(Mandatory = $true)]
  [string]$TargetRepoPath
)

$ErrorActionPreference = "Stop"

$targetRoot = (Resolve-Path -Path $TargetRepoPath).Path
$targetDocs = Join-Path $targetRoot "docs"
$targetManifest = Join-Path $targetDocs "SEED_MANIFEST.md"
$sourceManifest = Join-Path $PSScriptRoot "..\docs\SEED_MANIFEST.md"
$sourceManifest = (Resolve-Path -Path $sourceManifest).Path

if (-not (Test-Path $targetDocs)) {
  New-Item -Path $targetDocs -ItemType Directory | Out-Null
}

if (-not (Test-Path $targetManifest)) {
  Copy-Item -Path $sourceManifest -Destination $targetManifest
  Write-Output ("Created: " + $targetManifest)
} else {
  Write-Output ("Skipped (already exists): " + $targetManifest)
}

