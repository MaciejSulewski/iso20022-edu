# Legend, hover previews, beginner/full mode (T-046)

Spec (binding): `docs/superpowers/specs/2026-11-22-xml-legend-modes-design.md`. Ledger done-when: no state relies on colour alone.

## Global constraints

Same as `docs/superpowers/plans/2026-11-21-annotated-xml-plan.md` Global constraints (t()/ui.en.json, no schema JSON in the browser, TS strict and `node --test` type stripping, ponytail full, frontend-design look with existing tokens only, AA contrast in both themes, keyboard operable, JS budget). Run npm test, lint, format:check, build, check:size, check:a11y, check:ui. Never stage the unrelated CRLF-noise docs/ files.

### Task 1: state markers, legend, hover preview, mode switch

Implement per the spec. Put pure logic (state derivation from `XmlNode.info`, first sentence, visible-rows filter for beginner mode with hidden count) in `src/lib/` with unit tests added to `npm test`; UI in `src/components/AnnotatedXml.tsx` (split out a small component only if the file becomes unwieldy). Extend `scripts/check-annotated-xml.ts` as listed in the spec's Verification section, and prove one new assertion can fail. Verify visually with Playwright screenshots (light and dark, 1280 and 390 px) read via the Read tool and fix what you see (marker alignment, tooltip placement, legend wrapping on mobile).

Done when: every state is readable without colour (check in a greyscale or forced-colours screenshot as well), the spec's Verification holds, and all commands pass.
