"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Adjust these import paths to match your project
import { fetchCommentsPage } from "@/lib/getStatus";
import { PostSchema } from "@/lib/types/type";

const PAGE_SIZE = 20;
const CLOSE_MS = 200;

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 52) return `${w}w`;
  return `${Math.floor(d / 365)}y`;
}

function CommentRow({ comment }: { comment: PostSchema }) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <div
        className="size-8 shrink-0 rounded-full bg-gray-300 bg-cover bg-center"
        style={{ backgroundImage: `url(${comment.DisplayPicture || "/default.jpeg"})` }}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {comment.Username || comment.NameOfPoster || "user"}
          </span>
          <span>{timeAgo(comment.TimeOfPost)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100">
          {comment.Caption}
        </p>
      </div>
    </li>
  );
}

export default function CommentsDrawer({
  post,
  onClose,
  footer,
}: {
  /** The post whose comments to show. Pass null to keep the drawer closed. */
  post: PostSchema | null;
  onClose: () => void;
  /** Optional slot for a comment composer pinned to the bottom of the drawer. */
  footer?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [comments, setComments] = useState<PostSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const skipRef = useRef(0);
  const loadingRef = useRef(false);
  const requestRef = useRef(0); // guards against stale responses when the post changes
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const postId = post?.PostID;

  const loadMore = useCallback(async () => {
    if (!postId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const requestId = requestRef.current;

    try {
      const res = await fetchCommentsPage(postId, skipRef.current, PAGE_SIZE);
      if (requestId !== requestRef.current) return;
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c._id));
        return [...prev, ...res.data.filter((c) => !seen.has(c._id))];
      });
      skipRef.current += res.data.length;
      setHasMore(res.pagination.hasMore && res.data.length > 0);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load comments");
      setHasMore(false);
    } finally {
      if (requestId === requestRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [postId]);

  // Reset + first load whenever a different post is opened
  useEffect(() => {
    requestRef.current += 1;
    loadingRef.current = false;
    skipRef.current = 0;
    setComments([]);
    setError(null);
    setHasMore(true);
    setLoading(false);

    if (!postId) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true)); // triggers slide-up
    void loadMore();
    return () => cancelAnimationFrame(raf);
  }, [postId, loadMore]);

  // Infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    const root = scrollRef.current;
    if (!node || !root || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root, rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadMore, comments.length]);

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  // Escape to close + lock page scroll while open
  useEffect(() => {
    if (!postId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [postId, close]);

  if (!post) return null;

  const commentsDisabled = post.WhoCanComment === "none";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Comments">
      {/* backdrop */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* sheet: full-width bottom sheet on mobile, centered column on larger screens */}
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex h-[70dvh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-neutral-900 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="relative flex shrink-0 flex-col items-center border-b border-gray-200 px-4 pb-3 pt-2 dark:border-neutral-800">
          <div className="mb-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-neutral-700" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Comments
            {post.NoOfComment > 0 ? ` · ${post.NoOfComment}` : ""}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close comments"
            className="absolute right-3 top-3 rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {commentsDisabled ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Comments are turned off for this post.
            </p>
          ) : (
            <>
              {comments.length === 0 && !loading && !error && (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  No comments yet. Be the first to comment.
                </p>
              )}

              <ul>
                {comments.map((c) => (
                  <CommentRow key={c._id} comment={c} />
                ))}
              </ul>

              {hasMore && <div ref={sentinelRef} className="h-1" />}

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 px-4 py-6 text-sm text-gray-500">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setHasMore(true);
                      void loadMore();
                    }}
                    className="rounded-full border border-gray-300 px-3 py-1 text-gray-700 dark:border-neutral-700 dark:text-gray-200"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {footer && !commentsDisabled && (
          <div className="shrink-0 border-t border-gray-200 pb-[env(safe-area-inset-bottom)] dark:border-neutral-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
