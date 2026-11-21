# Ledger

Rules:
- One task per line: `- [ ] T-NNN description #me|#agent #phase/N`.
- IDs never change or get reused.
- Done means `[x]` + `✅ YYYY-MM-DD` + a link to the PR or session note.
- Blocked means `#blocked` + the reason.
- Agents read this note at the start of every session and update it at the end. Details: [[Project Plan]].

## Now
(max 3 open tasks)
- [ ] T-030 Confirm the latest pacs.008 version on iso20022.org and check XSD and definition redistribution terms. Done when: `docs/sources.md` records the terms and the decision "commit" or "fetch in CI", with an ADR if it changes [[ADR-006 Licences]]. Runs first: the answer decides whether definitions go in the repo #agent #phase/2
- [ ] T-031 `import-xsd.ts` + test on an XSD snippet (sequence, choice, multiplicity, codes, documentation); the snippet fixture is synthetic and hand-written, not an ISO excerpt, because the XSD is not committed ([[ADR-012 XSD not committed]]). Done when: the test covers each construct and unknown constructs fail loudly #agent #phase/2
- [ ] T-032 Generate `src/data/schema/pacs.008.001.NN.json`. Done when: the file validates against its zod schema and is not hand-edited #agent #phase/2 #blocked T-104 (XSD URL unknown)

## Waiting on me
- [ ] T-104 In a browser: read the iso20022.org terms, confirm the latest pacs.008 version and find the direct XSD download URL; record all three in docs/sources.md and reopen [[ADR-012 XSD not committed]] if redistribution is clearly allowed #me #phase/2

## Next
### Phase 0: repo, GitHub, working rules
### Phase 1: scaffold
### Phase 2: XSD import
- [ ] T-105 Fetch script for the pacs.008 XSD (URL from T-104) + gitignore + run fetch and import-xsd in npm run build and CI, per [[ADR-012 XSD not committed]]. Done when: a clean clone builds with no committed XSD or schema JSON #agent #phase/2 #blocked T-104 (XSD URL unknown)
- [ ] T-035 Write `docs/maintenance.md` (yearly update routine). Done when: it follows section 8 of [[Project Plan]] #agent #phase/2
### Phase 3: annotated XML prototype
- [ ] T-040 Synthetic pacs.008 sample, valid under xmllint; xmllint step in CI. Done when: CI fails on an invalid sample #agent #phase/3
- [ ] T-041 Zod schemas in `content.config.ts` (message, annotations, sample). Done when: a malformed content file fails the build #agent #phase/3
- [ ] T-038 Unit tests for the schema resolver in `lib/`. Done when: they cover path lookup, type fallback and choice elements #agent #phase/3
- [ ] T-042 AnnotatedXml (Preact island) + ElementPanel (side panel on desktop, bottom sheet on mobile, keyboard, deep links). Complex: spec first ([[ADR-011 Process per task]]). Done when: clicking an element opens the panel, `#GrpHdr/MsgId` deep-links, and it works by keyboard #agent #phase/3
- [ ] T-043 `check-content.ts` (unresolved elements, dead overlay paths, coverage report). Done when: breaking a path fails the build #agent #phase/3
- [ ] T-044 Overlay for about 30 key elements. Done when: coverage report shows them annotated #agent #phase/3
- [ ] T-046 XML colour legend, hover previews, beginner/full mode. Done when: no state relies on colour alone #agent #phase/3
- [ ] T-045 Review the prototype for accuracy and usability #me #phase/3
### Phase 4: full tree explorer
- [ ] T-050 SchemaTree page with lazy expansion, mandatory-only filter, search, deep links. Done when: the full tree loads lazily and filters work #agent #phase/4
- [ ] T-051 Split-pane workspace (XML | tree | details; tabs on mobile). Complex: spec first. Done when: panes resize on desktop and become tabs on mobile #agent #phase/4
- [ ] T-052 Ctrl+K command palette with build-time element index; Pagefind for lessons and glossary (moved from T-101). Complex: spec first. Done when: Ctrl+K jumps to an element, term and lesson #agent #phase/4
### Phase 5: pacs.008 depth
- [ ] T-060 Overlay by type for shared components, plus code explanations. Done when: shared types have one overlay entry used everywhere #agent #phase/5
- [ ] T-061 Second sample (intermediary agent, structured remittance). Done when: it passes xmllint and check-content #agent #phase/5
- [ ] T-092 Draft lessons from public sources in own wording, recorded in `sources.md`. Done when: the "Start here" path links a lesson at each step #agent #phase/5
- [ ] T-093 Review the lessons for accuracy #me #phase/5
### Phase 6: flow
- [ ] T-070 FlowPlayer + pacs.008 agent-chain flow (serial and cover described). Complex: spec first. Done when: Next/Prev steps through every participant, and mobile shows a step list #agent #phase/6
- [ ] T-071 Animate the flow diagram, respecting `prefers-reduced-motion`. Done when: motion stops with the setting on #agent #phase/6
### Phase 7: mapping
- [ ] T-080 MT103 → pacs.008 mapping table from public sources, own wording. Done when: every row path resolves in the schema #agent #phase/7
- [ ] T-081 Review the mapping #me #phase/7
### Phase 8: glossary and quiz
- [ ] T-090 Glossary for pacs.008 terms, linked from ElementPanel. Done when: related terms and messages resolve #agent #phase/8
- [ ] T-091 pacs.008 quiz. Done when: scoring works in the browser and each answer has an explanation #agent #phase/8
### Phase 9: hardening
- [ ] T-100 Final accessibility pass, mobile QA, Lighthouse check across all pages. Done when: scores are recorded in the session note #agent #phase/9
- [ ] T-102 Schema diff script (old vs new generated JSON). Done when: it prints added, removed and changed elements #agent #phase/9

## Done
- [x] T-025 Review the look and landing page (light and dark, mobile) #me #phase/1 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-026 Add the build check as a required status check in the `protect-main` ruleset, once T-022 and T-029 have run once #me #phase/1 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-029 PR CI workflow: `npm run build`, `astro check`, check-content on every PR. Done when: a PR shows the check and a broken build turns it red. #agent #phase/1 ✅ 2026-11-21 [PR #17](https://github.com/MaciejSulewski/iso20022-edu/pull/17)
- [x] T-022 Deploy workflow (`withastro/action`). Done when: the landing page is live on Pages #agent #phase/1 ✅ 2026-11-21 [PR #18](https://github.com/MaciejSulewski/iso20022-edu/pull/18)
- [x] T-037 Accessibility (axe) and JS-size checks in CI. Done when: CI fails on an axe error or a page over about 100 KB JS #agent #phase/1 ✅ 2026-11-21 [PR #19](https://github.com/MaciejSulewski/iso20022-edu/pull/19)
- [x] T-103 Grant the GitHub CLI the workflow scope: run `gh auth refresh -h github.com -s workflow` and approve in the browser (pushes of .github/workflows/* are rejected without it) #me #phase/1 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-033 Create `docs/sources.md` (required by `CLAUDE.md`). Done when: it lists every source used so far, with URL and retrieval date #agent #phase/1 ✅ 2026-11-21 [PR #6](https://github.com/MaciejSulewski/iso20022-edu/pull/6)
- [x] T-020 Scaffold Astro: static output, base path, strict TS, `astro check`. Done when: `npm run build` passes and the site is served under `/iso20022-edu/` in `npm run preview` #agent #phase/1 ✅ 2026-11-21 [PR #7](https://github.com/MaciejSulewski/iso20022-edu/pull/7)
- [x] T-028 Pin Node (`.nvmrc` + `engines`), commit lockfile, add lint and format, add Dependabot. Done when: `npm ci` works on a clean clone and CI uses the pinned Node #agent #phase/1 ✅ 2026-11-21 [PR #8](https://github.com/MaciejSulewski/iso20022-edu/pull/8)
- [x] T-016 Add Tailwind v4 and Preact integration ([[ADR-009 TypeScript and Tailwind]]). Done when: a test island hydrates and a `dark:` class works #agent #phase/1 ✅ 2026-11-21 [PR #10](https://github.com/MaciejSulewski/iso20022-edu/pull/10)
- [x] T-027 i18n `en`, Base layout, `t()` helper, `ui.en.json`. Done when: the layout renders text only through `t()` #agent #phase/1 ✅ 2026-11-21 [PR #11](https://github.com/MaciejSulewski/iso20022-edu/pull/11)
- [x] T-021 Disclaimer and licence footer. Done when: it shows on every page, linking both licences #agent #phase/1 ✅ 2026-11-21 [PR #12](https://github.com/MaciejSulewski/iso20022-edu/pull/12)
- [x] T-036 404 page, favicon, page meta and social card, robots and sitemap. Done when: Lighthouse SEO has no failures on the landing page #agent #phase/1 ✅ 2026-11-21 [PR #13](https://github.com/MaciejSulewski/iso20022-edu/pull/13)
- [x] T-023 Design tokens, dark mode toggle, UI primitives (Button, Badge, Tabs, Sheet). Done when: each primitive renders in light and dark and is keyboard operable #agent #phase/1 ✅ 2026-11-21 [PR #14](https://github.com/MaciejSulewski/iso20022-edu/pull/14)
- [x] T-024 Landing page with "Start here" guided path and `localStorage` progress. Done when: progress survives a reload and the path works on mobile width #agent #phase/1 ✅ 2026-11-21 [PR #15](https://github.com/MaciejSulewski/iso20022-edu/pull/15)
- [x] T-000 Project plan, ledger and ADRs created ✅ 2026-11-21 [[2026-11-21]]
- [x] T-001 Install GitHub CLI and log in with `gh auth login` (keyring, no token pasted) ✅ 2026-11-21 [[2026-11-21]]
- [x] T-002 Repo `iso20022-edu`, URL `maciejsulewski.github.io/iso20022-edu` (no custom domain) ✅ 2026-11-21 [[2026-11-21]]
- [x] T-003 Install Obsidian and open `iso20022-edu/docs` as a vault #me #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-010 `git init`, default branch `main`, `.gitignore` (node_modules, dist, `docs/.obsidian/workspace*.json`) #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-011 Write `CLAUDE.md` (working rules for agents) and a short `CONTRIBUTING.md` #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-012 Add `LICENSE` (MIT) and `CONTENT-LICENSE` (CC BY 4.0) #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-013 Create the GitHub repo (`gh repo create --public --source . --push`) after T-001 and T-002 #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-101 Pagefind search: moved to T-052 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-014 Turn on Pages (Source: GitHub Actions) and branch protection on `main` (PR required, no status check yet, see T-026) #me #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-015 Create the "report a content error" issue template #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]

## Decisions
- [[ADR-001 Astro]]
- [[ADR-002 Base ISO]]
- [[ADR-003 English first]]
- [[ADR-004 Scope pacs.008]]
- [[ADR-005 Full tree from XSD]]
- [[ADR-006 Licences]]
- [[ADR-007 Hosting and review]]
- [[ADR-008 Obsidian vault]]
- [[ADR-009 TypeScript and Tailwind]]
- [[ADR-010 UX direction]]
- [[ADR-011 Process per task]]
- [[ADR-012 XSD not committed]]
