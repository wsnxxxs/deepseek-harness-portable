# DeepSeek Harness Desktop v1.6.0

[中文](RELEASE_NOTES.zh.md)

Windows x64 desktop release · 2026-08-30

## Changes

- Refined the DCode workbench, floating composer, message navigation, change review, terminal experience, and responsive layouts.
- Added the optional Swarm (`crew`) mode with named teammates, a shared task board, prior-session search, and operator-attached dossier sources in the DCode Agent workspace.
- Extracted the reusable material-space kernel so Learning and dossier-backed tasks share ingestion, anchors, re-anchoring, and lexical search behavior.
- Improved plugin management, background updates, installer preflight checks, and stale update-cache cleanup.
- Updated Learning Mode and local material import, retrieval, and review capabilities; these areas remain under active development.
- Fixed Windows path handling, generated assets, and packaging verification issues for better stability.

> Roadmap note: Learning Mode and the Library will change substantially in future releases. Their v1.6.0 design is not final.

## Components

- Distribution: 1.6.0
- Desktop shell: 0.1.0-shell.2
- Runtime kernel: 0.1.2-alpha.2 (`dsh-v0.1.2-alpha.2`)
- Tag: v1.6.0

## Checksums and security

- SHA-256 values for the Windows portable ZIP and Setup installer are recorded in `SHA256SUMS.txt`.
- This release is not signed by a trusted commercial CA, so Windows may show a security warning.
