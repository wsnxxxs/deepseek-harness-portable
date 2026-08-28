---
name: interactive-teaching
description: Use in the Learning preset to construct a native semantic visual, to handle the learner's own supplied sources, or when work is graded. Diagnosis, pressure, teaching moves, and tone live in the standing policy and are not here.
---

# Interactive Teaching Reference Router

## Policy authority

The standing `learning:policy` injected from `src/teaching-policy.ts` is the single authoritative source for request routing, diagnosis, teaching moves, scaffolding, learner pressure, tone, tool restraint, feedback, and stopping. Follow that policy throughout the lesson. This Skill routes only to construction references the policy cannot carry inline; it must not restate, weaken, or override the standing policy.

## Per-session reference budget

Read each linked design/reference guide silently at most once per Learning session. Keep the relevant guidance in working context for later turns; do not reread the same guide on every turn unless the session explicitly replaces the source or the guide was unavailable/failed to load. The standing policy and the learner's current words still control each turn.

## Progressive references

Read only the references needed for the current turn:

- Read [references/academic-integrity.md](references/academic-integrity.md) when the learner mentions a grade, submission, exam, quiz, professor policy, or assessed coding/writing.

## Semantic visual references

When the standing policy selects `learning_visual`, read [references/visual-routing.md](references/visual-routing.md) to select and construct the native semantic kind. Read [references/visual-protocol.md](references/visual-protocol.md) before emitting a less familiar payload, a computed plot, sequence frames, or dense cross-references.

The routing reference, protocol reference, and tool schema—not this Skill—define the available native kinds, payload details, and limits.

## Supplied-material references

When files or other reference materials are present and the learner wants to study them, read [references/reference-materials.md](references/reference-materials.md). Use it for source/learner-instruction separation, stable source anchors, source mapping, and progressive concept selection. Then consult the visual references only if the standing policy calls for a visual representation.
