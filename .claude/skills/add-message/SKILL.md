---
name: add-message
description: Add one more ISO 20022 message (Stage 2, for example pacs.002 or camt.056) to iso20022-edu, from the official XSD to the workspace page. Use when a ledger task says "add <message>" or the user asks to add a message type. Needs the multi-message foundations task (T-112) merged first.
---

# Add a message

This is one ledger task per message, run inside `/next-phase`. It uses steps 2, 3, 6 and 7 of `docs/maintenance.md` (add the XSD, generate the JSON, write explanations, set metadata); steps 4 and 5 (diff and copy from an old version) do not apply to a new message. `<id>` is the full version id, for example `pacs.002.001.15`.

## 0. Owner inputs (`#me`, before the agent starts)

iso20022.org answers automated downloads with HTTP 403. So the owner downloads, in a browser:

- the message-set zip, with the `<id>` XSD copied unmodified into `schemas/`;
- the eRepository file, if the current local copy predates the message (git-ignored, about 113 MB, never committed).

They also record the version, URL and retrieval date in `docs/sources.md`. If any of this is missing, stop and say which `#me` task is needed.

## 1. Generated data (never hand-edited)

```sh
npm run extract-erepository -- <path-to>/<eRepository>.iso20022 <id>
npm run import-xsd -- schemas/<id>.xsd src/data/schema src/data/erepository/<id>.defs.json
```

- If the import throws (unknown construct, missing definition), fix `scripts/import-xsd.ts` or `scripts/extract-erepository.ts` with a test. Do not hand-edit the output.
- Check `THIRD-PARTY-NOTICES.md` still covers the new XSD.

## 2. Content

- **Message metadata:** `src/content/messages/<id>.yaml`. Copy the pacs.008 file's shape: name, purpose, `mtEquivalent`, sources, and `lastReviewed` set to unreviewed.
- **Synthetic sample:** `src/content/samples/<sample>.xml` plus its YAML (fictional BICs, test IBANs), valid under `xmllint --schema schemas/<id>.xsd`. Add it to the per-file schema map that T-112 gives `check:xml` (today `check:xml` validates every sample against the pacs.008 XSD only, so this skill needs T-112 merged).
- **Overlay:** `src/content/annotations/<id>.yaml`. Cover every element of the sample: `byPath` first, then `byType` for shared types, then `codes`. Use your own wording; the official definition is shown by the site, never typed.
- **Glossary terms:** new terms for elements only this message has, in `src/content/glossary/`.
- **Links:** to and from related lessons or flows, where they exist.
- **Sources:** every new source goes in `docs/sources.md`.

## 3. Checks and review

- `npm run check:content` must be clean (coverage report: every sample element annotated).
- Run `npm run verify` on the branch head.
- Reviews run as usual: `task-reviewer`, and `content-reviewer` for every text file.
- Add a `#me` ledger task to review the new message's content for accuracy, and link it from the session note's "Important for the owner".
