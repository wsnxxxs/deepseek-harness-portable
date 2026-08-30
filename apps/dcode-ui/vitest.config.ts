import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-message-feedback/client': fileURLToPath(new URL(
        '../../vendor/deepseek-harness/packages/client/ui-message-feedback/src/client/index.ts',
        import.meta.url,
      )),
    },
  },
})
