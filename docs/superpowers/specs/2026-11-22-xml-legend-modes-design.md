# XML legend, hover previews, beginner/full mode (T-046): design

Status: written without a live approval round (unattended Phase 3 run). Design calls are marked **[call]**. Builds on [[2026-11-21-annotated-xml-design]]. The user reviews the look in T-045.

## Intent and goals

A reader should see at a glance which elements a payment must carry, which are optional, which are alternatives and which repeat, without clicking each one; get a quick preview on hover; and be able to hide the optional detail while learning the core. Done when (ledger): no state relies on colour alone.

## Design

- **Four states, each with a symbol, a word and a tint [call]:** required (filled dot, "Required"), optional (hollow dot, "Optional"), one of several alternatives (diamond, "Choice"), repeating (loop mark, "Repeats"). A row can have two (required and repeating). The state marker sits after the element button as an inline symbol with a visually hidden full label; the tint is a bonus, never the signal. Container elements get markers too. State comes from `node.info` (`mandatory`, `choiceMember`, `repeating`; min/max are local to the parent: "required" means required when its parent is present, the legend says so).
- **Legend:** always visible above the XML (a compact definition list: symbol, word, one-line meaning, plus "Required means required inside its parent"). Not collapsible. All text via `t()`.
- **Hover preview [call]:** pointer hover or keyboard focus on an element button shows a small tooltip (`role="tooltip"`, linked with `aria-describedby`): ISO name, state words, and the first sentence of the plain-English explanation (fall back to the first sentence of the ISO definition). Dismissible with Esc, stays while hovered (WCAG 1.4.13), a short show delay, never covers the element itself. On touch (`(hover: none)`) there is no tooltip: a tap already opens the sheet, which is the preview. Clicking still selects and opens the panel.
- **Beginner / full mode [call]:** a switch (`<button aria-pressed>`) above the XML. Full (default) shows everything. Beginner hides optional elements and everything under them, and shows a muted line "N optional elements hidden" with the count. Deep links to a hidden element switch to full mode; switching to beginner while a hidden element is selected moves the selection to its nearest visible ancestor (same rule as collapsing). Persisted in `localStorage` (`xml.mode`, guarded for blocked storage). Closing tags of hidden elements disappear with them.
- **Look:** existing tokens only. State symbols are small, monospace-aligned in one gutter column so the eye can scan down; required stronger weight/contrast than optional (still AA). No new motion.

## Non-goals

Colour theming beyond the tokens, a legend in the full tree (T-050), per-user preferences beyond the mode switch.

## Verification

Unit tests for the pure parts (state derivation, first-sentence helper, visible-rows filter) in `src/lib/`; extend `scripts/check-annotated-xml.ts`: legend present, every element row exposes its state as text (not colour), hover and focus show the tooltip and Esc hides it, beginner mode hides optional rows and shows the count, a deep link to a hidden element switches to full, axe stays clean in both themes with the legend and a tooltip open. `check:size` stays green.
