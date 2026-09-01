# DCode plan preview visual QA

## Comparison target

- Source visual truth: `C:\Users\Ryan\AppData\Local\Temp\codex-clipboard-f8da19f6-d5c4-4bbb-ad21-267c2502f73e.png`
- Source pixels: 657 × 489; CSS viewport represented by the capture: 657 × 489; density normalization: none.
- Intended state: completed plan proposal with a collapsed/expandable header, readable Markdown summary and implementation sections, Modify/Execute actions, and a lower-left DSH whale status mark.

## Implementation evidence

- Implementation screenshot: not captured.
- Intended implementation: the authenticated DSH desktop runtime with `dcode-ui` selected.
- The current local DSH web endpoint is protected by its launch-token exchange. The available in-app browser could open the source capture, but direct access to the running DSH endpoint was blocked before the page rendered, so no implementation image is substituted here.
- Build evidence: `pnpm --filter @dsh-portable/dcode-ui test` passed TypeScript compilation, bundle generation, 10 focused Vitest tests, and 127 Node tests.

## State and comparison

- Full-view comparison: blocked because the implementation artifact is missing.
- Focused region comparison: blocked for the same reason; the card header, Markdown rhythm, footer actions, and whale asset still need a same-viewport rendered check.
- No P0/P1/P2 visual finding is asserted without the rendered implementation image.

## Open questions

- Verify the authenticated DCode desktop runtime at 657 × 489 (or its actual content viewport) and compare the completed proposal state against the source capture.
- Verify the pending plan-review state does not show a second action footer; the implementation suppresses proposal actions during a plan transition and leaves approval to the pending interaction card.

## Implementation checklist

- [x] Parse completed and streaming `<proposed_plan>` envelopes into a dedicated preview card.
- [x] Render a lightbulb header, H1 title split, Markdown body, fold control, and DCode glass tokens.
- [x] Add localized Modify/Execute actions and refinement input.
- [x] Reuse the DSH `FishLogo` for the completed/standing-by status row.
- [x] Reuse the same card for plan-review interactions.
- [ ] Capture and compare the running DCode UI at the source viewport.

## Final result

final result: blocked
