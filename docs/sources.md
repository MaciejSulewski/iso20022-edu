# Sources

Public sources used for content and planning. Every source used must be listed here (see [[Project Plan]], content rules). Own wording is used throughout; official ISO definitions are shown beside it.

| Source | URL | Used for | Retrieved |
|---|---|---|---|
| ISO 20022 Message Definitions catalogue (Payments Clearing and Settlement, pacs.008) | https://www.iso20022.org/iso-20022-message-definitions?search=pacs.008 | Latest pacs.008 version; XSD download. Seen only as a web-search result snippet, the page itself returned HTTP 403 | 2026-11-21 |
| ISO 20022 Messages Archive | https://www.iso20022.org/catalogue-messages/iso-20022-messages-archive | Older versions remain available there. Search snippet only | 2026-11-21 |
| iso20022.org Terms of use | https://www.iso20022.org/terms-use | Reproduction terms. Read in full from a browser-saved copy (T-104) | 2026-11-21 |
| iso20022.org Intellectual property rights | https://www.iso20022.org/intellectual-property-rights | Contributor IP and licence to users. Read in full from a browser-saved copy (T-104) | 2026-11-21 |
| Swift standards end-user licence (September 2005) | https://www.iso20022.org/sites/default/files/documents/D7/SWIFTStandards_LIC_OUT_V5_.pdf | Swift-specific licence, linked from the IP page. Downloaded and read in full (T-104) | 2026-11-21 |
| RFC 9562 (UUIDs; replaces RFC 4122) | https://www.rfc-editor.org/rfc/rfc9562 | Version 4 UUIDs are generated at random, for the UETR explanation (T-044). Cited from knowledge, not fetched in this session | not fetched |
| Example IBANs in the samples | not fetched | GB29NWBK60161331926819 is a published documentation example (ISO 13616 / ECBS), DE02120300000000202051 and DE89370400440532013000 are widely circulated test IBANs; the creditor reference RF18539007547034 is the published ISO 11649 example. Cited from knowledge, not fetched | not fetched |
| ISO 20022 External code sets | https://www.iso20022.org/catalogue-messages/additional-content-messages/external-code-sets | Meaning of the document type code CINV and the creditor reference type code SCOR in the second sample (T-061). Cited from knowledge, not fetched in this session | not fetched |
| SEPA Credit Transfer Inter-PSP Implementation Guidelines, 2025 v1.0 (EPC115-06, European Payments Council) | https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC115-06%20SCT%20Inter-PSP%20IG%202025%20V1.0.pdf | Lesson 1 (T-092): pacs.008 carries the payment instruction between the paying and the receiving bank, directly or through intermediaries. PDF downloaded and its text extracted with pdftotext, read directly (section 2.1.1). A SEPA scheme guideline; lesson 1 uses it only for "pacs.008 is the message used between banks" | 2026-11-22 |
| SEPA Credit Transfer Customer-to-PSP Implementation Guidelines, 2025 v1.0 (EPC132-08, European Payments Council) | https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC132-08%20SCT%20C2PSP%20IG%202025%20V1.0.pdf | Lesson 1 (T-092): the `pain` messages are payment initiation messages; pain.001 is sent by the customer to the customer's bank (sections 0.3, 1.1 and 2.1.1). PDF downloaded and its text extracted with pdftotext, read directly | 2026-11-22 |
| ISO 20022: Citi Mini Series & Reference Guide Part 2 (Citi) | https://www.citibank.com/tts/sa/flippingbook/2021/ISO-20022-Citi-Mini-Series-and-Reference-Guide-Part-2/6/ | Lesson 1 (T-092): pacs.008 described as the equivalent of MT 103. Read through a fetch tool's summary, not the raw page | 2026-11-22 |
| ISO 20022 Handbook (Bank of England) | https://www.bankofengland.co.uk/payments/rtgs-renewal-programme/iso-20022-handbook | Lesson 1 (T-092): CHAPS table lists MT 103 "Customer Transfer" against pacs.008 (section 3); section 5 says SWIFT retires MT messaging for payments, which supports describing MT 103 as an MT message. Read through a fetch tool's summary, not the raw page (re-checked 2026-11-22 for the section 5 sentence) | 2026-11-22 |

## Not used

- **Swift MyStandards and CBPR+ documentation:** not public, not used. The plan forbids copying from MyStandards or Swift ([[Project Plan]], risks).

## Notes

- The terms of use, IP policy and Swift licence were read from the primary pages on 2026-11-21 (T-104); see "Primary reading (T-104)" below.
- Plain-English explanations in `src/content/annotations/pacs.008.001.14.yaml` (T-044) paraphrase the ISO definitions already cited above and the code lists in the generated schema. The UETR statement (a version 4 UUID is generated at random) rests on the UUID specification, RFC 4122 (replaced by RFC 9562). Statements beyond these (for example on how the receiving bank uses the number of transactions, or that a settled amount can differ from the ordered amount) have no named source and stay unsourced until the human review (T-045, T-093). The text was drafted by an AI and is not yet reviewed by a person.
- Licence and disclaimer: [[ADR-006 Licences]]. Educational, not affiliated with ISO or Swift.

## Redistribution terms and decision (T-030)

Retrieved 2026-11-21. Plain statement of limits: every iso20022.org page above answered HTTP 403 to automated fetches (WebFetch and curl), so no page was read in full. The findings come from web-search result summaries of those pages. They are not verified against the page text.

**What the search summaries say**
- Terms of use: site material is meant to be reproduced freely under the ISO 20022 Intellectual Property Right Policy. A copy must state that it is not the official site and that iso20022.org is the only up-to-date source.
- IP policy: contributing organisations keep their IP rights and grant third parties a non-exclusive, royalty-free licence to use the published information.
- Each definition has a submitting organisation (Swift, ISO TC68/SC9, and others), so terms may reportedly differ per submitting organisation.
- No named licence (CC, MIT, etc.) was found for the XSD files themselves.

**Decision (superseded 2026-11-21): fetch in CI.** The project owner then chose to commit the XSDs, see [[ADR-013 Commit the XSDs]]. Original reasoning: Reason: the terms are ambiguous and unread, and [[Project Plan]] section 6 names fetching the XSD in CI as the fallback. Re-check once the pages can be read in a browser (task T-104, `#me`); if they clearly allow redistribution with attribution, switch to "commit". Recorded in [[ADR-012 XSD not committed]], which refines [[ADR-006 Licences]].

**Version**
- **Confirmed by the project owner in a browser (2026-11-21): the latest version is pacs.008.001.14.** (Earlier note: found via a search snippet, catalogue "last updated 19 March 2026"; older snapshots showed .13.)
- Namespace pattern: `urn:iso:std:iso:20022:tech:xsd:pacs.008.001.NN`, so `urn:iso:std:iso:20022:tech:xsd:pacs.008.001.14`.
- XSD download: there is no single link for pacs.008.001.14. The project owner found one zip with all pacs messages: https://www.iso20022.org/message-set/1250/download (the importer needs `pacs.008.001.14.xsd` extracted from it). An automated GET of this URL returned HTTP 403 from the site's CDN (checked 2026-11-21), the same as the other pages, so a plain script or CI job may not be able to download it. Not worked around.
- Keep .08? Search results show national and CBPR+-style usage guidelines for .08 (and .10, .06), so it is widely used in practice. Suggestion: build the importer for any version id, import .14 first, and add .08 only if cheap. The project owner decides ([[Project Plan]] section 6).

**Second-hand input from the project owner (2026-11-21)**

The project owner pasted the findings of a separate research session. It is not a primary source: the quoted passages were not checked against the iso20022.org pages (still unreadable to automation), so they count as leads for T-104, not as verified terms.
- Agrees with the search summaries above: the IP policy gives third parties a non-exclusive, royalty-free licence to use published repository information, and the terms of use say site material may be reproduced freely under that policy, with a "not the official site" statement for replicas.
- Adds the Swift-specific licence (Swift standards end-user licence): royalty-free use and software development allowed; sale prohibited; modifying material while keeping the Swift reference prohibited. Contributors other than Swift may have their own terms. The session advised written confirmation from Swift before committing Swift-submitted schemas publicly.
- Its overall reading: generally permitted, subject to contributor-specific terms. It also suggested a `THIRD-PARTY-NOTICES.md` with source, contributor and "not official" wording.

## Primary reading (T-104)

Read 2026-11-21: the Terms of use and IP rights pages from copies the project owner saved in a browser, and the Swift licence PDF downloaded directly (HTTP 200). **Result: nothing forbids redistribution, so [[ADR-013 Commit the XSDs]] stands.** This replaces the search-summary and second-hand findings above.

- **Terms of use:** material "is intended to be used and reproduced freely by all interested users" under the IP Right Policy. Any replica must state that it is not the official site and that https://www.iso20022.org/ is the sole source of up-to-date material. The rest is a no-warranty, no-liability disclaimer.
- **IP policy:** contributors keep their IP rights and grant third parties "a non-exclusive, royalty-free license to use the published information". It links contributor policies for CBI and Swift. The CBI policy PDF was not read.
- **Swift end-user licence:** world-wide, royalty-free, non-exclusive licence to use or promote the standards and to build software, products or services on them (section 2). Sub-licensing allowed if royalty-free (4). Limits (3): do not sell the standards; do not modify them while still calling the result "SWIFTStandards". Swift keeps ownership (5); the licence ends if a material term is broken (6).
- **What the repo must do:** commit the XSDs unmodified, free of charge; carry the "not the official site" statement; do not present the derived `src/data/schema/*.json` as an official ISO or Swift schema. All three are in `THIRD-PARTY-NOTICES.md`.
- **Still open:** other contributors (such as CBI) may have their own terms. Only pacs.008.001.14 is in scope ([[ADR-004 Scope pacs.008]]).

**Effect on the decision (earlier, before the primary reading):** at the time, none. (Later the owner chose to commit, [[ADR-013 Commit the XSDs]]; the Swift caveat below stays as an accepted risk.) The generated JSON is a transformation of the definitions, which is the kind of change the Swift clause may restrict, and "permission to use" is not the same as "permission to redistribute". If T-104 confirms from the primary pages that redistribution of the pacs.008 XSD is allowed, a `THIRD-PARTY-NOTICES.md` with the "not the official site" statement is the next step when switching to "commit". Even with "fetch in CI", the site displays single definitions, so the "not affiliated with ISO or Swift" disclaimer ([[ADR-006 Licences]]) already covers the notice for that use.
