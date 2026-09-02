# DeepSeek Harness Desktop v1.6.0

[中文](RELEASE_NOTES.zh.md)

Cross-platform desktop release · 2026-08-30

## Changes

- Refined the DCode workbench, floating composer, message navigation, change review, terminal experience, and responsive layouts.
- Added the optional Swarm (`crew`) mode with named teammates, a shared task board, prior-session search, and operator-attached dossier sources in the DCode Agent workspace.
- Extracted the reusable material-space kernel so Learning and dossier-backed tasks share ingestion, anchors, re-anchoring, and lexical search behavior.
- Improved plugin management, background updates, installer preflight checks, and stale update-cache cleanup.
- Updated Learning Mode and local material import, retrieval, and review capabilities; these areas remain under active development.
- Fixed Windows path handling, generated assets, and packaging verification issues for better stability.

> Roadmap note: Learning Mode and the Library will change substantially in future releases. Their v1.6.0 design is not final.

## Checksums and security

- SHA-256 values for each target's packages are recorded in `SHA256SUMS-<target>.txt`.
- Packages are unsigned and macOS is not notarized, so the operating system may show a security warning.
