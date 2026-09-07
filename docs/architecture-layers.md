# Three layers: shell, upstream, extras

This distribution is three things stacked, and the value of keeping them apart
is that each one can be replaced, trimmed or upgraded without the other two
being edited.

| Layer | What it is | Where |
| --- | --- | --- |
| **Desktop shell** | Electron main process, runtime supervisor, updater, launchers, packaging | `apps/desktop/`, `packages/desktop-protocol/`, `packages/platform-contract/`, `packages/release-manifest/`, `scripts/` |
| **Official runtime** | The pinned DeepSeek Harness kernel, unmodified | `vendor/deepseek-harness/` (git submodule) |
| **Runtime composition** | Boots upstream's own `web` profile and adds the extras as ordinary rows | `apps/runtime/` |
| **Extras** | Every capability this distribution adds, one Cordis plugin each | `apps/*/`, `packages/*/` under `@dsh-portable/` |

The submodule is never patched in place. Where upstream bytes must change for a
packaged target, the change is a reviewed transform under `patches/` applied to
the staging tree, with a guard manifest that fails the build when upstream moves
the code the transform matched.

## Every extra is a plugin row

There is no "extras framework". Each capability is a normal Cordis plugin that
upstream's Loader mounts, inserted by `apps/runtime/src/packaged-bin.ts` as a
row in the composed `web` profile:

| Row id | Package | What it owns |
| --- | --- | --- |
| `interactive-learning` | `@dsh-portable/interactive-learning` | Learning mode: the agent preset, its tools, and its conversation surfaces |
| `ui-mode` | `@dsh-portable/ui-mode` | the front-end vocabulary, the page-wide mode store, and the interface switch |
| `session-manager` | `@dsh-portable/session-manager` | shared token-usage presentation for DCode |
| `dcode-ui` | `@dsh-portable/dcode-ui` | the DCode workbench surface and its `/dcode` git channel |
| `cluster-ui` | `@dsh-portable/cluster-ui` | Cluster mode: the Agent Teams roster and shared task board |
| `agent-team` | `@deepseek-ai/dsh-experimental-agent-team` | the upstream Team host service Cluster mode reads |

Each row is inserted only when neither user layer already declares it
(`if (!rows.has(id))`), so `$DSH_HOME/cordis.patch.yml` can disable any of them
with `disabled: true` and the assembly still boots. `reconcilePresetRoster` and
`reconcileCrewRuntime` remove rows whose measured capability is absent rather
than letting the application fail at startup.

Two of the rows are libraries other rows build on rather than features of their
own: `@dsh-portable/space-kernel` (material ingest, anchors, lexical index) and
`@dsh-portable/crew-dossier` (mission sources with citations).

## The rule that keeps them independent

**A capability belongs to the plugin whose name it carries, not to whichever
surface happened to render it first.**

The standard archive, usage, plugin-management and Workshop pages belong to
`@linxin666/dsh-web-all@0.3.16`. The runtime seeds this published bundle into
new and existing Web profiles once, replacing the old marketplace bundle.
Subsequent removal is respected. Its source is not vendored or patched.
The two direct patch entries, `@linxin666/dsh-i18n` and `dsh-better-sidebar`,
are also explicit runtime dependencies so packaged and development resolution agree.

Removed: the old marketplace bootstrap, its three patches, DCode's market
catalogue/install queue/API adapter, and the portable archive/official usage pages.
DCode links to the standard interface for community plugin operations and archive
management. Its usage cards remain a presentation helper in `session-manager`.

Image understanding is owned by the bundle's `describe_image` plugin. Configure
its endpoint and model in its Web Plugins settings page. Old `vision` settings
are left on disk but are no longer read; legacy loader rows are disabled.

Retained capabilities are not equivalent to the bundle: Learning owns material and exercise tools;
Cluster reads Agent Teams rather than independent scheduled tasks; DCode remains
an alternate conversation surface. The portable plugin manager owns the
`dsh.profile.portablePlugins` switches, which the community manager does not write.

The bundle's Doctor row defaults to disabled because Electron already owns process
supervision and recovery. User profile/home row overrides can still enable it.
`DSH_PROFILE=web` and a portable `DSH_DOCTOR_HOME` are supplied to community plugins.

## Cordis registration, in the order that matters

Getting a new extra to load correctly means satisfying four separate
dependency systems. Missing one fails at a different time each.

1. **Host plugin injection** — `export const inject = [...]` in the package's
   host half. Cordis holds `apply` until those services publish.
2. **Client plugin injection** — the same field in `src/client/index.ts`, over
   client services (`slots`, `locale`, `sessions`, `workspaces`, `remote.*`).
   A Remote namespace read without declaring it throws at use, not at compile.
3. **Client bundle ordering** — `dsh.client.inject` in `package.json` names the
   packages whose browser bundles must arrive first, and `dsh.client.external`
   names the ones this bundle `require`s from the module table instead of
   inlining. The Loader resolves both recursively before running a factory; an
   external that is not also declared is a missing-module throw in the browser.
4. **Slot declaration order** — register through `ctx.slots.inject('<slot>', …)`
   rather than a bare `ctx.slots.register`, so the contribution waits for the
   declaring plugin and is re-run on a renderer epoch change instead of being
   silently dropped. Declaring a slot someone else already declares throws and
   fails the whole client plugin tree.

Beyond the package itself, a new extra has to be added in four places:

- `apps/runtime/src/packaged-bin.ts` — the profile overlay row;
- `apps/runtime/package.json` — a `workspace:^` dependency, so the packaged VFS
  can resolve it;
- `scripts/runtime/sync-runtime-deps.ts` — `STATIC_WORKSPACE_ROOTS`, which
  drives the generated dependency closure;
- the root `package.json` `build` and `test` scripts.

`scripts/build/client-manifest-bridge.ts` needs no edit: it discovers any
`apps/*` or `packages/*` package whose `tsdown.config.ts` uses the kernel's
browser bundling preset, and mirrors its manifest where that preset scans.

## What upstream must keep doing

The extras are additive by construction, but three upstream facts are load
bearing and worth re-checking on every kernel bump:

- `root` is a `single` slot, so a lower-priority registration shadows
  `AppFrame`. This is the entire surface switch.
- `settings.section`, `settings.general.item` and `settings.models.footer` are
  the declared extension seats in official settings. A feature that needs a page
  there registers into one; it never edits the shell.
- `KNOWN_SESSION_EVENT_TYPES` gates durable session reads, so any portable event
  type must be registered before persistence restores a session
  (`apps/runtime/src/session-compatibility.ts`, run at module load of the
  packaged entry).
