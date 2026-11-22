# T-071 Flow animation: plan

Ledger task: T-071 (Phase 6). Simple task per [[ADR-011 Process per task]]: the design is the "Animation (T-071)" paragraph of [[2026-11-22-flow-design]], which is binding. One task.

**Global constraints.** Same as [[2026-11-22-t070-flowplayer-plan]] (content rules, `t()` for text, tokens, Conventional Commits with trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, specific files staged only, every new check shown failing once against a deliberate break, `settled()` before reads after an action, a check must be able to fail). Run `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run check:size`, `npm run check:a11y`, `npm run check:ui` and read the output for FAIL lines.

## Task 1: Animate the flow diagram

Files: `src/components/FlowPlayer.tsx`, `src/styles/global.css` (only if the motion rules fit better there), `scripts/check-flow.ts`.

1. On the desktop diagram, a message marker (a small envelope or dot; it needs a text alternative only if it carries meaning, otherwise `aria-hidden`) sits on the `from` card and moves to the `to` card when the step changes: CSS transition of position, about 600 ms, `ease-in-out`. The connector between the two active cards gets a short pulse (one or two iterations, not infinite) when a step is entered. The sender/receiver words, ring and message label stay as they are (no state by motion alone). A step with `from == to` shows the marker without travelling. First render (page load, deep link, variant switch) places the marker at its position without travelling from elsewhere.
2. `prefers-reduced-motion: reduce` turns both off: no transition and no animation (computed `transition-duration` 0s and `animation-name` none on the marker and connector), marker jumps. Use CSS (`motion-safe:` / `motion-reduce:` utilities or a media query), not JS-only; the JS must not rely on timers for the final state (the marker's end position is correct without the transition finishing).
3. No autoplay, no new controls, no animation in the mobile step list.
4. `check-flow.ts`: with a context emulating `reducedMotion: "reduce"`, the computed transition duration of the marker and the animation of the active connector are none/0s; with `reducedMotion: "no-preference"` they are non-zero; after Next the marker's final position is on the `to` card (use `settled()`), in both modes. Show each assertion failing once (for example, delete the reduce rule; break the position).
5. Axe still passes with the animation (check:a11y). Page JS size still within budget.

Done when: motion stops with the setting on (check proves both modes), the marker ends on the receiving card, and all local checks pass.
