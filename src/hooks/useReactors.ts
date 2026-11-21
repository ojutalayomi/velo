"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";

export interface ReactorInfo {
  name: string;
  username?: string;
  displayPicture?: string;
}

// Module-level cache so a user is resolved at most once per session.
const cache = new Map<string, ReactorInfo>();
const inflight = new Map<string, Promise<void>>();

async function fetchUser(id: string) {
  try {
    const res = await fetch(`/api/users?search=true&query=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const json = await res.json();
    const user = json?.data?.[0];
    if (user) {
      cache.set(id, {
        name: user.name || user.username || "Unknown user",
        username: user.username,
        displayPicture: user.displayPicture,
      });
    }
  } catch {
    // leave unresolved; callers fall back to a generic label
  } finally {
    inflight.delete(id);
  }
}

/**
 * Resolves user ids (e.g. the people who reacted to a message) to display info.
 * Seeds from users already known in the loaded chat (message senders and the current
 * user), and fetches any remaining ids once.
 */
export function useReactors(userIds: string[], fetchMissing = true) {
  const messages = useSelector((state: RootState) => state.chat.messages);
  const me = useSelector((state: RootState) => state.user.userdata);
  const [, setVersion] = useState(0);

  const known = useMemo(() => {
    const map = new Map<string, ReactorInfo>();
    for (const m of messages) {
      const s = m.sender;
      if (s?.id && s.name) {
        map.set(s.id, { name: s.name, username: s.username, displayPicture: s.displayPicture });
      }
    }
    if (me?._id) {
      map.set(String(me._id), {
        name: me.name,
        username: me.username,
        displayPicture: me.displayPicture,
      });
    }
    return map;
  }, [messages, me]);

  const key = userIds.join(",");
  useEffect(() => {
    if (!fetchMissing) return;
    const missing = [...new Set(key ? key.split(",") : [])].filter(
      (id) => id && !known.has(id) && !cache.has(id) && !inflight.has(id)
    );
    if (missing.length === 0) return;
    let active = true;
    Promise.all(
      missing.map((id) => {
        const p = fetchUser(id);
        inflight.set(id, p);
        return p;
      })
    ).then(() => active && setVersion((v) => v + 1));
    return () => {
      active = false;
    };
  }, [key, known, fetchMissing]);

  return (id: string): ReactorInfo | undefined => known.get(id) ?? cache.get(id);
}
