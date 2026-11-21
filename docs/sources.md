# Sources

Public sources used for content and planning. Every source used must be listed here (see [[Project Plan]], content rules). Own wording is used throughout; official ISO definitions are shown beside it.

| Source | URL | Used for | Retrieved |
|---|---|---|---|
| ISO 20022 Message Definitions catalogue (Payments Clearing and Settlement, pacs.008) | https://www.iso20022.org/iso-20022-message-definitions?search=pacs.008 | Latest pacs.008 version; XSD download. Seen only as a web-search result snippet, the page itself returned HTTP 403 | 2026-11-21 |
| ISO 20022 Messages Archive | https://www.iso20022.org/catalogue-messages/iso-20022-messages-archive | Older versions remain available there. Search snippet only | 2026-11-21 |
| iso20022.org Terms of use | https://www.iso20022.org/terms-use | Reproduction terms. Search snippet only, page returned HTTP 403 | 2026-11-21 |
| iso20022.org Intellectual property rights | https://www.iso20022.org/intellectual-property-rights | Contributor IP and licence to users. Search snippet only, page returned HTTP 403 | 2026-11-21 |

## Not used

- **Swift MyStandards and CBPR+ documentation:** not public, not used. The plan forbids copying from MyStandards or Swift ([[Project Plan]], risks).

## Notes

- The XSD redistribution terms could not be read in full; see "Redistribution terms and decision" below.
- Licence and disclaimer: [[ADR-006 Licences]]. Educational, not affiliated with ISO or Swift.

## Redistribution terms and decision (T-030)

Retrieved 2026-11-21. Plain statement of limits: every iso20022.org page above answered HTTP 403 to automated fetches (WebFetch and curl), so no page was read in full. The findings come from web-search result summaries of those pages. They are not verified against the page text.

**What the search summaries say**
- Terms of use: site material is meant to be reproduced freely under the ISO 20022 Intellectual Property Right Policy. A copy must state that it is not the official site and that iso20022.org is the only up-to-date source.
- IP policy: contributing organisations keep their IP rights and grant third parties a non-exclusive, royalty-free licence to use the published information.
- Each definition has a submitting organisation (Swift, ISO TC68/SC9, and others), so terms may reportedly differ per submitting organisation.
- No named licence (CC, MIT, etc.) was found for the XSD files themselves.

**Decision: fetch in CI. XSDs and generated schema JSON built from them are not committed.** Reason: the terms are ambiguous and unread, and the plan says to take the conservative option then. Re-check once the pages can be read in a browser (task T-104, `#me`); if they clearly allow redistribution with attribution, switch to "commit". Recorded in [[ADR-012 XSD not committed]], which refines [[ADR-006 Licences]].

**Version**
- Latest found: pacs.008.001.14 (FIToFICustomerCreditTransfer V14), catalogue "last updated 19 March 2026" per one search snippet. Older snapshots showed .13 (27 February 2025). Single-source and unverified: confirm in the catalogue before T-031.
- Namespace pattern: `urn:iso:std:iso:20022:tech:xsd:pacs.008.001.NN`, so `urn:iso:std:iso:20022:tech:xsd:pacs.008.001.14`.
- XSD download URL: not confirmed. The catalogue offers an XSD download per message, but no direct link was seen. Do not hard-code a URL pattern; find the link in the browser and record it here.
- Keep .08? Search results show national and CBPR+-style usage guidelines for .08 (and .10, .06), so it is widely used in practice. Suggestion: build the importer for any version id, import .14 first, and add .08 only if cheap. The project owner decides ([[Project Plan]] section 6).
