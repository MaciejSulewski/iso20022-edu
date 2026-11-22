// Where each Start-here step's tool lives, so the home page and the lesson pages agree. A step with no entry has no tool yet.
export const WORKSPACE_ID = "pacs.008.001.14";
const TOOLS: Record<string, string> = {
  xml: `messages/${WORKSPACE_ID}/`,
  tree: `messages/${WORKSPACE_ID}/`,
  flow: "flows/pacs.008-agent-chain/",
};

export const toolHref = (step: string, base: string) =>
  TOOLS[step] ? `${base}${TOOLS[step]}` : undefined;
