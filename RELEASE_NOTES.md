# DeepSeek Harness Desktop v1.5.5

[中文](RELEASE_NOTES.zh.md)

Windows x64, macOS Apple Silicon, and Linux x64 desktop release · 2026-08-25

v1.5.5 focuses on local file references, native image paste handling, and a simpler attachment flow.

## Highlights

- **Local file references**: ordinary PDF, Office, text, data, and source files are sent as `@file` path references; their bytes are not uploaded or parsed automatically.
- **Native image attachments**: paste, drop, or select images and keep them as native image data for image-capable models.
- **Learning Mode UI**: added session learning notes for goals, evidence, and route progress, with clearer visual activities and feedback layouts.

## Fixes

- **Simplify submission by removing document-parser/upload paths while preserving image-only commands and rejecting unsupported non-image files.**

## Components

- Distribution: 1.5.5
- Desktop shell: 0.1.0-shell.2
- Kernel: 0.1.1-rc.2 (@deepseek-ai/dsh-web-app)
- Tag: v1.5.5

## Checksums and security

- The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt`; the macOS DMG is recorded in `SHA256SUMS-darwin-arm64.txt`.
- Verify the matching checksum file before launching downloaded files.
- Marketplace packages are third-party code; review their source and permissions before enabling additional plugins.
- The Windows executable and macOS DMG are unsigned; Windows SmartScreen/Smart App Control and macOS Gatekeeper may warn or block them.
- Conversations, credentials, settings, attachments, and desktop preferences stay outside the release directory during updates.
