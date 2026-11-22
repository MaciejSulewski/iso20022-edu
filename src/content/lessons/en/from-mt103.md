---
title: From MT 103 to pacs.008
summary: What an MT 103 is, why pacs.008 breaks information into more parts, two examples of how that looks in the schema, and where to find the MT 103 mapping table.
step: mapping
order: 5
relatedElements:
  - CdtTrfTxInf/Dbtr/PstlAdr
  - CdtTrfTxInf/Dbtr/PstlAdr/AdrLine
  - CdtTrfTxInf/Dbtr/PstlAdr/TwnNm
  - CdtTrfTxInf/RmtInf/Ustrd
  - CdtTrfTxInf/RmtInf/Strd/CdtrRefInf/Ref
sources:
  - title: SWIFT message types (Wikipedia)
    url: https://en.wikipedia.org/wiki/SWIFT_message_types
    retrieved: "2026-11-22"
  - title: ISO 20022 Handbook (Bank of England)
    url: https://www.bankofengland.co.uk/payments/rtgs-renewal-programme/iso-20022-handbook
    retrieved: "2026-11-22"
  - title: A deep dive on pacs.008 (BNY, February 2021)
    url: https://www.bny.com/content/dam/bnymellon/documents/pdf/iso-20022/learning-guide-module4.pdf
    retrieved: "2026-11-23"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## What an MT 103 is

An MT 103 is a message from Swift's older "MT" family. An encyclopedia article on Swift message types describes it as the message for one customer's credit transfer, filed under customer payments, and says it is used to instruct the transfer of funds. In day-to-day talk, the MT 103 is the message that pacs.008 replaces. The Bank of England's handbook sets them side by side in its table for CHAPS, the UK's high-value payment system, and says Swift planned to retire MT messaging for payments.

A table that pairs MT 103 fields with pacs.008 elements is on its own page, linked at the end of this lesson. It rests on two public sources, a bank's explainer and a vendor's table, and neither is an official mapping. The table is partial and stays unreviewed by a person until T-081. This lesson itself still gives no MT 103 field facts: for those, use the table and its sources.

## Why ISO 20022 has more parts

An ISO 20022 message is built from named elements, as lessons 2 and 3 showed. The Bank of England handbook talks about "enhanced data", meaning data beyond the minimum that the existing MT formats require. For CHAPS it makes sending such data optional at first, then mandates some of it, such as purpose codes and legal entity identifiers.

The idea behind that is simple. A computer can check or route a postcode that sits in its own element. It can do little with the same postcode buried in a line of text.

## Two examples from the schema

**An address.** `CdtTrfTxInf/Dbtr/PstlAdr` holds the debtor's postal address. It offers separate elements for the street name (`StrtNm`), building number (`BldgNb`), post code (`PstCd`), town (`TwnNm`) and country (`Ctry`). It also has `AdrLine`, which can repeat up to seven times and carries free-format text. A message can put everything into free text, split it into elements, or mix the two. The Bank of England's handbook, read on 2026-11-22, says CHAPS rejects fully unstructured addresses from November 2026. That is a rule of one UK scheme, not a general ISO 20022 rule, so check the current rules of any scheme you work with.

**What the payment is for.** `CdtTrfTxInf/RmtInf` is the remittance information, the details a payee uses to match a payment to an invoice. `Ustrd` holds it as free text. `Strd` holds it as structured elements, for example the creditor's reference in `Strd/CdtrRefInf/Ref`. The same handbook says that, in CHAPS, remittance data in a pacs.008 has to be structured from November 2025. Again, that is a CHAPS rule.

Both examples follow one pattern: where you once wrote a line of text, you now have named places for each piece, and the free-text option stays for what does not fit.

## What did not change

A pacs.008 still says who pays whom, how much, through which banks. Lesson 1 and the workspace cover that.

## Check your understanding

- Which element holds a free-format address line, and how many can a message have?
- Why might a bank prefer structured remittance information?
- In the mapping table, which source supports pairing MT 103 field 70 with `CdtTrfTxInf/RmtInf/Ustrd`, and why does the table call itself partial?
