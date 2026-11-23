# ADR-019 Quiz as YAML content

Status: accepted 2026-11-23.

**Decision.** Each quiz is one YAML file in `src/content/quizzes/` (title, summary, message, back-link lesson, questions with prompt, options, one right answer, explanation, optional lesson and element paths), validated by a strict zod schema and by `check-content` against the message schema and the lessons. The page `/quiz/<id>/` is static with one Preact island. It scores in the browser with a pure function (`src/lib/quiz.ts`), keeps nothing between visits and sends nothing anywhere.

**Why.** Same rule as flows, mappings and the glossary ([[ADR-017 Flows as YAML content]], [[ADR-018 Glossary as YAML content]]): content is checked data. A right-answer index outside the options, a missing lesson or a wrong element path fails the build. Scoring stays pure so it is tested without a browser; the browser check reads the expected answers from the YAML, never from the page.

**Consequences.** One right answer per question keeps scoring and the keyboard use simple; multi-answer questions would need a schema change. No saved progress: a fresh page is a fresh quiz. The questions are AI-drafted and marked as such until T-093. Design: [[2026-11-23-quiz-design]].
