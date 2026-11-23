# ADR-018 Glossary as YAML content

Status: accepted 2026-11-23.

**Decision.** Each glossary term is one YAML file in `src/content/glossary/` (term, plain wording, message, element paths, related terms, optional lesson), validated by a strict zod schema and by `check-content` against the message schema. Pages `/glossary/` and `/glossary/<id>/` are static; the Details pane of the workspace links the term whose elements include the selected path. The official definition is never stored in a term file: the page reads it from the generated schema JSON.

**Why.** Same rule as flows and mappings ([[ADR-017 Flows as YAML content]]): content is checked data. A wrong element path, a missing related term or two terms claiming one path fails the build. Reading the ISO text from the schema keeps one source for it and keeps our wording separate from the official text.

**Consequences.** One term per file keeps review and later translation small. A path belongs to at most one term, so the panel link is unambiguous. The wording is AI-drafted and marked as such until T-093. Design: [[2026-11-23-glossary-design]].
