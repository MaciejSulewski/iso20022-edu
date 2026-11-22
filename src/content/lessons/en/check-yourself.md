---
title: "Check yourself: a recap"
summary: Eight questions on lessons 1 to 5, with answers underneath, for you to mark yourself.
step: quiz
order: 6
relatedElements:
  - GrpHdr/SttlmInf/SttlmMtd
  - CdtTrfTxInf/PmtId/EndToEndId
  - CdtTrfTxInf/RmtInf
sources:
  - title: SEPA Credit Transfer Inter-PSP Implementation Guidelines, 2025 version 1.0 (European Payments Council)
    url: https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC115-06%20SCT%20Inter-PSP%20IG%202025%20V1.0.pdf
    retrieved: "2026-11-22"
  - title: ISO 20022 Handbook (Bank of England)
    url: https://www.bankofengland.co.uk/payments/rtgs-renewal-programme/iso-20022-handbook
    retrieved: "2026-11-22"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## How to use this page

Read each question and answer it in your head or on paper. Then read the answers further down. Nothing here is scored or saved. If an answer surprises you, the lesson named beside it explains it. The schema itself, open in the workspace, can settle any doubt.

A scored quiz is planned. It is coming soon, and has no date.

## Questions

1. In one sentence, what is pacs.008 for?
2. Which bank is the debtor agent, and which is the creditor agent?
3. What are the two main blocks of a pacs.008, and which one can repeat?
4. You see `[0..1]` next to an element. Can you leave it out?
5. What does the ◆ symbol tell you about `OrgId` and `PrvtId`?
6. Which reference does the schema say stays the same all the way from payer to payee, and which one is new in each message?
7. A message says `SttlmMtd` is `COVE`. What does that mean?
8. What is the difference between `RmtInf/Ustrd` and `RmtInf/Strd`?

## Answers

1. It is the message a bank sends to the next bank to carry a customer's credit transfer onward (lesson 1).
2. The debtor agent services the payer's account, the creditor agent services the payee's account (lesson 1). Both are required in the message (`DbtrAgt`, `CdtrAgt`).
3. The group header `GrpHdr`, which appears once, and the transaction block `CdtTrfTxInf`, which can repeat, one per payment (lessons 1 and 2).
4. Yes. The first number is the minimum, so 0 means the element is optional, and the second means it appears at most once (lesson 3).
5. They are alternatives in a choice: a message uses one of them, an organisation or a person (lesson 3).
6. `EndToEndId` stays the same. `MsgId` is assigned afresh by each sender (lesson 4, and the element definitions in the Details pane).
7. Settlement between the two banks of that message happens through a separate cover payment (lesson 4, and the code list in the schema).
8. `Ustrd` is free text. `Strd` is split into named elements, such as the creditor's reference (lesson 5).

## Where next

Open the workspace and pick an element you did not know a week ago. Read its plain-English explanation, then its official definition beside it.
