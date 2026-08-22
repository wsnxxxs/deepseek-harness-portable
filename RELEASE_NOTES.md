# DeepSeek Harness Desktop v1.5.3

[中文](RELEASE_NOTES.zh.md)

Windows x64, macOS Apple Silicon, and Linux x64 desktop release · 2026-08-23

v1.5.3 is a feature and bug-fix release following v1.5.2.

## Major Features

- **Learning Mode overhaul**: added interactive teaching visuals, understanding checks, and session-scoped learning routes, with accessible presentation and session recovery.
- **Archived chats management**: browse archived conversations in Settings, restore them, or permanently delete them.

## Vision and Kernel

- **Native image understanding**: image-capable models receive images directly, while text-only models continue to use the Vision Bridge fallback.
- **Kernel update**: updated to DeepSeek Harness 0.1.1-rc.2, including the image-capable `deepseek-v4-flash-vision-exp` model.

## Fixes

- **Allow pasted images up to 32 MiB and improve desktop menu action responsiveness.**
- **Fix Linux deb permissions and executable naming; installing the deb now registers the `dsh` command.**
- **Selecting the current workspace no longer triggers an unnecessary restart, and the desktop menu now uses clearer, consistent icons.**

## Components

- Distribution: 1.5.3
- Desktop shell: 0.1.0-shell.2
- Kernel: 0.1.1-rc.2 (@deepseek-ai/dsh-web-app)
- Tag: v1.5.3

## Checksums and security

- The final Windows portable ZIP and Setup installer SHA-256 values are recorded in `SHA256SUMS.txt`; the macOS DMG is recorded in `SHA256SUMS-darwin-arm64.txt`.
- Verify the matching checksum file before launching downloaded files.
- Marketplace packages are third-party code; review their source and permissions before enabling additional plugins.
- The Windows executable and macOS DMG are unsigned; Windows SmartScreen/Smart App Control and macOS Gatekeeper may warn or block them.
- Conversations, credentials, settings, attachments, and desktop preferences stay outside the release directory during updates.
