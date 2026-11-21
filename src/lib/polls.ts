/** Poll definition stored on a post (`Poll`) or serialized as a chat message's content. */
export interface PollData {
  question: string;
  options: string[];
  /** Allow choosing more than one option. */
  multiple: boolean;
  /** ISO time after which voting is closed. */
  expiresAt?: string;
}

export interface PollResults {
  counts: number[];
  /** Total votes cast (a multiple-choice voter counts once per chosen option). */
  total: number;
  /** Number of distinct people who voted. */
  voters: number;
  myVotes: number[];
}

export type PollTargetType = "post" | "message";

export const POLL_LIMITS = { question: 200, option: 80, minOptions: 2, maxOptions: 6 } as const;

/** Validates untrusted input and returns a clean poll, or null when it is not a valid poll. */
export function sanitizePoll(input: unknown): PollData | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<PollData>;
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question || question.length > POLL_LIMITS.question) return null;
  if (!Array.isArray(raw.options)) return null;

  const options: string[] = [];
  for (const option of raw.options) {
    if (typeof option !== "string") return null;
    const text = option.trim();
    if (!text) continue;
    if (text.length > POLL_LIMITS.option) return null;
    if (!options.some((o) => o.toLowerCase() === text.toLowerCase())) options.push(text);
  }
  if (options.length < POLL_LIMITS.minOptions || options.length > POLL_LIMITS.maxOptions) return null;

  const poll: PollData = { question, options, multiple: raw.multiple === true };
  if (typeof raw.expiresAt === "string" && !Number.isNaN(Date.parse(raw.expiresAt))) {
    poll.expiresAt = new Date(raw.expiresAt).toISOString();
  }
  return poll;
}

/** Parses a poll message's content; returns null for ordinary text. */
export function parsePollContent(content: string | undefined): PollData | null {
  if (!content || content[0] !== "{") return null;
  try {
    return sanitizePoll(JSON.parse(content));
  } catch {
    return null;
  }
}

export function isPollClosed(poll: PollData, now = Date.now()) {
  return !!poll.expiresAt && Date.parse(poll.expiresAt) <= now;
}

/** Validates the chosen option indexes for a poll; returns de-duplicated indexes or null. */
export function validateVote(poll: PollData, options: unknown): number[] | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  const picked = new Set<number>();
  for (const value of options) {
    if (!Number.isInteger(value) || value < 0 || value >= poll.options.length) return null;
    picked.add(value);
  }
  if (!poll.multiple && picked.size > 1) return null;
  return [...picked].sort((a, b) => a - b);
}

export function pollPreview(poll: PollData) {
  return `📊 ${poll.question}`;
}

/** Text for chat-list previews: poll messages store JSON, which should not be shown raw. */
export function lastMessagePreview(content: string | undefined) {
  const poll = parsePollContent(content);
  return poll ? pollPreview(poll) : (content ?? "");
}

/** Readable one-line text for a message (previews, quotes, copy), hiding poll JSON. */
export function messageText(message: { messageType?: string; content?: string }) {
  if (message.messageType === "Poll") {
    const poll = parsePollContent(message.content);
    if (poll) return pollPreview(poll);
  }
  return message.content ?? "";
}
