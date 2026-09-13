# DeepSeek Harness Desktop v1.7.1

2026-09-13

## Changes

- Updated the bundled official DeepSeek Harness to 0.1.5-rc.2.
- Integrated dsh-web 0.3.21 plugin management and configuration. Management stays available while feature plugins start disabled.
- The default experience uses official UI and presets; Portable extensions are disabled by default.
- Desktop enhancements, DCode, Learning and Cluster activate explicitly through DSH bundles and share the host Cordis dependency.
- Adapted attachments, feedback, RPC and session persistence to upstream APIs.
- Consolidated Learning tests from 657 to 427 while retaining core behavior and integration regressions.

## Upgrade note

- Startup automatically migrates earlier Portable / Learning custom-event histories to official v3 logs. Original files remain unchanged; no history is deleted.
