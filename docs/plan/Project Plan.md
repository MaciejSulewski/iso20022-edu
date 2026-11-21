# ISO 20022 Learning Site — Design & Plan (this session: plan only)

## Context
Personal, public, non-affiliated project: a static interactive site teaching ISO 20022 (bank payments) to new bank staff/analysts who know payments but not MX messages. Built over multiple sessions; this session only produces the plan.

Decisions made:
- **Stage 1 scope: pacs.008 only.** Other messages come in Stage 2.
- **Base ISO 20022 definitions** (CBPR+ is not public). Version: latest pacs.008 published on iso20022.org (expected pacs.008.001.13; verify at start).
- **English content.** Code keeps locale-keyed text so Polish can be added later.
- **Full message tree**, every element explorable.
- **GitHub Pages** hosting.
- **Licences:** code MIT, own content CC BY 4.0, disclaimer "educational, not affiliated with ISO/Swift".
- **Reviewer:** the user does the subject-matter review.

Project folder: `C:\Users\Maciej\Projects\iso20022-edu`. The GitHub remote doesn't exist yet; Phase 0 creates it.
Plans and docs are managed in **Obsidian**, with `iso20022-edu/docs/` as the vault.

**What happens in this session once the plan is approved:** I create only the planning notes. That means `docs/Home.md`, `docs/plan/Project Plan.md` (this plan), `docs/plan/Ledger.md` and `docs/decisions/ADR-*.md`. No code, no `git init`, no GitHub; those are Phase 0 in the next session.

## 1. Tech stack
| Piece | Choice | Why |
|---|---|---|
| Site generator | **Astro** (`output: 'static'`) | Content collections with zod schemas make the build fail on broken content; built-in i18n routing for later. |
| Interactivity | Astro components + small vanilla TS scripts, no UI framework | The XML viewer, flow stepper and quiz are small. |
| Structure data | **Generated from the official XSD** by an import script | A full tree has hundreds of elements; hand-typing them is error-prone and must be redone every version. |
| Explanations | **YAML overlay** written by hand, plus Markdown lessons | Plain-English teaching layer on top of the generated structure. |
| XML parsing | `fast-xml-parser` (`preserveOrder`) at build time, used both to read the XSD and to render samples | One dependency; nothing parsed in the browser. |
| Sample validation | `xmllint --schema` in CI | Proves samples are valid against the official XSD. |
| Deploy | GitHub Actions `withastro/action` → GitHub Pages | Standard and free. |

## 2. Repository structure
```
iso20022-edu/
  astro.config.mjs            # site + base for Pages; i18n { defaultLocale: 'en', locales: ['en'] }
  src/
    content.config.ts         # zod schemas for all collections
    data/schema/pacs.008.001.13.json   # GENERATED from XSD; do not edit
    content/
      annotations/pacs.008.001.13.yaml # hand-written overlay
      messages/pacs.008.001.13.yaml    # metadata: name, purpose, sources, lastReviewed
      samples/pacs.008-basic.xml (+ .yaml metadata)
      flows/pacs008-agent-chain.yaml
      mappings/mt103-pacs008.yaml
      glossary.yaml
      quizzes/pacs008-basics.yaml
      lessons/en/*.md
    i18n/ui.en.json, i18n/t.ts
    components/ AnnotatedXml, ElementPanel, SchemaTree, FlowPlayer, MappingTable, Quiz, GlossaryTerm
    pages/ index, messages/[id], messages/[id]/tree, flows/[id], mappings/[id], glossary, quizzes/[id]
  scripts/
    import-xsd.ts             # XSD → data/schema/<id>.json
    check-content.ts          # cross-reference and coverage checks
  vendor/xsd/                 # official XSDs (commit only if iso20022.org terms allow; otherwise fetch in CI)
  .github/workflows/deploy.yml
  CLAUDE.md                   # working rules for agents (see Phase 0)
  CONTRIBUTING.md             # same rules for humans (short)
  LICENSE, CONTENT-LICENSE
  docs/                       # = Obsidian vault (versioned with the code)
    .obsidian/                # app.json, core plugins committed; workspace*.json gitignored
    Home.md                   # vault entry: links to plan, ledger, decisions
    plan/Project Plan.md      # this plan, moved here in Phase 0
    plan/Ledger.md            # task ledger for user + agents (section 9)
    decisions/ADR-001 Astro.md, ADR-002 Base ISO.md ...   # one note per decision
    sessions/2026-11-21.md    # one short log per working session
    sources.md, maintenance.md
```
Astro must not treat `docs/` as content: it lives outside `src/`, so it isn't built or published.

## 3. Data model
Localized text: `{ en: string, pl?: string }`.

**Generated schema** (`data/schema/<id>.json`, from the XSD's types and its `xs:documentation` Name/Definition):
```json
{ "id": "pacs.008.001.13", "root": "FIToFICstmrCdtTrf",
  "complexTypes": { "GroupHeader113": { "isoName": "GroupHeader113", "definition": "...",
      "elements": [ { "tag": "MsgId", "isoName": "MessageIdentification", "type": "Max35Text",
                      "min": 1, "max": 1, "definition": "..." } ],
      "choice": false } },
  "simpleTypes": { "Max35Text": { "base": "string", "minLength": 1, "maxLength": 35 },
                   "ChargeBearerType1Code": { "base": "string", "codes": ["DEBT","CRED","SHAR","SLEV"] } } }
```
The tree is resolved by walking types from the root. Repeated types (BranchAndFinancialInstitutionIdentification, PartyIdentification, PostalAddress) are defined once.

**Annotation overlay** (hand-written, optional per element):
```yaml
message: pacs.008.001.13
byPath:                      # the element's tag path from the root, no indexes
  GrpHdr/MsgId:
    explanation: { en: "Unique reference the instructing agent gives the whole message..." }
    examples: ["MSG-20261121-0001"]
    notes: { en: "Must be unique per sender for a pre-agreed period." }
byType:                      # applies wherever this type appears
  BranchAndFinancialInstitutionIdentification8:
    explanation: { en: "Identifies a bank, usually by BIC..." }
codes:
  ChargeBearerType1Code: { SHAR: { en: "Charges are shared..." } }
```
How a click resolves an element: the generated structure (ISO name, definition, type and its constraints, multiplicity, which gives mandatory or optional), plus the overlay by path, falling back to the overlay by type. Elements without an overlay still show the official ISO definition.

**Other models:**
- **Message:** `id, family, name, purpose, mtEquivalent, sources[{title,url,retrieved}], lastReviewed{date,by}`.
- **Sample:** `id, message, file, title, scenario`. Data is synthetic: fictional BICs and test IBANs, labelled as fictional.
- **Flow:** `id, title, participants[{id, role, label}], steps[{from, to, message, sample?, description}]`.
- **Mapping:** `id, from: MT103, to, rows[{mt: ":32A:", mtName, mx: [paths], rule, caveat?}]`, written from public material in your own words.
- **GlossaryTerm:** `id, term, abbr?, definition, related[], messages[]`.
- **Quiz:** `id, title, questions[{type: single|multi, prompt, options[], correct[], explanation, ref?{message, path}}]`.

**Checks:**
- zod validates every content file's shape.
- `check-content.ts` fails the build when:
  - a sample element doesn't resolve in the schema;
  - an overlay path, quiz ref or mapping path doesn't exist;
  - a flow points to a missing sample.
- It reports annotation coverage (the share of elements in the samples that have an overlay).

## 4. UI (key screens)
- **Annotated XML:** each element is a `<button>`. Click or tap opens ElementPanel, showing:
  - ISO name, definition and plain-English explanation;
  - type and constraints, multiplicity, and a mandatory/optional badge;
  - allowed codes and examples.
  
  The panel sits on the side on desktop and becomes a bottom sheet on mobile. Subtrees collapse. Everything works by keyboard, and `#GrpHdr/MsgId` links straight to an element.
- **Full tree explorer:** a collapsible tree of the whole message, including elements the sample doesn't use. It filters by mandatory-only and searches by tag or name. It shares ElementPanel with the XML view.
- **Flow player:** an SVG sequence diagram you step through with Next/Prev; it becomes a vertical step list on mobile.
- **Mapping table:** MT tag ↔ MX path; each path links into the tree.
- **Quiz:** scored in the browser, with an explanation after each answer.

## 5. Phased plan (each phase is roughly one session)
0. **Repo, GitHub and working rules.**
   - **Local:** `git init` in `iso20022-edu`, `.gitignore` (node_modules, dist, `docs/.obsidian/workspace*.json`), default branch `main`.
   - **GitHub auth (you):** install the GitHub CLI and run `gh auth login` (browser OAuth; it stores the token in Windows Credential Manager, so no token is ever pasted into a chat). If you prefer a personal access token, create a **fine-grained token** limited to the single repo with Contents, Pages, Workflows and Administration (create repo) = read/write, a 90-day expiry, and a calendar reminder to rotate it. Never commit it or paste it into a session.
   - **Remote:** `gh repo create iso20022-edu --public --source . --push`. Then turn on Pages: Settings → Pages → Source: GitHub Actions. Deploys use the built-in `GITHUB_TOKEN`, so CI needs no personal token.
   - **Working rules** (written to `CLAUDE.md` plus a short `CONTRIBUTING.md`):
     - Work happens on branches (`feat/…`, `fix/…`, `docs/…`). Change `main` only through a PR that you merge, and turn on branch protection for `main` (PR required, CI must pass).
     - Commits are small and use Conventional Commits (`feat:`, `fix:`, `docs:`, `content:`, `chore:`).
     - Agents never push to `main`, force-push, delete branches, or change repo settings without your OK.
     - Every session starts by reading `docs/Home.md` and `docs/plan/Ledger.md`. It ends by updating the ledger and writing `docs/sessions/<date>.md` (what was done, what's next, any blockers).
     - Content rules: only public sources, everything recorded in `sources.md`, own wording, synthetic data only, never secrets or real client data.
     - `npm run build` (including the content checks) must pass before a PR.
   - **Obsidian:** open `docs/` as a vault. Move this plan into `docs/plan/Project Plan.md`, create `Home.md`, the Ledger, and ADR notes for the decisions already made (Astro, base ISO, English first, full tree, licences, Pages). Optional: install the community plugin **Tasks** for ledger queries; the ledger stays plain Markdown so it works without it.
1. **Scaffold.** Astro project, Base layout, i18n helper, licences, disclaimer, deploy workflow. A hello page goes live on Pages.
2. **XSD import.** Download the latest pacs.008 XSD, then write `import-xsd.ts` with a small test on a snippet of the XSD (sequence, choice, multiplicity, codes, documentation). Generate the JSON.
3. **Prototype: annotated XML.** One synthetic, xmllint-valid pacs.008 sample (single transaction, SHAR, debtor agent → creditor agent). Build AnnotatedXml and ElementPanel for desktop and mobile, plus `check-content.ts`. Annotate the key path (about 30 elements); everything else falls back to the ISO definition. **You review.**
4. **Full tree explorer.** SchemaTree page, mandatory filter, search, deep links.
5. **More pacs.008 depth.** Overlay by type for shared components, explanations for codes, a second sample (intermediary agent, structured remittance).
6. **Flow:** the pacs.008 agent chain (debtor → debtor agent → intermediary → creditor agent → creditor), with serial and cover variants described.
7. **MT103 → pacs.008 mapping.**
8. **Glossary and quiz** for pacs.008.
9. **Hardening.** Accessibility pass, mobile QA, Pagefind search (optional).

**Stage 2 (later):**
- Add messages: pacs.002, pacs.004, camt.056 (+ camt.029), pain.001, camt.053, camt.054. Each one is new XSD import + overlay + sample.
- Multi-message flows: rejection, return, cancellation, statements.
- Polish locale.

## 6. Questions still open
1. **Exact version:** confirm the latest pacs.008 on iso20022.org at Phase 2, and decide whether to also keep .08 because it is widely used in practice.
2. **XSD redistribution:** check iso20022.org terms before committing XSDs to the repo. The fallback is fetching them in CI.
3. **Repo and URL name:** `<user>.github.io/iso20022-edu` or a custom domain. No analytics proposed.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Inaccurate explanations | Official ISO definition always shown next to own text, `lastReviewed`, your review at Phase 3, a "report an error" issue template, the disclaimer. |
| Full tree is large (hundreds of elements, deep nesting, recursion) | Generated from XSD, overlay by type, lazy expansion in the tree view. |
| XSD quirks (choices, `xs:any` in SupplementaryData, extensions) | The import test covers each construct; unknown constructs fail loudly. |
| Copyright | ISO definitions shown with attribution; nothing copied from MyStandards or Swift; `docs/sources.md` lists every source. |
| XML hard to read on mobile | Collapsible view and bottom sheet, tested in Phase 3. |
| Version drift | Versioned file ids plus the annual routine below. |

## 8. Maintenance through yearly ISO/Swift releases
`docs/maintenance.md` checklist:
1. Check iso20022.org for a new pacs.008 version (and Stage 2 messages).
2. Download the XSD and run `import-xsd.ts` for the new id. A script prints the diff of the old and new generated JSON: added, removed and changed elements and types.
3. Copy the overlay and samples to the new id and fix whatever `check-content.ts` flags (dead paths, unresolved elements). xmllint validates the samples.
4. Write explanations for new elements, update `sources.retrieved` and `lastReviewed`, and mark the old version `deprecated` (keep it while it's still in use).
5. Add a changelog entry on the site.

## 9. Task ledger (`docs/plan/Ledger.md`)
This is a plain Markdown checklist that both Obsidian and agents can read and edit.
- Each task is one line: `- [ ] T-012 Write import-xsd.ts test #agent #phase/2 ⏫`.
- Owner tags: `#me` for you (accounts, tokens, review, merging PRs, decisions) and `#agent` for Claude sessions.
- Status is the checkbox, plus `#blocked` with a reason. A done task gets `✅ YYYY-MM-DD` and a link to its PR or session note.
- IDs never change or get reused, so session notes and commits can refer to `T-012`.

Layout:
```markdown
# Ledger
## Now           (max 3 open tasks)
## Next          (per phase)
## Waiting on me (#me tasks that block agents)
## Done
## Decisions     (links to ADR notes)
```
Initial tasks:
- `#me`:
  - install the GitHub CLI, run `gh auth login` (or create a fine-grained token);
  - choose the repo name;
  - turn on Pages and branch protection;
  - install Obsidian and open `docs/`;
  - review the Phase 3 prototype;
  - merge PRs.
- `#agent`:
  - Phase 0 files (git init, .gitignore, CLAUDE.md, CONTRIBUTING.md, vault notes, ledger, ADRs);
  - Phases 1–9 broken into tasks of about half a session each.

## Verification (when built)
- `npm run build` passes. Breaking a path in a sample or overlay makes the build fail.
- The `import-xsd` test passes; CI xmllint validates samples.
- `npm run preview`: click mandatory and optional elements in a desktop and a mobile viewport. Check the panel contents, keyboard navigation, deep links, and tree filter and search.
- The Pages URL works with the correct base path.
