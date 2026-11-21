# Ledger

Rules:
- One task per line: `- [ ] T-NNN description #me|#agent #phase/N`.
- IDs never change or get reused.
- Done means `[x]` + `✅ YYYY-MM-DD` + a link to the PR or session note.
- Blocked means `#blocked` + the reason.
- Agents read this note at the start of every session and update it at the end. Details: [[Project Plan]].

## Now

## Next
### Phase 0: repo, GitHub, working rules
- [ ] T-014 Turn on Pages (Source: GitHub Actions) and branch protection on `main` (PR required, CI must pass) #me #phase/0
- [ ] T-015 Create the "report a content error" issue template #agent #phase/0
### Phase 1: scaffold
- [ ] T-020 Scaffold Astro: static output, base path, i18n `en`, Base layout, `t()` helper, `ui.en.json` #agent #phase/1
- [ ] T-021 Disclaimer and licence footer #agent #phase/1
- [ ] T-022 Deploy workflow (`withastro/action`); hello page live on Pages #agent #phase/1
### Phase 2: XSD import
- [ ] T-030 Confirm the latest pacs.008 version on iso20022.org and check XSD redistribution terms (commit or fetch in CI) #agent #phase/2
- [ ] T-031 `import-xsd.ts` + test on an XSD snippet (sequence, choice, multiplicity, codes, documentation) #agent #phase/2
- [ ] T-032 Generate `src/data/schema/pacs.008.001.NN.json` #agent #phase/2
### Phase 3: annotated XML prototype
- [ ] T-040 Synthetic pacs.008 sample, valid under xmllint; xmllint step in CI #agent #phase/3
- [ ] T-041 Zod schemas in `content.config.ts` (message, annotations, sample) #agent #phase/3
- [ ] T-042 AnnotatedXml + ElementPanel (side panel on desktop, bottom sheet on mobile, keyboard, deep links) #agent #phase/3
- [ ] T-043 `check-content.ts` (unresolved elements, dead overlay paths, coverage report) #agent #phase/3
- [ ] T-044 Overlay for about 30 key elements #agent #phase/3
- [ ] T-045 Review the prototype for accuracy and usability #me #phase/3
### Phase 4: full tree explorer
- [ ] T-050 SchemaTree page with lazy expansion, mandatory-only filter, search, deep links #agent #phase/4
### Phase 5: pacs.008 depth
- [ ] T-060 Overlay by type for shared components, plus code explanations #agent #phase/5
- [ ] T-061 Second sample (intermediary agent, structured remittance) #agent #phase/5
### Phase 6: flow
- [ ] T-070 FlowPlayer + pacs.008 agent-chain flow (serial and cover described) #agent #phase/6
### Phase 7: mapping
- [ ] T-080 MT103 → pacs.008 mapping table from public sources, own wording #agent #phase/7
- [ ] T-081 Review the mapping #me #phase/7
### Phase 8: glossary and quiz
- [ ] T-090 Glossary for pacs.008 terms, linked from ElementPanel #agent #phase/8
- [ ] T-091 pacs.008 quiz #agent #phase/8
### Phase 9: hardening
- [ ] T-100 Accessibility pass and mobile QA #agent #phase/9
- [ ] T-101 Pagefind search (optional) #agent #phase/9
- [ ] T-102 Write `docs/maintenance.md` (yearly update routine) and the schema diff script #agent #phase/9

## Done
- [x] T-000 Project plan, ledger and ADRs created ✅ 2026-11-21 [[2026-11-21]]
- [x] T-001 Install GitHub CLI and log in with `gh auth login` (keyring, no token pasted) ✅ 2026-11-21 [[2026-11-21]]
- [x] T-002 Repo `iso20022-edu`, URL `maciejsulewski.github.io/iso20022-edu` (no custom domain) ✅ 2026-11-21 [[2026-11-21]]
- [x] T-003 Install Obsidian and open `iso20022-edu/docs` as a vault #me #phase/0  ✅ 2026-11-21
- [x] T-010 `git init`, default branch `main`, `.gitignore` (node_modules, dist, `docs/.obsidian/workspace*.json`) #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-011 Write `CLAUDE.md` (working rules for agents) and a short `CONTRIBUTING.md` #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-012 Add `LICENSE` (MIT) and `CONTENT-LICENSE` (CC BY 4.0) #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]
- [x] T-013 Create the GitHub repo (`gh repo create --public --source . --push`) after T-001 and T-002 #agent #phase/0 ✅ 2026-11-21 [[2026-11-21]]

## Decisions
- [[ADR-001 Astro]]
- [[ADR-002 Base ISO]]
- [[ADR-003 English first]]
- [[ADR-004 Scope pacs.008]]
- [[ADR-005 Full tree from XSD]]
- [[ADR-006 Licences]]
- [[ADR-007 Hosting and review]]
- [[ADR-008 Obsidian vault]]
