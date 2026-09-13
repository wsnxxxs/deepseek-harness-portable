# DeepSeek Harness Desktop v1.7.2

2026-09-13

## Fixes

- The retired dsh-plugin-marketplace is replaced by the bundled dsh-web Workshop (latest npm version 0.3.21). Profiles that previously enabled the old market enable Workshop during migration. Fresh installations keep it optional. The updater preserves configuration backups and repairs mixed YAML left by earlier plugin toggles.
- Built-in and dsh-web plugin controls now edit one YAML document, preserving Cordis expressions, comments and unrelated settings.
