---
title: Exploring the schema tree
summary: How to use the full element tree, from the numbers in brackets to choices, shared types, the filter, search and links.
step: tree
order: 3
relatedElements:
  - CdtTrfTxInf
  - CdtTrfTxInf/PmtTpInf
  - CdtTrfTxInf/Dbtr/Id/OrgId
  - CdtTrfTxInf/DbtrAgt
  - CdtTrfTxInf/CdtrAgt
sources:
  - title: "W3C XML Schema Part 0: Primer, second edition"
    url: https://www.w3.org/TR/xmlschema-0/
    retrieved: "2026-11-22"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## Sample or schema

The annotated XML shows only what one sample message contains. The **schema tree** next to it shows everything the message is allowed to contain. The transaction block `CdtTrfTxInf` can hold 48 elements directly, and the basic sample uses 10 of them. Branches load when you open them.

## The numbers in brackets

Each row ends with two numbers, such as `[0..1]` or `[1..n]`. They are the fewest and the most times the element can appear inside its parent, and `n` means no upper limit. The first number is what decides whether an element can be left out: 0 means it can, anything higher means it cannot. XML Schema, the language the ISO 20022 definitions are written in, counts occurrences this way.

- `[1..1]` is required, once. `GrpHdr` is one.
- `[0..1]` is optional, once. `PmtTpInf` is one.
- `[1..n]` is required and repeats. `CdtTrfTxInf` is one: a message needs at least one payment.
- `[0..n]` is optional and repeats.

The ●, ○ and ↻ symbols at the left of each row say the same in a glance.

## Choices

Some elements come in a group of alternatives, of which only one is used. Open `CdtTrfTxInf/Dbtr/Id` and you find `OrgId`, for an organisation, and `PrvtId`, for a person. Both show the ◆ symbol, and the Details pane says that only one element of the group is used. The schema lets a message use only one of the listed alternatives. The numbers on each alternative describe it as it is used: pick `OrgId` and it appears once.

## Types

Select an element and the Details pane shows its **type**, the name of its structure. Elements that share a type share a structure. `DbtrAgt` and `CdtrAgt` are both `BranchAndFinancialInstitutionIdentification8`, and the schema uses that type in 17 places. Learn it once and you can read all of them.

## Required only

The **Required only** button hides optional elements and everything inside them, but keeps the alternatives in a choice, since one of them is needed. With it on, the rows directly under `CdtTrfTxInf` shrink to `PmtId`, `IntrBkSttlmAmt`, `ChrgBr`, `Dbtr`, `DbtrAgt`, `CdtrAgt` and `Cdtr`. If you have selected something it hides, the selection moves to the nearest visible parent.

## Finding and linking

- **Find an element** searches by tag, name or path, for example `Dbtr` or `Debtor`. Pick a result and the tree opens to it.
- **Ctrl+K** opens the site search from any page. It lists elements and pages, and an element result opens it in the workspace.
- Selecting an element puts its path in the address, for example `#CdtTrfTxInf/Dbtr/Id/OrgId`. Share that link and it opens on the same element. Press Esc to clear the selection.

## Check your understanding

- What does `[0..n]` tell you about an element?
- Why do `OrgId` and `PrvtId` both say `[1..1]`, yet a message holds only one?
- What do `DbtrAgt` and `CdtrAgt` have in common?
