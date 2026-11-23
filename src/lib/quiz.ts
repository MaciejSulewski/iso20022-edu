// Scoring for the quiz. Pure: no DOM, no Astro.
export type Verdict = "right" | "wrong" | "skipped";

export type Scored = { correct: number; total: number; results: Verdict[] };

/** picks[i] is the chosen option index of question i, or undefined. An index outside the options counts as skipped. */
export function score(
  questions: { options: string[]; answer: number }[],
  picks: (number | undefined)[],
): Scored {
  const results = questions.map((q, i): Verdict => {
    const p = picks[i];
    if (
      p === undefined ||
      !Number.isInteger(p) ||
      p < 0 ||
      p >= q.options.length
    )
      return "skipped";
    return p === q.answer ? "right" : "wrong";
  });
  return {
    correct: results.filter((r) => r === "right").length,
    total: questions.length,
    results,
  };
}
