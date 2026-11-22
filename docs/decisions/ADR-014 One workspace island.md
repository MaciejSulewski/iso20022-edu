---
status: accepted
date: 2026-11-22
---
# ADR-014 One workspace island

**Decision:** The XML view, the schema tree and the details panel live in one Preact island (`Workspace`). The selected element is one `path` string held by the workspace; the XML view and the tree are controlled components (`selected`, `onSelect`). The workspace alone owns the `#path` hash and the details panel. No `@preact/signals` and no cross-island store.

**Why:** Three separate islands would need a shared store, and every island would own its own hash and panel logic (the situation after T-042 and T-050). One island shares state through props, adds no dependency, and keeps the page well inside the JS budget. This settles the signals question left open in the T-042 spec.

**Cost:** Selection by path loses the repeat index of a repeated sample element (`Dbtr[2]`); the XML view keeps its own current row when it already shows the selected path. Changing the panes means touching one component tree.

See [[2026-11-22-workspace-design]].
