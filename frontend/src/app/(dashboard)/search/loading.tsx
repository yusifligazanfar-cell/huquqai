export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-2 sm:p-4">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-slate-200/60 dark:bg-white/5 rounded-md" />
      </div>
      <div className="h-14 rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="space-y-4 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-5 space-y-3">
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-4 w-full bg-slate-200/60 dark:bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
