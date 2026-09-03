import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Resolve a workspace path to the absolute form vitest aliases need. */
const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    // Packages the client bundle marks external are separate modules at
    // runtime, served by the client module system. Under test there is no
    // module system, so each is aliased to its own TypeScript source.
    alias: {
      '@dsh-portable/ui-mode/client': at('../../packages/ui-mode/src/client/index.ts'),
      // The vocabulary reaches its constants through a dependency-free CommonJS
      // file, so that the Electron main process — which has no build step —
      // reads exactly what the browser does. Vitest will not load that file
      // through the package's `exports` map, so point it at the file itself.
      '@dsh-portable/ui-mode/ui-mode-contract': at('../../packages/ui-mode/ui-mode-contract.cjs'),
      '@dsh-portable/ui-mode': at('../../packages/ui-mode/src/index.ts'),
      '@dsh-portable/session-manager/client': at('../../packages/session-manager/src/client/index.ts'),
      '@dsh-portable/session-manager': at('../../packages/session-manager/src/index.ts'),
    },
  },
})
