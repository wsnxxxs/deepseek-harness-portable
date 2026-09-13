# DeepSeek Harness Desktop

[中文](README.zh.md) · [Release notes](RELEASE_NOTES.md) · [Published packages](https://github.com/wsnxxxs/deepseek-harness-portable/releases) · [Issues](https://github.com/wsnxxxs/deepseek-harness-portable/issues)

A community project that packages official [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) with an Electron window, installer and portable distribution.

**The default uses official UI, presets and tools. Extra features such as DCode, Learning and Cluster ship as plugins and are disabled by default.** Plugins required by the official profile retain upstream settings.

## Current version

| Component | Status |
| --- | --- |
| Desktop distribution | **v1.7.3**; see the [release notes](RELEASE_NOTES.md) |
| Official kernel | `dsh-v0.1.5-rc.2`, pinned in the Git submodule |
| Windows x64 | Setup and ZIP built locally and checked with the packaged runtime |
| macOS arm64, Linux x64 | DMG, AppImage and deb build targets remain available; v1.7.3 packages for these platforms were not produced in this run |

Source versions and GitHub Releases are managed separately. v1.7.3 packages have been generated locally; downloadable versions are those actually attached to [Releases](https://github.com/wsnxxxs/deepseek-harness-portable/releases).

## Install and launch

Windows packages include Electron and Node.js. Users do not need a separate Node.js or pnpm installation.

1. Download a package and its matching SHA-256 checksum file.
2. Run `DeepSeek-Harness-Setup-<version>-win32-x64.exe`, or extract the complete portable ZIP.
3. Open **DeepSeek Harness Launcher.exe** and follow the official UI to configure models and credentials.

Common entries in the portable directory:

| File | Purpose |
| --- | --- |
| `DeepSeek Harness Launcher.exe` | Desktop launcher without a console |
| `start-desktop.cmd` | Console startup and diagnostics |
| `start-web.cmd` | Browser UI using the embedded runtime |
| `dsh.cmd` | Embedded DSH CLI and update entry |
| `update.ps1` | Check and install published Windows updates |
| `runtime/` | Application and dependencies; keep this directory intact |

Desktop data defaults to `%USERPROFILE%\.dsh` on Windows and `~/.dsh` on Linux/macOS. Set `DSH_HOME` to use another directory. Back up data before upgrading.

This is an unsigned community distribution, so Windows may report an unknown publisher. Checksums in the source tree do not apply to packages from other versions.

## Defaults and optional plugins

Default startup preserves the official chat UI and provides plugin management and configuration in Settings. Management stays available while optional features start disabled. It does not automatically install a third-party marketplace. WSL is not required for default startup; individual tools retain their upstream system requirements.

| Optional feature | Activation |
| --- | --- |
| DCode workbench | `@dsh-portable/dcode-ui` bundle; enables its UI switching and session dependencies |
| Learning mode | `@dsh-portable/interactive-learning` bundle |
| Cluster team interface | `@dsh-portable/cluster-ui` bundle |
| Desktop page enhancements | `@dsh-portable/desktop-enhancements` bundle |
| Portable presets and capability probes | `@dsh-portable/runtime` bundle; Crew also needs Cluster |
| Attachment entry | Settings → Plugins → Plugin management |

Open **Settings → Plugins**:

- **Plugin management** uses [dsh-web](https://github.com/zhu1090093659/dsh-web) 0.3.21's native page for both installed plugins and bundled Learning, DCode, Cluster, desktop enhancements and attachment controls. Bundled plugins appear in its **Built-in products** group; there is no separate Portable management tab.
- **Plugin configuration** edits settings exposed by enabled plugins.

Changes persist in the standard profile and Cordis patch and take effect after restart. Management, settings and compatibility components stay enabled so the controls remain reachable. Advanced users can still edit `DSH_HOME/profiles/web/package.json` and `cordis.patch.yml`.

To disable a plugin, remove its bundle, undo any explicit activation in the local patch, and restart. Local patches override bundle defaults. Startup preserves explicit user choices; marketplace bundles marked as automatically seeded by an earlier version migrate to disabled.

Plugins follow DSH's `dsh.bundle.patch` and `dsh.client` conventions and share the host Cordis instance. See [architecture and configuration](docs/architecture-layers.md) for composition details, including shared preset roots when combining Portable and Learning.

## Upgrade from an earlier version

The retired dsh-plugin-marketplace is replaced by the bundled dsh-web Workshop (latest npm version 0.3.21). Profiles that previously enabled the old market enable Workshop during migration. Fresh installations keep it optional. The updater preserves configuration backups and repairs mixed YAML left by earlier plugin toggles.

Extensions are opt-in, so the first launch can look different from the earlier default DCode workbench.

Startup converts older Portable / Learning histories into official v3 logs in the same session directory while preserving the original files. Compatibility covers old attachment metadata and subagent descriptors; the official migration chain handles conversation events and sequence mapping. See the [upgrade notes](RELEASE_NOTES.md).

## Development and builds

Use Node.js 24 and pnpm 11.21.0. Clone the official submodule with the repository:

```sh
git clone --recurse-submodules https://github.com/wsnxxxs/deepseek-harness-portable.git
cd deepseek-harness-portable
pnpm install --frozen-lockfile
pnpm run build
pnpm run desktop:dev
```

After pulling into an existing clone, run `git submodule update --init --recursive` to check out the pinned upstream version.

| Command | Purpose |
| --- | --- |
| `pnpm test` | Regular regression suite |
| `pnpm run official:test` | Real startup and composition checks for official defaults and optional bundles |
| `pnpm run learning:test` | Learning's 427 source tests |
| `pnpm run dcode:test` | DCode component and behavior tests |
| `pnpm run test:platform` | Windows launcher, installer handoff and updater checks |
| `pnpm run readme:check` | English/Chinese README synchronization |

Windows x64 packaging requires a Windows build environment and Inno Setup 6:

```sh
pnpm exec tsx scripts/build-desktop-web-exe.ts --electron --target win32-x64 --output-root dist-desktop/electron-v1.7.3
```

Packages are written to `dist-desktop/electron-v1.7.3/windows-artifacts/`; verified copies and records are under `verified/win32-x64/`. Packaging checks native modules, actual startup, file inventories and that Setup embeds the exact portable ZIP.

Build macOS/Linux on their respective platforms using `pnpm run desktop:package:mac` or `pnpm run desktop:package:linux`. Packaging does not upload releases. Installers, caches and local logs are not committed to Git.

## Repository layout

- `vendor/deepseek-harness/`: official Git submodule pinned to a release.
- `apps/runtime/`, `apps/desktop/`: official startup adapter, desktop shell and distribution configuration.
- `apps/dcode-ui/`, `apps/interactive-learning/`, `apps/cluster-ui/`: optional features.
- `packages/`: process bridge, optional plugins and shared services.
- `scripts/`: build, test, packaging and release tools.
- `patches/`: historical transforms and manifests; both current functional patch manifests are empty.

More documentation: [Desktop development](apps/desktop/README.md) · [Runtime architecture](docs/runtime-architecture.md) · [Learning test maintenance](apps/interactive-learning/tests/README.md)

## License

This repository uses the [MIT License](LICENSE). Upstream and third-party dependencies retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
