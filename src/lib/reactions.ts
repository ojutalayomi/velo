import type { Reaction } from "@/lib/types/type";

export type ReactionGroup = {
  emoji: string;
  count: number;
  mine: boolean;
  userIds: string[];
};

/** Group reactions by emoji, most used first (ties keep the order they were added). */
export function groupReactions(reactions: Pick<Reaction, "reaction" | "userId">[], myId: string) {
  const groups = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const group = groups.get(r.reaction) ?? { emoji: r.reaction, count: 0, mine: false, userIds: [] };
    group.count += 1;
    group.mine ||= r.userId === myId;
    group.userIds.push(r.userId);
    groups.set(r.reaction, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

/** The first `max` groups, plus how many reactions are hidden in the rest. */
export function visibleReactions(groups: ReactionGroup[], max = 4) {
  const shown = groups.slice(0, max);
  const hidden = groups.slice(max).reduce((n, g) => n + g.count, 0);
  return { shown, hidden };
}
