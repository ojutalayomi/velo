import type {
  NotificationActor,
  NotificationGroup,
  NotificationTab,
  NotificationTarget,
  NotificationType,
} from "@/lib/types/type";

export interface NotificationEventPayload {
  groupKey: string;
  type: NotificationType;
  targetType: NotificationTarget;
  targetId: string;
  url: string;
  snippet?: string;
  createdAt: string;
  actor: NotificationActor;
}

export interface NotificationNewEvent {
  notification: NotificationEventPayload;
  unreadCount?: number;
}

export interface NotificationRemovedEvent {
  groupKey: string;
  actorId: string;
  unreadCount?: number;
}

const MAX_NAMES = 3;

export function notificationAction(
  group: Pick<NotificationGroup, "type" | "targetType">
): string {
  switch (group.type) {
    case "like":
      return group.targetType === "comment" ? "liked your comment" : "liked your post";
    case "comment":
      return group.targetType === "comment"
        ? "replied to your comment"
        : "commented on your post";
    case "follow":
      return "started following you";
    case "mention":
      if (group.targetType === "chat_message") return "mentioned you in a chat";
      if (group.targetType === "comment") return "mentioned you in a comment";
      return "mentioned you in a post";
    default:
      return "sent you a notification";
  }
}

export function formatNotificationText(group: NotificationGroup): string {
  const names = group.actors.slice(0, MAX_NAMES).map((actor) => actor.name);
  const others = group.actorCount - names.length;

  if (names.length === 0) return notificationAction(group);

  const nameList =
    others > 0
      ? `${names.join(", ")} and ${others} others`
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : names.join(", ");

  return `${nameList} ${notificationAction(group)}`;
}

export function matchesNotificationTab(
  event: Pick<NotificationActor, "verified"> & Pick<NotificationGroup, "type">,
  tab: NotificationTab
): boolean {
  if (tab === "mentions") return event.type === "mention";
  if (tab === "verified") return event.verified === true;
  return true;
}

function upsertActor(actors: NotificationActor[], actor: NotificationActor): NotificationActor[] {
  const next: NotificationActor[] = [];
  let replaced = false;

  for (const existing of actors) {
    if (existing.id === actor.id) {
      next.push(actor);
      replaced = true;
    } else {
      next.push(existing);
    }
  }

  return replaced ? next : [...actors, actor];
}

export function mergeNotificationGroup(
  groups: NotificationGroup[],
  event: NotificationNewEvent
): NotificationGroup[] {
  const { notification } = event;
  const index = groups.findIndex((group) => group.groupKey === notification.groupKey);

  if (index === -1) {
    const group: NotificationGroup = {
      groupKey: notification.groupKey,
      type: notification.type,
      targetType: notification.targetType,
      targetId: notification.targetId,
      url: notification.url,
      snippet: notification.snippet,
      latestAt: notification.createdAt,
      count: 1,
      actorCount: 1,
      unread: true,
      actors: [notification.actor],
    };
    return [group, ...groups];
  }

  const existing = groups[index];
  const actors = upsertActor(existing.actors, notification.actor);
  const isNewActor = actors.length > existing.actors.length;
  const merged: NotificationGroup = {
    ...existing,
    url: notification.url,
    snippet: notification.snippet ?? existing.snippet,
    latestAt: notification.createdAt,
    count: existing.count + 1,
    actorCount: isNewActor ? existing.actorCount + 1 : existing.actorCount,
    unread: true,
    actors: actors.slice(0, MAX_NAMES),
  };

  return [merged, ...groups.slice(0, index), ...groups.slice(index + 1)];
}

export function removeActorFromGroups(
  groups: NotificationGroup[],
  event: Pick<NotificationRemovedEvent, "groupKey" | "actorId">
): NotificationGroup[] {
  const index = groups.findIndex((group) => group.groupKey === event.groupKey);
  if (index === -1) return groups;

  const existing = groups[index];
  const actors = existing.actors.filter((actor) => actor.id !== event.actorId);
  const count = existing.count - 1;

  if (count <= 0) {
    return [...groups.slice(0, index), ...groups.slice(index + 1)];
  }

  const removedActor = actors.length < existing.actors.length;
  const next: NotificationGroup = {
    ...existing,
    count,
    actorCount: removedActor ? Math.max(0, existing.actorCount - 1) : existing.actorCount,
    actors,
  };

  return [...groups.slice(0, index), next, ...groups.slice(index + 1)];
}
