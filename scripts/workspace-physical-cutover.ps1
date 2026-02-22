param(
  [switch]$WhatIfMode
)

$ErrorActionPreference = 'Stop'

$reposBase = 'C:\Users\loofi\Documents\Dev\repos\loofi'
$mappings = @(
  @{ Name='veo-prompt-generator'; Old='C:\Users\loofi\Documents\Loofi VEO\Loofi-Veo-prompt-generator'; New=Join-Path $reposBase 'veo-prompt-generator' },
  @{ Name='fedora-tweaks'; Old='C:\Users\loofi\Documents\Loofi Fedora 43\loofi-fedora-tweaks'; New=Join-Path $reposBase 'fedora-tweaks' },
  @{ Name='plasma-ai-usage-monitor'; Old='C:\Users\loofi\Documents\Loofi Projects\plasma-ai-usage-monitor'; New=Join-Path $reposBase 'plasma-ai-usage-monitor' },
  @{ Name='suno-ai-generator'; Old='C:\Users\loofi\Documents\Loofi Projects\Loofi-Suno-AI-Generator'; New=Join-Path $reposBase 'suno-ai-generator' },
  @{ Name='loofilearn'; Old='C:\Users\loofi\Documents\Loofi Projects\LoofiLearn'; New=Join-Path $reposBase 'loofilearn' }
)

function Invoke-Cutover {
  param(
    [string]$Name,
    [string]$Old,
    [string]$New,
    [bool]$WhatIf
  )

  if (-not (Test-Path $Old)) {
    throw "[$Name] Old path missing: $Old"
  }
  if (-not (Test-Path $New)) {
    throw "[$Name] New path missing: $New"
  }

  $newItem = Get-Item $New -Force
  $isJunction = $newItem.Attributes.ToString().Contains('ReparsePoint')
  $hasGit = Test-Path (Join-Path $New '.git')

  # Already a physical repo at the target — nothing to do
  if ((-not $isJunction) -and $hasGit) {
    Write-Output "[$Name] already physically located at target; skipping"
    return
  }

  # Stub directory (physical dir without .git) — save contents to merge after move
  $stubTmp = $null
  if ((-not $isJunction) -and (-not $hasGit)) {
    $stubItems = Get-ChildItem -Path $New -Force -ErrorAction SilentlyContinue
    if ($stubItems) {
      $stubTmp = Join-Path $env:TEMP "cutover-stub-$Name"
      if (Test-Path $stubTmp) { Remove-Item $stubTmp -Recurse -Force }
      New-Item -ItemType Directory -Path $stubTmp -Force | Out-Null
      foreach ($si in $stubItems) {
        Copy-Item -Path $si.FullName -Destination $stubTmp -Recurse -Force
      }
      Write-Output "[$Name] saved stub contents ($($stubItems.Count) items) for merge"
    }
  }

  if ($WhatIf) {
    $desc = if ($isJunction) { "junction" } else { "stub dir" }
    Write-Output "[WHATIF][$Name] remove $desc $New; move $Old -> $New; create junction $Old -> $New"
    if ($stubTmp) { Remove-Item $stubTmp -Recurse -Force -ErrorAction SilentlyContinue }
    return
  }

  Remove-Item -Path $New -Recurse -Force -Confirm:$false

  try {
    Move-Item -Path $Old -Destination $New -ErrorAction Stop
  }
  catch {
    if (-not (Test-Path $New)) {
      New-Item -ItemType Junction -Path $New -Target $Old | Out-Null
    }
    throw "[$Name] move failed (likely lock): $($_.Exception.Message)"
  }

  # Merge saved stub contents back into the moved repo
  if ($stubTmp -and (Test-Path $stubTmp)) {
    foreach ($si in (Get-ChildItem $stubTmp -Force)) {
      $dest = Join-Path $New $si.Name
      if (-not (Test-Path $dest)) {
        Copy-Item -Path $si.FullName -Destination $dest -Recurse -Force
      }
    }
    Remove-Item $stubTmp -Recurse -Force -ErrorAction SilentlyContinue
    Write-Output "[$Name] merged stub contents"
  }

  New-Item -ItemType Junction -Path $Old -Target $New | Out-Null
  Write-Output "[$Name] cutover complete"
}

Write-Output '=== Workspace physical cutover (old -> new) ==='
if ($WhatIfMode) {
  Write-Output 'Running in WHATIF mode only (no changes).'
}

foreach ($m in $mappings) {
  try {
    Invoke-Cutover -Name $m.Name -Old $m.Old -New $m.New -WhatIf:$WhatIfMode.IsPresent
  }
  catch {
    Write-Output $_.Exception.Message
  }
}

Write-Output ''
Write-Output '=== Final Dev repo hub status ==='
Get-ChildItem -Force $reposBase |
  Select-Object Name, LinkType, Target, Attributes |
  Format-Table -AutoSize |
  Out-String |
  Write-Output
