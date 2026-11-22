---
title: Reading the annotated XML
summary: How to read the sample message on the workspace page, from its markers to its code values.
step: xml
order: 2
relatedElements:
  - GrpHdr
  - GrpHdr/SttlmInf/SttlmMtd
  - CdtTrfTxInf/ChrgBr
  - CdtTrfTxInf/IntrmyAgt1
  - CdtTrfTxInf/RmtInf/Strd
sources:
  - title: Namespaces in XML 1.0, third edition (W3C)
    url: https://www.w3.org/TR/xml-names/
    retrieved: "2026-11-22"
  - title: Extensible Markup Language (XML) 1.0, fifth edition (W3C)
    url: https://www.w3.org/TR/xml/
    retrieved: "2026-11-22"
  - title: XML introduction (MDN Web Docs)
    url: https://developer.mozilla.org/en-US/docs/Web/XML/Guides/XML_introduction
    retrieved: "2026-11-22"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## XML in two minutes

A pacs.008 message is an XML document. XML is built from **elements**. Each element has a start tag such as `<MsgId>` and a matching end tag `</MsgId>`, and elements can sit inside other elements. Between the tags is either a value or more elements.

An element can also carry an **attribute**, a name and value pair written inside its start tag. In `<IntrBkSttlmAmt Ccy="EUR">1000.00</IntrBkSttlmAmt>` the attribute `Ccy` gives the currency of the amount.

## What the page leaves out

The sample file starts with a `Document` element. Its `xmlns` attribute declares a **namespace**, a name that says which vocabulary the element names belong to. Because it has no prefix, it applies to the plain element names inside. In the samples that name ends with `pacs.008.001.14`. Inside `Document` sits one element, `FIToFICstmrCdtTrf`, which holds the message.

The workspace page does not draw `Document` or `FIToFICstmrCdtTrf`. Its XML pane starts at `GrpHdr`, and the paths you see in links, such as `#GrpHdr/MsgId`, start there too.

## The two blocks

- `GrpHdr` is the group header, shown once. It holds the message reference, the creation time, the number of transactions and the settlement information.
- `CdtTrfTxInf` holds one payment. It can repeat, so one message can carry several payments.

## The markers

Every row has a symbol at its left, and the key above the three panes explains them:

- ● Required. ○ Optional. ◆ Choice, one of several alternatives. ↻ Repeats.

The page notes that required and optional are judged inside the parent. A required element is only needed when its parent is present. Hover over a row, or focus it with the keyboard, for a short preview, or select it to fill the Details pane with a plain-English explanation, the official definition, its type and how often it may appear.

## Beginner view

The **Beginner view** button hides optional elements and everything inside them. In both samples it leaves 17 elements, so you see the minimum skeleton first. Switch it off to see everything. The page remembers your choice in this browser.

## Code values

Some elements take a fixed list of codes. Select `SttlmMtd` and the pane lists them. In both samples it is `INDA`, where the bank receiving the message does the settling. Select `ChrgBr` for the charge bearer: the basic sample uses `SHAR` (the debtor pays the charges on the sending side, the creditor those on the receiving side) and the second uses `DEBT` (the debtor pays all of them).

## The two samples

- **Basic single credit transfer** (the default page) is one EUR payment of 1000.00.
- **Intermediary agent and structured remittance** is the second link under "Example messages". Compared with the basic sample it pays USD 2450.50, with charges `DEBT`. It adds the instructing and instructed agents (`InstgAgt`, `InstdAgt`), an intermediary agent (`IntrmyAgt1`) and structured remittance information (`RmtInf/Strd`), which splits the reason for the payment into separate fields: here an invoice number and a creditor reference.

All names, accounts and BICs are made up.

## Check your understanding

- Which element would you look in for the message reference?
- What does the ○ symbol tell you about an element?
- Name three things the second sample has that the basic one lacks.
