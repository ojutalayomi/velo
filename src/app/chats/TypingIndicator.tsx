import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface TypingUser {
  id: string;
  name: string;
  displayPicture?: string;
}

/** "A is typing…", "A and B are typing…", "A, B and 2 others are typing…" */
export function typingLabel(users: { name: string }[], suffix = "typing…") {
  const names = [...new Set(users.map((u) => u.name?.split(" ")[0] || "Someone"))];
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is ${suffix}`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are ${suffix}`;
  const others = names.length - 2;
  return `${names[0]}, ${names[1]} and ${others} ${others === 1 ? "other" : "others"} are ${suffix}`;
}

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

/** Chat-list bubble shown after the last message while someone is typing. */
export function TypingBubble({
  users,
  showAvatars = false,
}: {
  users: TypingUser[];
  showAvatars?: boolean;
}) {
  if (users.length === 0) return null;
  const shown = users.slice(0, 3);
  return (
    <div className="my-2 mb-4 flex items-end gap-2 text-left" role="status" aria-live="polite">
      {showAvatars && (
        <div className="flex -space-x-2">
          {shown.map((u) => (
            <Avatar key={u.id} className="size-6 ring-2 ring-background">
              <AvatarImage src={u.displayPicture} alt={u.name} className="object-cover" />
              <AvatarFallback className="text-[10px] capitalize">
                {u.name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
      <div className="rounded-2xl rounded-bl-none bg-gray-100 px-3 py-2.5 shadow-sm dark:bg-zinc-800">
        <TypingDots />
      </div>
      <span className="sr-only">{typingLabel(users)}</span>
    </div>
  );
}
