# T-090 Glossary: design

Ledger task T-090. Complex per [[ADR-011 Process per task]] because it adds a data format (and a new kind of page). Decided without a live approval round; every **[call]** is mine.

## Intent

A reader who meets "debtor agent" or "UETR" in the workspace can jump from the Details pane to a short page that explains the term in plain words, shows the official definition beside it, and links to the related terms and to the elements in the workspace. Ctrl+K finds the terms.

## Content truth rules

- A term's plain wording paraphrases only the official definitions of the elements it names (they sit in `src/data/schema/pacs.008.001.14.json`, from the ISO eRepository, already in `docs/sources.md`) and facts the lessons already cite. No new factual claim, no CBPR+ rule, no MT field fact, no usage rules of any scheme.
- The official definition is not typed into the term file. The page reads it from the schema at build time, for each element of the term, and shows it beside the plain wording (own wording first, official text marked as such). **[call]** Hand-copied definitions could drift or be altered; the schema is the one copy.
- Own wording, not the ISO sentence reworded word for word. A term file that repeats the schema definition fails review.
- Every page says the wording is AI-drafted and not reviewed by a person (T-093), in the same style as lessons, the flow and the mapping.
- Synthetic data only; no examples with real parties.

## Design

**Data** (`src/content/glossary/<id>.yaml`, one file per term, strict zod `GlossarySchema`): `id` (matches the file name), `term`, `plain` (own wording, 1 to 3 sentences), `message` (a message id), `elements` (paths in that message, min 1), `related` (term ids, default `[]`), `lesson` (lesson id, optional), `lastReviewed` (`{date, by}` as lessons). No `sources` array **[call]**: the basis is the schema's own definitions, stated once on the pages and in `docs/sources.md`.

**Terms (18)** **[call]**, each tied to the element(s) it names: debtor, creditor, debtor agent, creditor agent, instructing agent, instructed agent, intermediary agent, message identification, end-to-end identification, instruction identification, UETR, settlement method, interbank settlement amount, interbank settlement date, charge bearer, remittance information, group header, credit transfer transaction information. Concepts with no element (serial and cover method, MT 103) stay in the lessons and the flow, because the glossary has no official definition to show beside them.

**check-content rules:** every file parses; `id` matches the file name; `message` has a schema; every path in `elements` resolves; every `related` id exists and is not the term itself and appears once; `lesson` exists; no two terms share a `term` (case-insensitive) or an element path **[call]** (so an element panel links one term per element, never an ambiguous list; two terms may not both claim an element); the count is printed like flows and mappings.

**Pages:** `/glossary/` lists all terms alphabetically, each linking to `/glossary/<id>/`. A term page shows the draft notice, the term as `h1`, the plain wording, then "Official definition" with one block per element (element name, path as a link to `/messages/<message>/#<path>`, the schema definition), then related terms, the lesson link if any, and a link back to the glossary. Static, no island, no new client JS. Pagefind indexes them, so Ctrl+K finds a term through the existing Pages group with no palette change **[call]**; the palette check proves it (type a term, pick the row, land on its page). The glossary is linked from the lessons index page and from every term page; the home page's step list is unchanged.

**ElementPanel:** a "Glossary" section lists the term whose `elements` include the selected path, as a link to its page. The message page computes `path -> {term, href}` at build time and passes it through `Workspace` to `ElementPanel` (props only, no fetch). Selection stays one path string ([[ADR-014 One workspace island]]). Elements with no term show nothing.

**Checks:** `check-content` rules and tests (each rule shown failing once); `scripts/check-glossary.ts` in `check:ui`: the glossary lists as many terms as there are files; every internal link on the glossary and on every term page returns 200 (this is "related terms and messages resolve" in the browser); selecting `GrpHdr/SttlmInf/SttlmMtd` in the workspace shows the Glossary link and following it lands on that term's page; Ctrl+K finds a term (the palette check gains this case); no horizontal page scroll at 390. axe runs on the new pages through `check:a11y`. Every check is shown failing once.

## Not doing

An inline glossary popover, term highlighting in lessons, aliases and synonyms, alphabetical jump links, search inside the glossary page, a term for every element, Polish text, terms outside pacs.008, a hand-typed official-definition field.
