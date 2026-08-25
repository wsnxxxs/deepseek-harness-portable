# DeepSeek Harness Desktop v1.5.5

[中文](RELEASE_NOTES.zh.md)

Windows x64, macOS Apple Silicon, and Linux x64 desktop release · 2026-08-25

v1.5.5 is a feature and bug-fix release following v1.5.4.

## Major Features

- **Local file attachments**: paste, drop, or select images, PDF, DOCX, XLSX, PPTX, text, data, and common source-code files for local extraction and model-assisted reading.
- **Learning Mode visual system**: added richer semantic renderers with clearer labels, less crowding, and feedback-aware layouts.
- **Attachment continuation**: retained file handles expose bounded previews, `read_attachment` continuation reads, raw downloads, and ZIP export.

## Runtime and Compatibility

- **Local extraction** uses bounded worker capacity and rejects unsupported scanned, encrypted, damaged, legacy Office, archive, and arbitrary binary inputs.
- **Non-image attachment previews** use the same provider-neutral projection for DeepSeek and pi-ai requests.

## Fixes

- **Refresh generated Learning client bundles and add regression coverage for the new visual and attachment paths.**
- **Keep image-only command behavior unchanged while rejecting unsupported non-image files before submission.**

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
