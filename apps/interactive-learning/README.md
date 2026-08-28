# Interactive Learning Experience Pack

`@dsh-portable/interactive-learning` adds an optional `learning` Agent preset to
DeepSeek Harness. It adds a learning experience without changing the default
tools or behavior of Standard, Code, Minimal, or Cordis.

The product source of truth for user behavior, information architecture, and
scope is [`docs/product/learning-mode.md`](../../docs/product/learning-mode.md).
This README keeps only package-level integration, boundaries, and maintainer
guidance.

## Capabilities

- Ordinary conversation remains the default; Learning is enabled only when the user selects it.
- The preset supports concept explanations, question clarification, and source-grounded learning with continuous session context.
- When a user mentions material with `@`, the Host creates or updates a learning vault in the workspace. The model reads it through confined read-only capabilities.
- The current session has Conversation / Route / Notes; the external Learning Library has Material / Saved / Concept cards / Review.
- Semantic visuals and understanding checks are optional enhancements. If a Client cannot render one, the ordinary prose must still carry the answer.
- Concept cards are proposed only after independent transfer evidence and are written only after confirmation; the model has no filesystem write tool.

## User flow

1. Select Learning for a new conversation, or continue using ordinary conversation.
2. Start with Understand a concept, Resolve a question, or Study a material; quick starts insert templates without inventing a topic.
3. Follow-up questions and short replies inherit the current learning segment. An explicit task switch or ending returns to ordinary routing.
4. Save a useful answer or session note to the Learning Library when it should persist. Only confirmed concept cards enter Review.

## Package boundaries

- `preset/learning/` mounts the Learning persona, teaching Agent, material reading, Skills, and optional Web search. It does not mount shell, editing, or automation tools.
- The Host owns material ingest, extraction, anchors, and note/concept-card writes. The model can read only within the current learning vault.
- `LearnerState` is a tentative teaching state for the current session, not a cross-session profile, learning-style classifier, or long-term mastery record.
- Visuals use declarative native components. The main conversation does not wait for a Client and does not turn every round into a checkpoint ritual.

## Directory responsibilities

| Path | Responsibility |
| --- | --- |
| `preset/learning/` | Preset descriptor, composition, and teaching Skill |
| `src/agent.ts`, `src/teaching-policy.ts` | Mode behavior and teaching policy |
| `src/ingest/`, `src/topic-vault.ts` | Material parsing, vault storage, and anchor infrastructure |
| `src/learner-state*`, `src/concept-*` | Session state, concept cards, and confirmation flow |
| `src/client/` | In-conversation learning UI, Learning Library, and tool-result renderers |
| `src/protocol*` | Versioned declarative activity protocols; retired V1/V2 payloads parse for replay only |

## Development and verification

After source changes, the packaged desktop runtime needs a rebuild and restart:

```powershell
pnpm --filter @dsh-portable/interactive-learning run build
pnpm --filter @dsh-portable/interactive-learning run test:source
```

Before publishing, also run the package-level check:

```powershell
pnpm --filter @dsh-portable/interactive-learning run test:package
```

The credential-free offline teaching evaluation is optional:

```powershell
pnpm --filter @dsh-portable/interactive-learning eval
```

Protocol fields, renderer details, and test scope are authoritative in the
source and package scripts; the README intentionally does not duplicate them.

## External activation

Import the bootstrap before constructing the Loader, agent loop, or resuming a
configured session:

```ts
import '@dsh-portable/interactive-learning/bootstrap'
```

Add the package to the Host composition and let the Web module loader discover
its `dsh.client` declaration:

```yaml
- id: interactive-learning
  name: '@dsh-portable/interactive-learning'
```

Install the preset and restart Host/Web:

```powershell
dsh-learning-preset install --home <DSH_HOME>
```

Select Learning in a new conversation. Uninstall with:

```powershell
dsh-learning-preset uninstall --home <DSH_HOME>
```

The installer records managed ownership and updates only files that remain
owned; user-edited files are preserved.

## Not included

Arbitrary executable widgets, model-driven filesystem writes, implicit
cross-session profiles, automatic knowledge graphs, or silently turning every
learning answer into a card.
