---
title: Following a payment from bank to bank
summary: How one customer payment crosses several banks, which references change at each step and which one stays, and what settlement means.
step: flow
order: 4
relatedElements:
  - GrpHdr/MsgId
  - CdtTrfTxInf/PmtId/EndToEndId
  - CdtTrfTxInf/PmtId/UETR
  - GrpHdr/SttlmInf/SttlmMtd
  - CdtTrfTxInf/IntrmyAgt1
sources:
  - title: ISO 20022 Handbook (Bank of England)
    url: https://www.bankofengland.co.uk/payments/rtgs-renewal-programme/iso-20022-handbook
    retrieved: "2026-11-22"
  - title: MT202 COV (Wikipedia)
    url: https://en.wikipedia.org/wiki/MT202_COV
    retrieved: "2026-11-22"
  - title: Cover Matching (Oracle Banking Payments documentation)
    url: https://docs.oracle.com/en/industries/financial-services/banking-payments/14.7.0.0.0/crbug/cover-matching.html
    retrieved: "2026-11-22"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## The cast

Say Ana banks with a small bank in one country and pays Ben, who banks somewhere else. Ana is the **debtor** and Ben the **creditor**. Ana's bank is the debtor agent and Ben's bank is the creditor agent. If the two banks have no direct link, one or more **intermediary agents** sit between them. The schema describes `IntrmyAgt1` as the agent between the two end banks, and numbers any further ones.

## One message per step

Ana does not send a pacs.008. Her bank does, to the next bank in the chain. That bank sends a pacs.008 of its own to the one after it, and so on. So a payment crossing three banks is carried by more than one message.

This is why the message has more than one reference:

- `GrpHdr/MsgId` names this one message. The schema says the sender of the message assigns it and sends it to the next party. The next message in the chain gets a new one.
- `CdtTrfTxInf/PmtId/EndToEndId` is set by whoever started the payment. The schema says it is passed on unchanged through the whole chain, so Ana's bank and Ben's bank see the same value.
- `CdtTrfTxInf/PmtId/UETR` is also meant as an end-to-end reference. It is optional here.

Each message also names who is sending (`InstgAgt`, the instructing agent) and who receives (`InstdAgt`, the instructed agent).

## Settlement

Passing the instruction is not the same as moving the money. **Settlement** is the transfer of the funds between two banks. The group header says how this is done between the sender and the receiver of that one message, in `GrpHdr/SttlmInf/SttlmMtd`. The schema lists four codes, shown here in our words:

- `INDA`: the receiving bank settles.
- `INGA`: the sending bank, which also forwards the payment, settles.
- `COVE`: settlement happens through a separate cover payment.
- `CLRG`: settlement happens through a payment clearing system.

The group header can also name reimbursement agents (`InstgRmbrsmntAgt` and others), banks through which one party repays the other.

## Serial and cover

Public sources describe two ways to send money across correspondent banks. Both descriptions below come from sources weaker than the schema, so treat them as an outline.

In the **serial** method the customer payment is handed from bank to bank in turn. In the **cover** method the customer payment message goes toward the creditor agent, while a second message tells the banks in between to move the funds. An encyclopedia article on the older Swift form of this describes it that way. A bank software manual shows the receiving bank matching the two messages by amount, currency and date, and in the ISO 20022 world the Bank of England's handbook lists the cover message as a `pacs.009` usage. We did not read a source that sets out the cover method in ISO 20022 terms, so this lesson goes no further.

## Coming soon

An interactive, step-by-step view of this flow is planned (T-070). It is coming soon, and has no date.

## Check your understanding

- Which reference stays the same from Ana's bank to Ben's bank?
- Does `COVE` mean the sending bank, the receiving bank or a separate payment settles?
- Why can one payment need more than one pacs.008?
