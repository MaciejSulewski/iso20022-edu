---
title: What is pacs.008?
summary: pacs.008 is the message one bank sends to the next bank to carry a customer's payment on.
step: lesson
order: 1
relatedElements:
  - GrpHdr/MsgId
  - CdtTrfTxInf/PmtId/EndToEndId
  - CdtTrfTxInf/IntrBkSttlmAmt
  - CdtTrfTxInf/DbtrAgt
  - CdtTrfTxInf/CdtrAgt
sources:
  - title: SEPA Credit Transfer Inter-PSP Implementation Guidelines, 2025 version 1.0 (European Payments Council)
    url: https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC115-06%20SCT%20Inter-PSP%20IG%202025%20V1.0.pdf
    retrieved: "2026-11-22"
  - title: SEPA Credit Transfer Customer-to-PSP Implementation Guidelines, 2025 version 1.0 (European Payments Council)
    url: https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC132-08%20SCT%20C2PSP%20IG%202025%20V1.0.pdf
    retrieved: "2026-11-22"
  - title: "ISO 20022: Citi Mini Series & Reference Guide Part 2 (Citi)"
    url: https://www.citibank.com/tts/sa/flippingbook/2021/ISO-20022-Citi-Mini-Series-and-Reference-Guide-Part-2/6/
    retrieved: "2026-11-22"
  - title: ISO 20022 Handbook (Bank of England)
    url: https://www.bankofengland.co.uk/payments/rtgs-renewal-programme/iso-20022-handbook
    retrieved: "2026-11-22"
lastReviewed:
  date: "2026-11-22"
  by: unreviewed (AI-drafted, pending T-093)
---

## The short version

pacs.008 is a message that banks send to each other. When a customer asks their bank to pay someone, the banks involved need a way to pass that payment along. pacs.008 is that message.

Its full ISO name is FIToFICustomerCreditTransfer. "FI to FI" means financial institution to financial institution, and "credit transfer" means the payer starts the payment. The ISO definition says it is used to move funds from a debtor account to a creditor. The **debtor** is the payer and the **creditor** is the payee.

The name has parts. `pacs` is the message family, `008` is this message within it, and `001.14` is the version this site uses.

## Who sends it, and to whom

Each side of the payment has a bank, called an **agent** in ISO 20022:

- The **debtor agent** services the debtor's account.
- The **creditor agent** services the creditor's account.
- An **intermediary agent** is a bank placed between the debtor agent and the creditor agent.

The ISO definition says the message is sent "by the debtor agent to the creditor agent, directly or through other agents and/or a payment clearing and settlement system". The European Payments Council describes the same idea for SEPA payments: the instruction travels from the payer's bank to the payee's bank, directly or through intermediaries.

## What it carries

A message has two parts. The group header (`GrpHdr`) appears once and holds details shared by every payment in the message. Below it, one or more transaction blocks (`CdtTrfTxInf`) each describe one payment. There is no grouping: every payment gets its own block.

| Element                          | What it tells the receiving bank                                              |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `GrpHdr/MsgId`                   | A reference the sending bank gives this message                               |
| `CdtTrfTxInf/PmtId/EndToEndId`   | A reference set by the party that started the payment, passed on unchanged    |
| `CdtTrfTxInf/IntrBkSttlmAmt`     | The amount moved between the two banks exchanging this message                                        |
| `CdtTrfTxInf/DbtrAgt`, `CdtrAgt` | The two banks that hold the payer's and the payee's accounts (both required)  |

Beyond these, the message names the debtor and the creditor, and can add account numbers, remittance information (what the payment is for) and more. Every element is listed in the workspace.

## How it differs from the customer's instruction

The customer does not send pacs.008. They give their instruction to their own bank, and a different message family, `pain` (payment initiation), exists for that. In the SEPA guidelines, the `pain.001` customer credit transfer initiation is sent by the payer to the payer's bank. The pacs.008 is the message used between banks.

## Where MT 103 fits

MT 103 is the Swift message that pacs.008 corresponds to. Citi calls pacs.008 the MX equivalent of the MT 103, and the Bank of England's handbook lists the MT 103 "Customer Transfer" next to pacs.008. Lesson 5 compares the two in more detail.

## Check your understanding

- Who is the debtor agent in a payment from you to a friend at another bank?
- Which message does a customer send, and which does a bank send?
- Why can a pacs.008 pass through more than two banks?
