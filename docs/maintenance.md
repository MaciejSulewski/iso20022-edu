# Yearly maintenance routine

Run this once a year, or when ISO 20022 or Swift publishes a new pacs.008 version. It follows section 8 of [[Project Plan]]. Licence and attribution rules: [[ADR-006 Licences]] and [[ADR-012 XSD not committed]] (the XSD and generated JSON are never committed).

Steps marked "not built yet" name the ledger task that will build them ([[Ledger]]). Until then, do that step by hand or skip it, and say so in the session note.

## Checklist

1. [ ] **Check for a new version.** In a browser, check iso20022.org for a newer pacs.008 version and for new Stage 2 messages. Record the version, the XSD download URL and the retrieval date in [[sources]]. Reading the terms (T-104) is a `#me` task.
2. [ ] **Fetch the XSD.** The fetch script is not built yet (T-105, blocked on T-104). Until then, download the XSD by hand into a folder outside the repo, so it is never committed.
3. [ ] **Generate the schema JSON.** Run `npm run import-xsd -- <path-to-xsd>`. It writes `src/data/schema/<id>.json` (the default out-dir). Do not hand-edit the output; change `scripts/import-xsd.ts` if the output is wrong.
4. [ ] **Read the diff.** A diff of the old and new generated JSON (added, removed and changed elements and types) is not built yet (T-102).
5. [ ] **Copy the overlay and samples** to the new id, then fix what `check-content.ts` flags (dead paths, unresolved elements). Not built yet (T-043). The overlay, samples and xmllint validation arrive in Phase 3.
6. [ ] **Write explanations** for new elements in your own wording, with the official ISO definition shown beside them.
7. [ ] **Update metadata.** Set `sources.retrieved` and `lastReviewed` for the new version. Mark the old version `deprecated`, but keep it while it is still in use.
8. [ ] **Add a changelog entry** on the site. No changelog page exists in the ledger yet.
9. [ ] **Run the checks before a PR.** `npm run build` must pass. It runs `astro check` and `astro build` today. Content checks are added with T-043.

## Rules for every run

- Synthetic data only in samples: fictional BICs and test IBANs.
- Public sources only, each one recorded in [[sources]].
- Work on a `feat/`, `fix/` or `docs/` branch with Conventional Commits (`content:` for content). Open a PR; the user merges it. See [[ADR-011 Process per task]].
