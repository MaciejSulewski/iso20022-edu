# T-070 / T-071 Flow: design

Ledger tasks: T-070 (FlowPlayer and the pacs.008 agent-chain flow), T-071 (animation). Complex task per [[ADR-011 Process per task]]; decision [[ADR-017 Flows as YAML content]]. Decided without a live approval round, as in earlier phases; every **[call]** is mine.

## Intent

Lesson 4 ([[2026-11-22-lessons-design]]) explains in words how a customer payment crosses several banks. The flow shows it: five parties in a row, a step at a time, with the messages that pass between them. A new bank employee should be able to click Next and see who sends what to whom, which reference changes and which stays, and how settlement differs between the serial and the cover method.

## Goals / non-goals / anti-goals

- Goals: Next/Prev steps through every participant; mobile shows a step list; both methods (serial, cover); the flow agrees with lesson 4 and with the schema's `SettlementMethod1Code` (INDA, INGA, COVE, CLRG); each step links to the elements involved in the workspace; reduced motion respected (T-071).
- Non-goals: other message types (pacs.009, pacs.002, pain.001 get no pages or fields), account-level booking detail, real network names (SWIFT gpi, CHAPS rules), CBPR+ usage rules, an editor for flows, i18n beyond `en`.
- Anti-goals: stating cover-method facts the public sources do not support; a diagram that works only with a pointer or only with colour.

## Content truth rules

- Serial is described as lesson 4 describes it: each bank sends its own pacs.008 to the next one, `MsgId` changes each hop, `EndToEndId` and `UETR` stay (schema text, already cited in lesson 4).
- Cover rests on weak sources (lesson 4 says so). The flow shows it as an **outline** with a visible notice, uses only the claims lesson 4 makes (customer message toward the creditor agent; a second message tells the banks in between to move funds; the receiver matches them by amount, currency and date; the BoE handbook lists the cover message against a `pacs.009` usage), and does not add timing, field values or rules.
- Settlement codes are used with the repository's own wording (the overlay `codes.SettlementMethod1Code`), and `check-content` rejects a code the schema does not list.
- The cast reuses sample 2 (`pacs.008-intermediary`): debtor `Sample Importer Ltd`, debtor agent `TESTGB2LXXX`, intermediary `TESTUS33XXX`, creditor agent `TESTDEFFXXX`, creditor `Sample Supplier GmbH`. Serial step 2 is exactly sample 2's message and links to it. Synthetic only.
- All text is AI-drafted and unreviewed; the page says so like the lessons do (`lesson.draft` wording, new key), `lastReviewed.by` = `unreviewed (AI-drafted, pending T-093)`.

## Approaches

1. **Data-driven page: YAML flow in a content collection, one Preact island (FlowPlayer).** Content is validated at build like lessons and samples; check-content resolves every element path and settlement code. Cost: a new schema and a collection. **Chosen [call].**
2. Hard-code the steps in the component. Smaller, but nothing checks that paths or codes exist and content edits need TypeScript. Rejected: breaks the project's "content is checked data" rule.
3. Static SVG per step, no JS. Accessible and light, but no Next/Prev and no animation (T-071). Rejected.

## Design

**Data** (`src/content/flows/<id>.yaml`, strict zod `FlowSchema`): `id`, `message`, `title`, `summary`, `lesson` (lesson id), `sample` (sample id used by serial step 2), `sources`, `lastReviewed`, `participants[]` (`id`, `role`, `who`), `variants[]` (`id` serial|cover, `title`, `intro`, `notice?`, `steps[]`). Step: `from`, `to` (participant ids; equal means "no travel", e.g. matching), `title`, `text`, `message?` (short label of what travels, e.g. "pacs.008 #1"), `elements?` (paths in the message), `settlement?` (a code).

**check-content rules:** `message` has a schema; every `elements` path resolves; every `settlement` is a code of `SettlementMethod1Code`; `from`/`to` are participants; in each variant every participant is `from` or `to` of at least one step (this is the "steps through every participant" rule); `lesson` and `sample` exist; ids match file names.

**Page** `/flows/<id>/` (`src/pages/flows/[id].astro`), indexed by Pagefind, linked from Start here step 4 (replaces "coming soon") and from lesson 4 (replaces the "Coming soon" section). Island `FlowPlayer` (`client:load`).

**FlowPlayer UI [call]:**
- Variant switch (Serial / Cover) as a tablist (`TabList`); switching resets to step 1.
- Desktop (md and up): a row of participant cards (role, who) with a connector line; the current step's `from` and `to` are marked (a "Sender"/"Receiver" word on the card, not colour alone) and the message label sits on the connector. Hidden below md.
- Mobile (below md): the diagram is hidden; a numbered list of every step title (`ol`, current step `aria-current="step"`, each item a button that selects it). Shown only below md.
- Both widths: Previous/Next buttons (`aria-disabled` at the ends, so focus is never lost), "Step n of N", and a detail card for the current step (title, text, message label, settlement code with its wording, element links to `/messages/<id>/#<path>`, a link to the sample when the step names one). The detail card is a polite live region.
- Cover variant shows the `notice` above the diagram.
- Deep link `#<variant>/<n>` read on load, written with `replaceState`; invalid values fall back to the first step.
- Pure logic (parse hash, clamp step, next/prev) in `src/lib/flow.ts` with tests.

**Animation (T-071) [call]:** a "message" marker on the diagram moves from the `from` card to the `to` card (CSS transition on `left`, about 600 ms) each time the step changes; the connector between the two active cards gets a short pulse. Under `prefers-reduced-motion: reduce` both are off (no transition, no animation; marker jumps). No autoplay. Mobile list has no animation.

**Checks:** `check-content` and its tests (T-070 task 1); unit tests for `flow.ts`; `scripts/check-flow.ts` in `check:ui` (stepping through every participant at 1280px, step list at 390px, hash, variant switch, settlement code text); axe on the flow page at both widths; T-071 adds a check with `reducedMotion: reduce` and `no-preference` (computed transition and animation). Every check is shown failing once against a deliberate break.

## Left to the builder

Visual treatment within existing tokens (`frontend-design:frontend-design`), exact wording of step text (rules above), class names.
