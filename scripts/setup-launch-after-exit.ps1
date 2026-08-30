[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$SetupProcessId,
  [Parameter(Mandatory = $true)]
  [string]$Executable,
  [Parameter(Mandatory = $true)]
  [string]$WorkingDirectory
)

$ErrorActionPreference = 'Stop'

# Inno Setup runs postinstall entries before its own process has fully exited.
# Keep the desktop/runtime process tree out of that final filesystem window.
Wait-Process -Id $SetupProcessId -ErrorAction SilentlyContinue

# The wait above fixes the installer lifetime race.  Sanitizing the inherited
# AppCompat marker remains a separate defence for the handoff process itself;
# the GUI launcher also removes it from the worker/runtime environment.
[Environment]::SetEnvironmentVariable('__COMPAT_LAYER', $null, 'Process')
Start-Process -FilePath $Executable -WorkingDirectory $WorkingDirectory
