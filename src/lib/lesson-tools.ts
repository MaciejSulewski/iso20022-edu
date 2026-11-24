// Where each Start-here step's tool lives, so the home page and the lesson pages agree. A step with no entry, other than `lesson`, fails the home page build.
export const WORKSPACE_ID = "pacs.008.001.14";
const TOOLS: Record<string, string> = {
  xml: `messages/${WORKSPACE_ID}/`,
  tree: `messages/${WORKSPACE_ID}/`,
  flow: "flows/pacs.008-agent-chain/",
  mapping: "mappings/mt103-pacs.008/",
  quiz: "quiz/pacs.008/",
};

// ui.en.json key of the lesson page's tool link text; a step not listed uses the workspace wording
export const toolLabelKey = (step: string) =>
  step === "flow"
    ? ("lesson.toolFlow" as const)
    : step === "mapping"
      ? ("lesson.toolMapping" as const)
      : step === "quiz"
        ? ("lesson.toolQuiz" as const)
        : ("lesson.tool" as const);

export const toolHref = (step: string, base: string) =>
  TOOLS[step] ? `${base}${TOOLS[step]}` : undefined;
