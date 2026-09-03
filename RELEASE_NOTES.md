# DeepSeek Harness Desktop v1.6.2

[中文](RELEASE_NOTES.zh.md)

Cross-platform desktop release · 2026-09-03

## Changes

- Refined the DCode workbench, floating composer, message navigation, change review, terminal experience, and responsive layouts.
- Added the optional Swarm (`crew`) mode with named teammates, a shared task board, prior-session search, and operator-attached dossier sources in the DCode Agent workspace.
- Updated the bundled DeepSeek Harness runtime to 0.1.2-rc.1.
- Unified Portable built-in feature management across DCode settings and the plugin marketplace; built-in features can be enabled or disabled and take effect after restart.
- Kept DCode UI, Vision Bridge, Cluster, and Learning as default-injected but removable plugin rows; removing an optional row no longer blocks the core desktop shell.
- Split Cluster mode into the standalone `@dsh-portable/cluster-ui` plugin so the official UI and any compatible surface can host the roster and task board.
- Extracted the reusable material-space kernel so Learning and dossier-backed tasks share ingestion, anchors, re-anchoring, and lexical search behavior.
- Improved plugin management, background updates, installer preflight checks, and stale update-cache cleanup.
- Updated Learning Mode and local material import, retrieval, and review capabilities; these areas remain under active development.
- Fixed Windows path handling, generated assets, and packaging verification issues for better stability.

> Roadmap note: Learning Mode and the Library will continue to evolve in future releases; their v1.6.2 design is not final.

## Checksums and security

- SHA-256 values for each target's packages are recorded in `SHA256SUMS-<target>.txt`.
- Packages are unsigned and macOS is not notarized, so the operating system may show a security warning.
