---
title: From MT 103 to pacs.008
summary: What an MT 103 is, why pacs.008 breaks information into more parts, and two examples of how that looks in the schema.
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
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## What an MT 103 is

Before ISO 20022, banks mostly used message types from Swift's older "MT" family. An MT 103 is one of them. An encyclopedia article on Swift message types calls it a single customer credit transfer, used to instruct a funds transfer, and puts it in the category for customer payments. In day-to-day talk, the MT 103 is the message that pacs.008 replaces. The Bank of England's handbook sets them side by side in its table for CHAPS, the UK's high-value payment system, and says Swift planned to retire MT messaging for payments.

This lesson does not list MT 103 fields. We found no public source that we could read and cite for them, and the field-by-field comparison is a later task (T-080) that needs a human reviewer.

## Why ISO 20022 has more parts

An ISO 20022 message is built from named elements, as lessons 2 and 3 showed. The Bank of England handbook talks about "enhanced data", meaning data beyond what the existing MT formats require or support. It gives examples of what it wants banks to send: purpose codes and legal entity identifiers.

The idea behind that is simple. A computer can check or route a postcode that sits in its own element. It can do little with the same postcode buried in a line of text.

## Two examples from the schema

**An address.** `CdtTrfTxInf/Dbtr/PstlAdr` holds the debtor's postal address. It offers separate elements for the street name (`StrtNm`), building number (`BldgNb`), post code (`PstCd`), town (`TwnNm`) and country (`Ctry`). It also has `AdrLine`, which can repeat up to seven times and carries free-format text. A message can put everything into free text, split it into elements, or mix the two. The Bank of England handbook says CHAPS will reject fully unstructured addresses from November 2026, so check the current rules of any scheme you work with.

**What the payment is for.** `CdtTrfTxInf/RmtInf` is the remittance information, the details a payee uses to match a payment to an invoice. `Ustrd` holds it as free text. `Strd` holds it as structured elements, for example the creditor's reference in `Strd/CdtrRefInf/Ref`. The handbook says that, where a CHAPS pacs.008 carries remittance data, it has to be structured from November 2025.

Both examples follow one pattern: where you once wrote a line of text, you now have named places for each piece, and the free-text option stays for what does not fit.

## What did not change

A pacs.008 still says who pays whom, how much, through which banks. Lesson 1 and the workspace cover that.

## Check your understanding

- Which element holds a free-format address line, and how many can a message have?
- Why might a bank prefer structured remittance information?
- Why does this site not yet show an MT 103 field table?
