$modulePath = Join-Path $PSScriptRoot '..\updater\updater.psm1'
Import-Module -Name $modulePath -Force -DisableNameChecking -WarningAction SilentlyContinue

Describe 'Updater backup and temporary artifact maintenance' {
    It 'removes committed rollback slots when either retention opt-out switch is used' {
        Mock -ModuleName updater Test-PortableLayout {}
        Mock -ModuleName updater Sync-ReleasePayload {}
        Mock -ModuleName updater Stop-ProcessTree {}
        Mock -ModuleName updater Sync-DesktopLauncherShortcuts { 0 }

        foreach ($switchName in @('NoBackup', 'PurgeBackups')) {
            $root = Join-Path $TestDrive $switchName
            $app = Join-Path $root 'app'
            $source = Join-Path $root 'source'
            New-Item -ItemType Directory -Path (Join-Path $app 'runtime'), (Join-Path $source 'runtime') -Force | Out-Null
            [IO.File]::WriteAllText((Join-Path $app 'runtime\old.txt'), 'old')
            [IO.File]::WriteAllText((Join-Path $source 'runtime\new.txt'), 'new')

            $arguments = @{
                AppRoot = $app
                SourceRoot = $source
                FromVersion = '1.0.0'
                TargetVersion = '1.0.1'
            }
            $arguments[$switchName] = $true
            Install-ReleaseWithTransaction @arguments

            (Test-Path -LiteralPath (Join-Path $app '.update-backups')) | Should Be $false
            (Get-Content -LiteralPath (Join-Path $app '.update-transaction.json') -Raw | ConvertFrom-Json).phase | Should Be 'committed'
        }
    }

    It 'cleans only updater-owned backup and TEMP artifacts' {
        $originalTemp = $env:TEMP
        $root = Join-Path $TestDrive 'clean'
        $temp = Join-Path $root 'temp'
        $app = Join-Path $root 'app'
        New-Item -ItemType Directory -Path (Join-Path $app '.update-backups\slot'), (Join-Path $temp 'deepseek-harness-updates'), (Join-Path $temp 'dsh-update-stale') -Force | Out-Null
        [IO.File]::WriteAllText((Join-Path $temp 'deepseek-harness-updates\cached.zip'), 'cache')
        [IO.File]::WriteAllText((Join-Path $temp 'DeepSeek-Harness-1.2.3.zip'), 'zip')
        [IO.File]::WriteAllText((Join-Path $temp 'dsh-probe-stale.json'), '{}')
        [IO.File]::WriteAllText((Join-Path $temp 'keep-me.txt'), 'user')
        try {
            $env:TEMP = $temp
            Clear-UpdaterArtifacts -AppRoot $app

            (Test-Path -LiteralPath (Join-Path $app '.update-backups')) | Should Be $false
            (Test-Path -LiteralPath (Join-Path $temp 'deepseek-harness-updates')) | Should Be $false
            (Test-Path -LiteralPath (Join-Path $temp 'DeepSeek-Harness-1.2.3.zip')) | Should Be $false
            (Test-Path -LiteralPath (Join-Path $temp 'dsh-update-stale')) | Should Be $false
            (Test-Path -LiteralPath (Join-Path $temp 'dsh-probe-stale.json')) | Should Be $false
            (Test-Path -LiteralPath (Join-Path $temp 'keep-me.txt')) | Should Be $true
        } finally {
            $env:TEMP = $originalTemp
        }
    }

    It 'limits automatic global cleanup to stale artifacts' {
        $originalTemp = $env:TEMP
        $temp = Join-Path $TestDrive 'stale-temp'
        $old = Join-Path $temp 'dsh-update-old'
        $recent = Join-Path $temp 'dsh-update-active'
        New-Item -ItemType Directory -Path $old, $recent -Force | Out-Null
        (Get-Item -LiteralPath $old).LastWriteTime = (Get-Date).AddDays(-2)
        try {
            $env:TEMP = $temp
            $null = Clear-UpdateTempArtifacts -StaleOnly
            (Test-Path -LiteralPath $old) | Should Be $false
            (Test-Path -LiteralPath $recent) | Should Be $true
        } finally {
            $env:TEMP = $originalTemp
        }
    }

    It 'exposes clean through both command entry points' {
        $desktopRoot = Join-Path $PSScriptRoot '..'
        (Get-Content -LiteralPath (Join-Path $desktopRoot 'dsh.cmd') -Raw) | Should Match '"%~1"=="clean"'
        (Get-Content -LiteralPath (Join-Path $desktopRoot 'update.cmd') -Raw) | Should Match '"%~1"=="-Clean"'
        (Get-Content -LiteralPath (Join-Path $desktopRoot 'update.ps1') -Raw) | Should Match '\[switch\]\$Clean'
    }
}
