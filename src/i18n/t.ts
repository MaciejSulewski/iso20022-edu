import en from "./ui.en.json" with { type: "json" };

export type UiKey = keyof typeof en;

export function t(key: UiKey): string {
  const value: string | undefined = en[key];
  if (value === undefined) throw new Error(`Missing i18n key: ${key}`);
  return value;
}
