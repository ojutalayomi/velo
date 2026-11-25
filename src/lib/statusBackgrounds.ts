/** Backgrounds for text statuses. The id is what is stored; the server only accepts these ids. */
export const STATUS_BACKGROUNDS = [
  { id: "brand", label: "Coral", css: "linear-gradient(135deg, #ff6257 0%, #ff9a6b 100%)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)" },
  { id: "forest", label: "Forest", css: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { id: "violet", label: "Violet", css: "linear-gradient(135deg, #614385 0%, #516395 100%)" },
  { id: "gold", label: "Gold", css: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { id: "rose", label: "Rose", css: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)", dark: true },
  { id: "night", label: "Night", css: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)" },
] as const;

export type StatusBackgroundId = (typeof STATUS_BACKGROUNDS)[number]["id"];

export const DEFAULT_STATUS_BACKGROUND: StatusBackgroundId = "brand";

export function isStatusBackground(id: unknown): id is StatusBackgroundId {
  return STATUS_BACKGROUNDS.some((bg) => bg.id === id);
}

export function statusBackground(id?: string) {
  return STATUS_BACKGROUNDS.find((bg) => bg.id === id) ?? STATUS_BACKGROUNDS[0];
}

export const MAX_STATUS_TEXT = 500;
