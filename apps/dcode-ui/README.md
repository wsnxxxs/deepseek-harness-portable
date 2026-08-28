# @dsh-portable/dcode-ui

A second, switchable front end for DeepSeek Harness: a compact desktop
workbench running beside the official DSH interface over one Runtime.

The official UI is not modified, wrapped, or replaced. It is one slot
registration away at all times.

## How the switch works

DSH's browser shell renders exactly one ctx-level slot, `root`, and
`@deepseek-ai/dsh-client-ui-layout` occupies it with the official three-column
`AppFrame`. `root` is a `single` slot, so a second registration does not sit
beside the frame — it *shadows* it, and the lowest `priority` wins.

This package registers into `root` at `priority: -1000` while the workbench
is selected, and disposes that registration when the official interface is
selected. Both directions are a slot mutation inside the live page:

```
uiMode = 'dcode'     → register Workbench into root   → AppFrame is shadowed
uiMode = 'official'  → dispose that registration      → AppFrame renders again
```

Nothing restarts. The DSH Runtime, the Host connection, the Session list, the
Workspace registry and every open Conversation are shared by construction —
neither surface owns a copy of any of them — so switching costs a React
remount and nothing else.

### Entry points

Five surfaces select the front end, all arbitrated by one store
(`src/client/mode.ts`):

| Entry | Mechanism |
| --- | --- |
| Electron application menu | `Interface ▸` radio pair (official, then workbench) → IPC → live swap |
| System tray menu | the same submenu (one template serves both) |
| Workbench settings → Interface | `runtime.mode.set(...)` |
| Official settings → 界面设置 | a `settings.section` registration from this package |
| URL parameter | `?view=dcode` / `?view=official` |

Boot resolution order: URL parameter → `localStorage` → the desktop config's
`uiMode` → `dcode`. The active mode is written back to the address bar with
`replaceState`, so reloading or copying the URL reproduces the surface.

`ui-mode-contract.cjs` is the dependency-free source of the switch constants.
Electron main/preload consume its CommonJS export, while `src/ui-mode.ts` adds
typed browser helpers over the same contract for the Host and browser bundles.

## What the workbench is made of

Everything is read through the DSH client services the official UI reads. This
package introduces no mirrored state:

| Surface | Source |
| --- | --- |
| Task list, grouping, selection | `ctx.sessions` + `ctx.workspaces` |
| Transcript, streaming, tool calls | `ctx.uiConversation`'s `chat` target |
| Goal | the host-computed `goal` projection |
| Progress | the session's own `todo_write` calls |
| Permission mode | the `permissions` projection; writes via `/permission` |
| Model + reasoning depth | `remote.session.modelCatalog` / `selectModel` |
| Skills, commands | `remote.skills`, `remote.commands` |
| Plugins, MCP | `remote.pluginInventory` |
| Settings namespaces | `remote.settings.describe` |
| Learning | the Interactive Learning pack's own `VaultLibrary` and channel |

Markdown, math, code, diff and terminal rendering come from
`@deepseek-ai/dsh-client-ui-primitives`, which is a platform module — shared,
not bundled.

## The one thing DSH does not own

Version control. The host half of this package serves a `/dcode` Connection
RPC channel with six endpoints — `git/status`, `git/diff`, `git/branches`,
`git/commit`, `git/undo`, `file/read` — which is what the Git panel, the diff
viewer, and per-turn undo are built on. It is a host plugin rather than a
desktop-shell feature so the web surface keeps the same panel.

Every invocation is a fixed argv against `git` with a timeout and a byte cap;
no shell is involved, and a browser-supplied path passes
`containedRelativePath` before it can reach an argv.

**Undo is deliberately non-destructive.** A tracked file is restored from
HEAD; an untracked file is *moved* into `.dsh/dcode-undo/<timestamp>/`, never
deleted, so a mistaken undo stays recoverable from the operator's own
directory.

## Appearance

The workbench owns no theme. `ui-theme` resolves the preference (`light`,
`dark`, `system`) and publishes one snapshot; `ui-layout`'s presenter projects
it as the `--dsw-alias-*` variables every workbench token reads. The switch —
segmented in Settings, a popover in the top bar, three rows in the command
palette — writes through that same service, so a change made here is the
change the official interface reads back, stored once in the user settings
document.

`tokens.module.css` carries a dark base and a light block keyed on the
resolved scheme, which the frame stamps on its root. What the light block
restates is everything *derived*: the shipped light theme resolves `bg-base`,
`layer-1` and `layer-2` all to pure white, so the surface ramp is rebuilt by
washing ink over the base rather than read from three identical aliases.

On Windows 11 the shell asks for a native backdrop — acrylic on 22H2 and
later, mica before it — and the page goes translucent to let it through. The
material is resolved once, by `windowMaterial()` in `apps/desktop`, and
reported to the page: a surface that painted itself translucent without one
would be a see-through hole, not a frosted pane. The translucency is scoped to
this front end, so the official interface keeps its opaque ground.

## Terminal output

Agents run real programs, and real programs write colour. `chat/ansi.ts` is a
one-pass SGR reader — 16-colour, 256-colour and truecolour, weight, italic,
underline, strike and inverse — that also models the carriage return every
progress bar is built on, so a redrawn line collapses to its last frame
instead of stacking one row per redraw. Everything it does not interpret
(cursor moves, erases, OSC titles) it consumes rather than leaks.

The sixteen palette colours are CSS variables, so coloured output re-tints
with the theme; 256-colour and truecolour carry their own values, as a
terminal would render them. Plain output takes a fast path to a single text
node.

## Layout

```
ui-mode-contract.cjs    shared CJS/ESM switch constants
src/
  ui-mode.ts            typed browser helpers over that contract
  index.ts              host plugin: the /dcode channel
  host/git.ts           bounded git reads + the one write path
  host/rpc.ts           endpoint router and payload validation
  client/
    index.ts            the switch: root registration + official settings row
    mode.ts             mode store, URL/storage/desktop-bridge arbitration
    rpc.ts              typed /dcode client
    tokens.module.css   design tokens layered on the Host theme aliases
    state/              runtime facade, React bindings, view state, i18n
    shell/              frame, top bar, rail, aside, composer, palette, picker
    theme.ts            colour scheme, preference and window backdrop
    chat/               transcript, tool cards, ANSI reader, file-change card
    git/                shared status read, panel, patch reader, diff viewer
    learning/           learning mode surface
    settings/           settings surface + the official-settings switch row
```

## Build and test

```bash
pnpm --filter @dsh-portable/dcode-ui run build
```

```bash
pnpm run dcode:test
```

The package builds through the kernel's browser bundling preset, so it is
discovered by `scripts/build/client-manifest-bridge.ts` automatically. The
runtime inserts it into the plugin graph in `apps/runtime/src/packaged-bin.ts`
and lists it in `REQUIRED_CLIENT_ENTRIES`, so a boot whose graph is missing it
is rejected rather than served.

## Extension points

The frame is deliberately open at the edges:

- `NavigationState` carries the view/panel state; adding a top-level surface is
  a `WorkbenchView` arm plus a rail entry.
- `AsideTab` adds a right-column tab.
- `SettingsSection` adds a settings section.
- The `/dcode` channel takes new endpoints by extending `DCODE_ENDPOINTS` and
  its router — the intended route for a terminal, a browser preview, or
  background-task surfaces.
