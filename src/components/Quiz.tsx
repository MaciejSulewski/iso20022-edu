import { useEffect, useRef, useState } from "preact/hooks";
import { score, type Verdict } from "../lib/quiz";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  elements: string[];
  /** Link to the lesson the answer comes from, with its ready-made text. */
  lesson: { href: string; text: string } | undefined;
}

export interface QuizLabels {
  form: string;
  check: string;
  retry: string;
  /** "{n}" and "{total}" are replaced. */
  score: string;
  right: string;
  wrong: string;
  skipped: string;
  /** "{answer}" is replaced by the right option's text. */
  answerIs: string;
  elements: string;
}

const btn =
  "rounded border border-line bg-bg px-4 py-2 text-sm font-medium aria-disabled:cursor-not-allowed aria-disabled:text-muted aria-disabled:opacity-60";

export default function Quiz({
  questions,
  labels,
  elementBase,
}: {
  questions: QuizQuestion[];
  labels: QuizLabels;
  /** Element links are `${elementBase}#<path>`. */
  elementBase: string;
}) {
  const [picks, setPicks] = useState<(number | undefined)[]>([]);
  const [checked, setChecked] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const refocus = useRef(false);

  // "Try again" puts focus on the first radio, once it is enabled again
  useEffect(() => {
    if (!checked && refocus.current) {
      refocus.current = false;
      form.current?.querySelector<HTMLInputElement>("input")?.focus();
    }
  }, [checked]);

  const result = checked ? score(questions, picks) : undefined;
  const verdictText: Record<Verdict, string> = {
    right: labels.right,
    wrong: labels.wrong,
    skipped: labels.skipped,
  };

  return (
    <form
      ref={form}
      aria-label={labels.form}
      onSubmit={(e) => {
        e.preventDefault();
        setChecked(true);
      }}
    >
      <ol class="space-y-6">
        {questions.map((q, i) => {
          const verdict = result?.results[i];
          return (
            <li key={q.id} data-quiz-question={q.id}>
              <fieldset>
                <legend class="max-w-[65ch] font-semibold">
                  <span class="text-muted tabular-nums">{`${i + 1}. `}</span>
                  {q.prompt}
                </legend>
                <div class="mt-2 space-y-2">
                  {q.options.map((o, j) => (
                    <label
                      key={j}
                      class="flex min-h-11 max-w-[65ch] cursor-pointer items-start gap-3 rounded border border-line px-3 py-2 has-checked:border-accent has-checked:bg-surface has-disabled:cursor-default"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        id={`q-${q.id}-${j}`}
                        value={j}
                        checked={picks[i] === j}
                        disabled={checked}
                        onChange={() =>
                          setPicks((p) => {
                            const n = [...p];
                            n[i] = j;
                            return n;
                          })
                        }
                        class="mt-1 size-4 shrink-0 accent-accent"
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {verdict && (
                <div
                  data-quiz-result={verdict}
                  class="mt-3 max-w-[65ch] rounded border border-line border-l-4 border-l-accent bg-surface p-3 text-sm"
                >
                  <p class="font-semibold">{verdictText[verdict]}</p>
                  {verdict !== "right" && (
                    <p class="mt-1">
                      {labels.answerIs.replace(
                        "{answer}",
                        q.options[q.answer]!,
                      )}
                    </p>
                  )}
                  <p class="mt-1">{q.explanation}</p>
                  {q.lesson && (
                    <p class="mt-2">
                      <a href={q.lesson.href}>{q.lesson.text}</a>
                    </p>
                  )}
                  {q.elements.length > 0 && (
                    <div class="mt-2">
                      <p class="font-semibold">{labels.elements}</p>
                      <ul class="mt-1 flex flex-wrap gap-2">
                        {q.elements.map((path) => (
                          <li key={path}>
                            <a
                              href={`${elementBase}#${path}`}
                              class="inline-block rounded border border-line bg-bg px-2 py-1 font-mono break-all"
                            >
                              {path}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        {/* aria-disabled, not disabled, so focus stays on the button after checking */}
        <button
          type="submit"
          class={btn}
          aria-disabled={checked ? "true" : undefined}
          onClick={(e) => checked && e.preventDefault()}
        >
          {labels.check}
        </button>
        {checked && (
          <button
            type="button"
            class={btn}
            onClick={() => {
              refocus.current = true;
              setPicks([]);
              setChecked(false);
            }}
          >
            {labels.retry}
          </button>
        )}
      </div>
      <p role="status" class="mt-4 text-lg font-semibold" data-quiz-status>
        {result &&
          labels.score
            .replace("{n}", String(result.correct))
            .replace("{total}", String(result.total))}
      </p>
    </form>
  );
}
