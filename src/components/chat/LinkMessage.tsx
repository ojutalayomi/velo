"use client";

import { ArrowUpRight, ExternalLink, FileText, Link2, MessageSquareText, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { LinkPreview } from "@/components/LinkPreview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InternalLink, InternalTarget, parseInternalLink } from "@/lib/internalLink";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";

interface Preview {
  title: string;
  subtitle?: string;
  image?: string;
  action: string;
  Icon: typeof Link2;
}

const cache = new Map<string, Preview | null>();

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Loads the details an internal link points at. Falls back to a plain card when it can't. */
async function loadPreview(target: InternalTarget): Promise<Preview | null> {
  switch (target.kind) {
    case "post": {
      const { post } = await getJson(`/api/post/${encodeURIComponent(target.id)}`);
      if (!post) return null;
      const open = post.Visibility === undefined || post.Visibility === "everyone";
      return {
        title: post.NameOfPoster ? `${post.NameOfPoster} (@${post.Username ?? target.username})` : `@${target.username}`,
        // Only a public post's words and picture are shown in the card.
        subtitle: open ? String(post.Caption ?? "").slice(0, 140) : "Post",
        image: open ? post.Image?.[0] : undefined,
        action: "View post",
        Icon: FileText,
      };
    }
    case "profile": {
      const user = await getJson(`/api/users/${encodeURIComponent(target.username)}`);
      return {
        title: user.name || `@${user.username}`,
        subtitle: [`@${user.username}`, user.bio].filter(Boolean).join(" · ").slice(0, 140),
        image: user.displayPicture,
        action: "View profile",
        Icon: UserRound,
      };
    }
    case "invite": {
      const invite = await getJson(`/api/invites/${encodeURIComponent(target.token)}`);
      if (!invite.valid) return { title: "Group invite", subtitle: "This invite is no longer valid", action: "Open", Icon: Users };
      return {
        title: invite.name || "Group invite",
        subtitle: `${invite.memberCount} ${invite.memberCount === 1 ? "member" : "members"}`,
        image: invite.displayPicture,
        action: invite.isMember ? "Open group" : "Join group",
        Icon: Users,
      };
    }
    default:
      return null;
  }
}

function useInternalPreview(target: InternalTarget, key: string) {
  const [state, setState] = useState<{ key: string; preview: Preview | null } | null>(() =>
    cache.has(key) ? { key, preview: cache.get(key) ?? null } : null
  );

  useEffect(() => {
    if (cache.has(key) || target.kind === "page" || target.kind === "group" || target.kind === "chat") return;
    let cancelled = false;
    loadPreview(target)
      .catch(() => null)
      .then((preview) => {
        cache.set(key, preview);
        if (!cancelled) setState({ key, preview });
      });
    return () => {
      cancelled = true;
    };
  }, [key, target]);

  return state?.key === key ? state.preview : null;
}

/** Group and chat links resolve from the chats already loaded, so they need no request. */
function useLocalPreview(target: InternalTarget): Preview | null {
  const convo = useSelector((state: RootState) =>
    target.kind === "group" || target.kind === "chat"
      ? state.chat.conversations.find((c) => c.id === target.id)
      : undefined
  );
  if (target.kind !== "group" && target.kind !== "chat") return null;
  if (!convo) {
    return target.kind === "group"
      ? { title: "Group chat", subtitle: "Open in Velo", action: "Open group", Icon: Users }
      : { title: "Chat", subtitle: "Open in Velo", action: "Open chat", Icon: MessageSquareText };
  }
  return {
    title: convo.name,
    subtitle: target.kind === "group" ? `${convo.participants.length} members` : "Direct message",
    image: convo.displayPicture,
    action: target.kind === "group" ? "Open group" : "Open chat",
    Icon: target.kind === "group" ? Users : MessageSquareText,
  };
}

function InternalCard({ link, own }: { link: InternalLink; own: boolean }) {
  const remote = useInternalPreview(link.target, link.path);
  const local = useLocalPreview(link.target);
  const preview: Preview = remote ??
    local ?? { title: "Velo", subtitle: link.path, action: "Open", Icon: Link2 };
  const { Icon } = preview;

  // Opened with the router (no reload), so a call or draft in progress keeps going.
  return (
    <Link
      href={link.path}
      className={cn(
        "group block min-w-[230px] max-w-[320px] overflow-hidden rounded-xl border border-brand/30 transition-colors",
        own ? "bg-brand/10 hover:bg-brand/20" : "bg-brand/5 hover:bg-brand/10"
      )}
    >
      {preview.image && link.target.kind === "post" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="max-h-44 w-full object-cover" />
      )}
      <div className="flex items-center gap-3 p-3">
        {link.target.kind !== "post" ? (
          <Avatar className="size-11 shrink-0">
            <AvatarImage src={preview.image} alt={preview.title} className="object-cover" />
            <AvatarFallback className="bg-brand/15 text-brand">
              <Icon className="size-5" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{preview.title}</p>
          {preview.subtitle && (
            <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{preview.subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-brand/20 px-3 py-1.5 text-xs font-medium text-brand">
        <span className="uppercase tracking-wide opacity-70">Velo</span>
        <span className="flex items-center gap-1">
          {preview.action}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** A message that is only a link: Velo links open in-app, other links open in a new tab. */
export function LinkMessage({ url, own }: { url: string; own: boolean }) {
  const link = useMemo(() => {
    const origins = [process.env.NEXT_PUBLIC_BASE_URL ?? "", typeof window !== "undefined" ? window.location.origin : ""];
    return parseInternalLink(url, origins.filter(Boolean));
  }, [url]);

  if (link) return <InternalCard link={link} own={own} />;

  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep the raw text */
  }
  return (
    <div className="flex min-w-[230px] max-w-[320px] flex-col">
      <LinkPreview url={url} direction="row" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 break-all text-sm text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
      >
        <ExternalLink className="size-3.5 shrink-0" />
        <span>{host}</span>
      </a>
    </div>
  );
}
