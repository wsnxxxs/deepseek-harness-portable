# DCode Codex-style workbench QA

## Visual references

- Reference chrome: `C:/Users/Ryan/Pictures/Screenshots/屏幕截图 2026-08-29 024318.png`
- Reference compact state: `C:/Users/Ryan/Pictures/Screenshots/屏幕截图 2026-08-29 024323.png`
- Implementation panel state: `design-qa-implementation-panel-1814x1127.png`
- Implementation compact state: `design-qa-implementation-empty-878x1127.png`

The reference and implementation were opened together for comparison. The implementation keeps the existing DCode tokens and primitives while matching the reference's dark chrome, compact controls, floating card, border contrast, and rounded corners.

## Checked states

- Wide panel state at 1814×1127: the right card floats over the workbench at the upper-right and the center remains full width.
- Compact state at 878×1127: the session rail and preview card can be independently collapsed without leaving a grid gap.
- Narrow viewport at 420×700: the card is capped by `min(300px, calc(100vw - 32px))` and remains vertically scrollable.
- Top controls: Share/export, pinned summary, preview/details, and session-rail layout controls are separate buttons. The left session-rail toggle remains available at the left edge of the workbench bar.

## Interaction checks

- Preview button hides only the floating card.
- Summary button changes only the pinned summary visibility.
- Session-rail button collapses only the left session list.
- Workspace controls use the existing workspace navigation and native directory picker path.
- Changed files continue to open the existing `DiffViewer`; details continue to resolve tool arguments/output and file contents.
- Trace rows consume the DSH `trajectory` target and can open the corresponding details view.
- Share calls the injected DSH session-log exporter and exposes preparing/success/failure states.

## Verification

- `pnpm --filter @dsh-portable/dcode-ui test` — passed: 57 tests, 0 failures.
- DCode preview booted successfully after removing the duplicate `settings.section` registration.

final result: passed
