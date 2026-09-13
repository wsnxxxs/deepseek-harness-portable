# DeepSeek Harness Desktop v1.7.2

[中文](README.zh.md) · [Project guide](../../README.md) · [Plugin configuration](../../docs/architecture-layers.md)

This directory contains the Electron shell for official DeepSeek Harness. The default uses a native window and the official Web profile. Page styles, brand menus, DCode and other extensions load only when their plugins are enabled.

## Development

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run desktop:dev
```

`src/main.cjs` manages windows, workspaces and app menus. `src/runtime-supervisor.cjs` launches the official runtime and waits for its readiness handshake. Electron's Node mode uses `--expose-internals` to satisfy the official Cordis Loader/HMR requirements.

The default preload only exposes the desktop communication bridge. The `@dsh-portable/desktop-enhancements` plugin activates and releases the page enhancements in `src/desktop-enhancements.cjs`.

Desktop data defaults to `%USERPROFILE%\.dsh` on Windows or `~/.dsh` on Linux/macOS. Override it with `DSH_HOME`. Plugin configuration lives under `profiles/web/`; see the [configuration guide](../../docs/architecture-layers.md).

## Checks and packaging

```sh
pnpm run desktop:test
pnpm run official:test
pnpm run test:platform
pnpm exec tsx scripts/build-desktop-web-exe.ts --electron --target win32-x64 --output-root dist-desktop/electron-v1.7.2
```

Run `test:platform` and Windows packaging on Windows. Setup requires Inno Setup 6. Build macOS/Linux natively using the root `desktop:package:mac` or `desktop:package:linux` command.

Windows packages and verification records live under `windows-artifacts/` and `verified/win32-x64/` in the output root. Release commands consume verified artifacts without rebuilding them; normal builds do not upload anything.

The product version comes from `distributionVersion` in this directory's `package.json`. Its package `version` remains independent. Update local release notes, checksums and version checks when changing the product release.

## Updates and removal

App menus can check published versions. On Windows, `update.ps1` handles verification, replacement and rollback; the desktop launcher recovers incomplete update transactions. The updater only operates on the matching installation and its owned processes.

Setup removal and portable uninstall scripts keep user data unless deletion is explicitly selected. Earlier Portable histories are automatically converted while preserving original logs; see the [release notes](../../RELEASE_NOTES.md).
