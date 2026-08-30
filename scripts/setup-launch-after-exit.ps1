[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$SetupProcessId,
  [Parameter(Mandatory = $true)]
  [int]$SetupLoaderProcessId,
  [Parameter(Mandatory = $true)]
  [string]$SetupLoaderExecutable,
  [Parameter(Mandatory = $true)]
  [string]$Executable,
  [Parameter(Mandatory = $true)]
  [string]$WorkingDirectory
)

$ErrorActionPreference = 'Stop'

function Get-ProcessIfRunning {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Id,
    [string]$ExpectedExecutable
  )

  $process = Get-Process -Id $Id -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    return $null
  }
  if (-not [string]::IsNullOrWhiteSpace($ExpectedExecutable)) {
    $expected = [IO.Path]::GetFullPath($ExpectedExecutable)
    $actual = [IO.Path]::GetFullPath($process.Path)
    if (-not [string]::Equals($actual, $expected, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Setup Loader PID $Id belongs to an unexpected executable: $actual"
    }
  }
  return $process
}

# A single-file Inno installer keeps its original SetupLdr process alive while
# the extracted Setup process runs, then performs loader cleanup after that
# child exits. Capture both process handles before either PID can be reused and
# keep the desktop/runtime tree out of the complete installer lifetime.
$setup = Get-ProcessIfRunning -Id $SetupProcessId
$setupLoader = Get-ProcessIfRunning -Id $SetupLoaderProcessId -ExpectedExecutable $SetupLoaderExecutable
if ($null -ne $setup) {
  $setup.WaitForExit()
}
if ($null -ne $setupLoader) {
  $setupLoader.WaitForExit()
}

# The wait above fixes the installer lifetime race.  Sanitizing the inherited
# AppCompat marker remains a separate defence for the handoff process itself;
# the GUI launcher also removes it from the worker/runtime environment.
[Environment]::SetEnvironmentVariable('__COMPAT_LAYER', $null, 'Process')

# Starting the launcher directly from this helper still leaves the first app
# process rooted in the installer-created process tree.  Dispatch an ephemeral
# shortcut through Explorer so Finish uses the same Windows shell activation
# path as the installed desktop/Start Menu shortcuts.
$shortcutPath = Join-Path ([IO.Path]::GetTempPath()) (
  'DeepSeek-Harness-Setup-Launch-{0}.lnk' -f [Guid]::NewGuid().ToString('N')
)
$shell = $null
$shortcut = $null
try {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = [IO.Path]::GetFullPath($Executable)
  $shortcut.WorkingDirectory = [IO.Path]::GetFullPath($WorkingDirectory)
  $shortcut.Save()

  $explorer = Join-Path $env:SystemRoot 'explorer.exe'
  $quotedShortcutPath = '"{0}"' -f $shortcutPath
  Start-Process -FilePath $explorer -ArgumentList $quotedShortcutPath -Wait
} finally {
  if ($null -ne $shortcut) {
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut) | Out-Null
  }
  if ($null -ne $shell) {
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) | Out-Null
  }
  Remove-Item -LiteralPath $shortcutPath -Force -ErrorAction SilentlyContinue
}
