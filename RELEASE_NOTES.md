# DeepSeek Harness Desktop v1.6.0

[中文](RELEASE_NOTES.zh.md)

Windows x64 desktop release · 2026-08-28

v1.6.0 is a feature and bug-fix release following v1.5.6.

## Major Features

- **Interactive Learning material grounding**: ingest supported PDF, DOCX, PPTX, Markdown, and text material locally, retrieve bounded evidence, and keep source anchors for teaching turns.
- **Concept review and learner memory**: add structured concept cards, review feedback, and durable learner progress for continued study.
- **Learning intent routing and visuals**: refine learn/not-learn routing, teaching routes, learning notes, and semantic visual activities.
- **Responsive DCode workbench**: adapt the rail, conversation, preview, and environment summary to compact/medium/wide windows; persist rail sizing and provide quick workspace/task switching.
- **Plugin management surface**: add dedicated Marketplace, Installed, and Configuration sections with repository review gates, live job progress, lifecycle controls, and restart state.

## Runtime and Compatibility

- **Bundled runtimes refreshed**: move the kernel to the official `dsh-v0.1.2-alpha.1` release and adopt its Controller, Client Store, Chat/Session UI, and User Questions architecture, while refreshing the Interactive Learning and Vision Bridge components.
- **Sessions and attachments**: use the upstream archive, `@file`/`@session` references, image attachments, and token-usage surfaces; retain permanent deletion, cold-session handles, and the text/Office file upload/download extension.
- **Windows path handling**: dropped directories are now distinguished from empty files in the composer.

## Fixes

- **Refresh generated Learning bundles and preserve the material, concept-review, and intent-routing contracts in the packaged runtime.**
- **Keep the Windows release pipeline reusable by caching completed packaging layers without changing final artifact verification.**

## Components

- Distribution: 1.6.0
- Desktop shell: 0.1.0-shell.2
- Kernel: 0.1.2-alpha.1 (@deepseek-ai/dsh-web-app, `dsh-v0.1.2-alpha.1`)
- Tag: v1.6.0

## Checksums and security

- The final Windows portable ZIP and Setup installer SHA-256 values are recorded in `SHA256SUMS.txt`.
- Verify the matching checksum file before launching downloaded files.
- Marketplace packages are third-party code; review their source and permissions before enabling additional plugins.
- The Windows executable and macOS DMG are unsigned; Windows SmartScreen/Smart App Control and macOS Gatekeeper may warn or block them.
- Conversations, credentials, settings, attachments, and desktop preferences stay outside the release directory during updates.
