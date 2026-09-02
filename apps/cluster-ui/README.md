# @dsh-portable/cluster-ui

Cluster mode as a plugin: the Agent Teams roster and the shared task board,
packaged so that any surface can host it and none has to.

This used to be a panel inside `@dsh-portable/dcode-ui`. It is now its own
roster row, with its own dictionaries, its own Remote lifecycle and its own
seat in the official DSH conversation header — so Cluster mode survives a
surface being trimmed, and a surface survives Cluster mode being disabled.

## What it shows

One Team, as the Host actually holds it:

| Section | Source |
| --- | --- |
| Agent roster (lead + teammates, live status, model, diagnostics) | `agentTeams.view` |
| Shared task board (subject, acceptance criteria, owner, readiness, write scopes) | `agentTeams.view` |
| Create, edit, claim, release, complete, reopen, reassign, delete | `agentTeams.createTask` / `agentTeams.updateTask` |
| Opening a teammate's own conversation | `ctx.sessions.refreshSubagents` + `openSubagent` |

There is no mirrored state. Task mutations are compare-and-set against the
revision the panel last read, so two operators (or an operator and the lead
agent) cannot silently overwrite each other; a stale revision comes back as a
rejection and the board reloads.

## Where it renders

Two placements, one component.

### 1. The official conversation header

The plugin registers into `conversation.session.header.actions`, which
`@deepseek-ai/dsh-client-ui-conversation` declares. Nothing else is required:
an assembly with only the official UI gets a header control that discloses the
roster and the board.

The seat asks one question before it appears. Every session has a Team view —
a solo session answers with a roster of one and an empty board — so an
unconditional control would land on every conversation in the product. The
entry therefore probes once per session and renders nothing until the Team has
a second member or a shared task. That test is about Teams, not about any one
distribution's preset names, so the plugin stays portable.

### 2. Any surface that wants to seat it

The plugin publishes one cordis service:

```ts
const cluster = ctx.get('cluster')          // never `ctx.inject(['cluster'])`
if (cluster?.available === true) render(<cluster.Panel sessionId={id} />)
```

`ctx.get` rather than a cordis injection is the whole point of the seam. A
surface that injected this service would refuse to render at all in an
assembly that trimmed Cluster mode; a surface that probes for it renders the
same page minus one section. `@dsh-portable/dcode-ui` consumes it exactly this
way — it declares no dependency on this package, not even a type import, and
restates the two-field face structurally.

The published `Panel` is closed over its dependencies at plugin-apply time, so
a host owes it nothing but a mount point: no provider to wrap it in, no
runtime object to thread through, no theme to pass.

## Registration order

`inject` cannot name `remote.agentTeams`: the namespace does not exist until
this plugin's own `$mount` call resolves, and `inject` is evaluated before the
plugin body runs. So the body is staged:

```
apply
├── effect: register dictionaries
└── effect: await ctx.remote.$mount(agentTeamsRemote)
    └── ctx.inject(['remote.agentTeams', 'sessions', 'slots', 'locale'])
        ├── new ClusterService(scope, deps)      → publishes ctx.cluster
        └── slots.inject('conversation.session.header.actions', …)
```

Three properties follow from that shape:

- **the service is evidence, not a claim.** It is constructed only inside the
  namespace injection, so a host that finds a value on `ctx.cluster` knows the
  Team Remote answered on this page. `available` is therefore a constant, not
  a probe;
- **disposal unwinds inward-out.** Unloading the plugin disposes the surfaces
  first and the Remote namespace second, never the reverse;
- **a missing capability is not a failure.** An assembly whose host never
  mounted the `agent-team` row cannot answer `agentTeams.*`. The mount failure
  is reported once and the plugin stays loaded and inert — which is the state
  every host already handles — instead of failing its fiber.

The distribution's runtime disables this row alongside the `agent-team` host
row whenever the Crew preset did not pass capability measurement
(`reconcileCrewRuntime`), so in a build without Crew the plugin is not loaded
at all rather than loaded and empty.

## Theming

The panel's stylesheet reads `--zc-*` tokens, and `tokens.module.css` defines
each of them as `var(--zx-<same-name>, <standalone value>)`.

Inside a host workbench that publishes the `--zx-*` scale, the panel adopts
that scale exactly and cannot drift from the surrounding chrome. Everywhere
else it falls back to values derived from the Host's own `--dsw-alias-*` theme
aliases — written as mixes of the label colour into transparency, so one
declaration is correct on a near-black and a near-white ground alike and this
package needs no light branch of its own.

## Layout

| Path | What it is |
| --- | --- |
| `src/index.ts` | host half: an empty plugin, so the browser half can be a roster row |
| `src/contract.ts` | the service name and the two-field face, free of React and cordis |
| `src/client/index.ts` | the plugin body: Remote mount, service, header seat |
| `src/client/service.ts` | `ClusterService`, the cordis owner of the surface |
| `src/client/actions.ts` | the Team Remote, re-addressed to the session that owns the Team |
| `src/client/deps.ts` | what the panel is given, and `useAsync` |
| `src/client/model.ts` | every decision the panel makes, testable without a DOM |
| `src/client/ClusterPanel.tsx` | the roster and the board |
| `src/client/HeaderAction.tsx` | the official-UI seat |
| `src/client/locales.ts` | this package's own dictionaries (`cluster` namespace) |
