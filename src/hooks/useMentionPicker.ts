import { useState, useEffect, useRef, useCallback } from "react";

type MentionParticipant = {
  userId: string;
  username: string;
  name: string;
  displayPicture: string;
};

type Mention = {
  userId: string;
  username: string;
};

export function useMentionPicker(
  chatId: string | null,
  newMessage: string,
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>,
  /** Always-available entries such as @all and @ai; they are not fetched members. */
  specials: MentionParticipant[] = [],
  /** The signed-in user; they can't mention themselves, so they're left out of the list. */
  currentUserId?: string | null
): {
  showPicker: boolean;
  mentionQuery: string;
  filteredParticipants: MentionParticipant[];
  isFetching: boolean;
  mentions: Mention[];
  selectMention: (participant: MentionParticipant) => string;
  clearMentions: () => void;
} {
  const [showPicker, setShowPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [mentions, setMentions] = useState<Mention[]>([]);
  // Participants currently loaded into render-state for the active chatId
  const [participants, setParticipants] = useState<MentionParticipant[]>([]);

  // Ref-based cache keyed by chatId — accessed only inside effects/callbacks
  const participantsCache = useRef<Map<string, MentionParticipant[]>>(new Map());

  // Detect @partial before cursor
  useEffect(() => {
    const cursorPos = textAreaRef.current?.selectionStart ?? newMessage.length;
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setShowPicker(true);
      setMentionQuery(match[1]);
    } else {
      setShowPicker(false);
      setMentionQuery("");
    }
  }, [newMessage, textAreaRef]);

  // Fetch participants when picker opens and chatId is available
  useEffect(() => {
    if (!chatId) return;

    // If already cached, promote to state immediately (no fetch needed)
    if (participantsCache.current.has(chatId)) {
      setParticipants(participantsCache.current.get(chatId)!);
      return;
    }

    if (!showPicker) return;

    let cancelled = false;

    setIsFetching(true);

    fetch(`/api/chats?participants=true&chatId=${chatId}`)
      .then((res) => res.json())
      .then((data: MentionParticipant[]) => {
        if (!cancelled) {
          participantsCache.current.set(chatId, data);
          setParticipants(data);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showPicker, chatId]);

  // Reset participants state when chatId changes and cache doesn't have new chatId yet
  useEffect(() => {
    if (!chatId || participantsCache.current.has(chatId)) return;
    setParticipants([]);
  }, [chatId]);

  const lowerQuery = mentionQuery.toLowerCase();

  const matches = (p: MentionParticipant) =>
    p.username.toLowerCase().startsWith(lowerQuery) || p.name.toLowerCase().startsWith(lowerQuery);

  const filteredParticipants = [
    ...specials.filter(matches),
    ...participants
      .filter((p) => !currentUserId || String(p.userId) !== String(currentUserId))
      .filter(matches)
      .slice(0, 5),
  ];

  const selectMention = useCallback(
    (participant: MentionParticipant): string => {
      const cursorPos =
        textAreaRef.current?.selectionStart ?? newMessage.length;
      const textBeforeCursor = newMessage.slice(0, cursorPos);
      const textAfterCursor = newMessage.slice(cursorPos);

      const replacedPrefix = textBeforeCursor.replace(
        /@(\w*)$/,
        `@${participant.username} `
      );

      const updatedMessage = replacedPrefix + textAfterCursor;

      // `@ai` is detected from the text by the server; only real users and `@all` are recorded.
      if (participant.userId === "ai") {
        setShowPicker(false);
        setMentionQuery("");
        return updatedMessage;
      }

      setMentions((prev) => {
        const alreadyAdded = prev.some((m) => m.userId === participant.userId);
        if (alreadyAdded) return prev;
        return [
          ...prev,
          { userId: participant.userId, username: participant.username },
        ];
      });

      setShowPicker(false);
      setMentionQuery("");

      return updatedMessage;
    },
    [newMessage, textAreaRef, setShowPicker, setMentionQuery, setMentions]
  );

  const clearMentions = useCallback(() => {
    setMentions([]);
  }, [setMentions]);

  return {
    showPicker,
    mentionQuery,
    filteredParticipants,
    isFetching,
    mentions,
    selectMention,
    clearMentions,
  };
}
