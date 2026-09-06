export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-slate-200/60 dark:bg-white/5 rounded-md" />
      </div>

      {/* Filter / Search Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="h-11 bg-slate-200 dark:bg-white/10 rounded-xl" />
        <div className="h-11 bg-slate-200 dark:bg-white/10 rounded-xl" />
        <div className="h-11 bg-slate-200 dark:bg-white/10 rounded-xl" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="h-52 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-md" />
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-md" />
              <div className="h-3.5 w-full bg-slate-200/60 dark:bg-white/5 rounded-md" />
            </div>
            <div className="h-9 w-full bg-slate-200/60 dark:bg-white/5 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
