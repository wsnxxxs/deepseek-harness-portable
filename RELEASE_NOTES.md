# DeepSeek Harness Desktop v1.5.6

[中文](RELEASE_NOTES.zh.md)

Windows x64, macOS Apple Silicon, and Linux x64 desktop release · 2026-08-27

v1.5.6 is a feature and bug-fix release following v1.5.5.

## Major Features

- **Interactive Learning material grounding**: ingest supported PDF, DOCX, PPTX, Markdown, and text material locally, retrieve bounded evidence, and keep source anchors for teaching turns.
- **Concept review and learner memory**: add structured concept cards, review feedback, and durable learner progress for continued study.
- **Learning intent routing and visuals**: refine learn/not-learn routing, teaching routes, learning notes, and semantic visual activities.

## Runtime and Compatibility

- **Bundled runtimes refreshed**: update the packaged Interactive Learning and Vision Bridge components to the latest workspace state.
- **Windows path handling**: dropped directories are now distinguished from empty files in the composer.

## Fixes

- **Refresh generated Learning bundles and preserve the material, concept-review, and intent-routing contracts in the packaged runtime.**
- **Keep the Windows release pipeline reusable by caching completed packaging layers without changing final artifact verification.**

## Components

- Distribution: 1.5.6
- Desktop shell: 0.1.0-shell.2
- Kernel: 0.1.1-rc.2 (@deepseek-ai/dsh-web-app)
- Tag: v1.5.6

## Checksums and security

- The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt`; the macOS DMG is recorded in `SHA256SUMS-darwin-arm64.txt`.
- Verify the matching checksum file before launching downloaded files.
- Marketplace packages are third-party code; review their source and permissions before enabling additional plugins.
- The Windows executable and macOS DMG are unsigned; Windows SmartScreen/Smart App Control and macOS Gatekeeper may warn or block them.
- Conversations, credentials, settings, attachments, and desktop preferences stay outside the release directory during updates.
