# T-102 schema diff script: plan

No separate spec: a script over the existing generated format, no new data format ([[ADR-011 Process per task]]). Branch `feat/t-102-schema-diff`. One task.

## Global Constraints

- Stack and rules as in `CLAUDE.md`: strict TypeScript, Node 24 running `.ts` directly (like the other scripts), zod from `scripts/schema-model.ts` (`SchemaModel`) to validate both inputs. No new dependency.
- Never edit `src/data/schema/*.json`. Tests use small hand-written schemas built in the test file (synthetic), not the real JSON.
- Every new check must be shown failing once against a deliberate break, then restored.
- The commit trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and a second line `Claude-Session: https://claude.ai/code/session_01Tm6fHYh6hznuPJwtfBDup7`. Conventional Commits, small commits. Stage specific files only (some `docs/` files show as modified because of CRLF only: never stage or restore them). Do not push or merge. Do not dispatch subagents.
- Run before reporting: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` (give exit codes). Do not run two builds at once.

## Task 1: `scripts/schema-diff.ts`

**Files:** `scripts/schema-diff.ts` and `scripts/schema-diff.test.ts` (new), `package.json` (`schema-diff` script; add the test file to `test`), `docs/maintenance.md` (step 4 only).

1. `diffSchemas(oldS, newS)` (exported, pure) returns `{ added, removed, changed }` over **element paths**. A path is the slash-joined element tags from the root (`FIToFICstmrCdtTrf/GrpHdr/MsgId`), built by walking `complexTypes` from the root type (the type named by `root`'s element: look at how `src/lib/schema-tree.ts` or `src/lib/resolver.ts` resolves the root and reuse it if it is importable from a script; otherwise follow the JSON: read the real file's top for the shape). Elements with `any: true` have no tag: path them as `<parent>/#any`. Guard against a type that contains itself (stop on a type already on the current path). `changed` lists, per path, which of `type`, `min`, `max`, `isoName`, `definition` differ, with old and new values. Also report, as a second section, **types**: complex or simple types added or removed by name, and for simple types present in both, code values added or removed (`codes` entries are strings or `{code, ...}`; compare by code) and changed pattern, length or base. Constraints (`constraints[]`): added, removed or changed by `name`.
2. CLI: `node scripts/schema-diff.ts <old.json> <new.json>` prints sections `Elements added (N)`, `Elements removed (N)`, `Elements changed (N)`, `Types added/removed/changed`, `Constraints ...`, one item per line, sorted, and `No differences.` when everything is empty. Exit 0 either way (a diff is information). A missing file or a file that fails `SchemaModel` exits 1 with the zod message. Run the CLI only when the file is the entry point (so the test can import the function), in the style of the other scripts.
3. Tests (`node:test`, synthetic schemas): identical schemas give empty results; an added element, a removed element, a changed `max` and a changed `definition` each appear in the right section with the right path; an element added deep inside a shared type appears under **every** path that reaches that type; a code added to a simple type; a self-containing type does not loop. Show a test failing once (for example make `changed` ignore `max`), then restore.
4. `package.json`: `"schema-diff": "node scripts/schema-diff.ts"`. Add the test file to `test`.
5. `docs/maintenance.md`: step 4 becomes built: `npm run schema-diff -- <old.json> <new.json>` prints added, removed and changed elements, types and constraints; keep the rest of the step's meaning. Change only that step. Prove it on real data: copy the real JSON to the scratchpad or a temp path outside the repo, edit the copy by hand (remove one element, change one `max`, add one code), run the CLI on the pair and show the output in your report.
