import { Skeleton } from "@/components/ui/skeleton";

// Shown in the detail pane the moment a chat card is clicked, while the route loads.
export default function Loading() {
  return (
    <div className="z-10 flex size-full min-h-screen flex-1 flex-col overflow-hidden rounded-lg border-l bg-white shadow-md mobile:absolute dark:bg-black">
      <div className="flex min-h-12 items-center gap-4 bg-gray-100 px-3 py-2 dark:bg-zinc-900">
        <Skeleton className="size-6 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-6">
        <Skeleton className="mx-auto size-20 rounded-full" />
        <Skeleton className="h-10 w-2/3 self-start rounded-2xl" />
        <Skeleton className="h-10 w-1/2 self-end rounded-2xl" />
        <Skeleton className="h-10 w-3/5 self-start rounded-2xl" />
      </div>
    </div>
  );
}
