import { Skeleton } from "@/components/ui/skeleton";

/** Same outline as the app shell, shown while the session loads so the layout doesn't jump. */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full" aria-busy="true" aria-label="Memuat">
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-24" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="ml-auto h-7 w-28" />
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
