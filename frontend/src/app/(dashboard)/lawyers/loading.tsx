export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-slate-200/60 dark:bg-white/5 rounded-md" />
      </div>
      <div className="h-12 bg-slate-200 dark:bg-white/10 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-20 bg-slate-200/60 dark:bg-white/5 rounded" />
              </div>
            </div>
            <div className="h-16 bg-slate-200/40 dark:bg-white/5 rounded-xl" />
            <div className="h-9 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
