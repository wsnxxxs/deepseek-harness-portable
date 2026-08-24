# DeepSeek Harness Desktop v1.5.4

[中文](RELEASE_NOTES.zh.md)

Windows x64, macOS Apple Silicon, and Linux x64 desktop release · 2026-08-24

v1.5.4 is a feature and bug-fix release following v1.5.3.

## Major Features

- **Learning Mode visual system**: improved formula, graph, plot, timeline, scene, and recall visuals with clearer labels, less crowding, and feedback-aware layouts.
- **Usage settings**: added durable token summaries, per-model breakdowns, activity history, and session timing in Settings.
- **Session compatibility**: added safe handling for optional legacy events and hydration for usage projections on cold sessions.

## Fixes

- **Improve native directory picking and indexing across Windows and WSL-compatible environments.**
- **Keep Learning state and runtime event metadata compatible across resume, compaction, and packaged upgrades.**
- **Refresh generated Learning client bundles and regression coverage for visual layout and recall feedback.**

## Components

- Distribution: 1.5.4
- Desktop shell: 0.1.0-shell.2
- Kernel: 0.1.1-rc.2 (@deepseek-ai/dsh-web-app)
- Tag: v1.5.4

## Checksums and security

- The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt`; the macOS DMG is recorded in `SHA256SUMS-darwin-arm64.txt`.
- Verify the matching checksum file before launching downloaded files.
- Marketplace packages are third-party code; review their source and permissions before enabling additional plugins.
- The Windows executable and macOS DMG are unsigned; Windows SmartScreen/Smart App Control and macOS Gatekeeper may warn or block them.
- Conversations, credentials, settings, attachments, and desktop preferences stay outside the release directory during updates.
