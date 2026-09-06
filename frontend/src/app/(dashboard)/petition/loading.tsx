export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-2 sm:p-4">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-slate-200/60 dark:bg-white/5 rounded-md" />
      </div>
      <div className="h-96 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-6 space-y-4">
        <div className="h-10 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
        <div className="h-40 bg-slate-200/40 dark:bg-white/5 rounded-xl" />
        <div className="h-11 w-40 bg-slate-200 dark:bg-white/10 rounded-xl" />
      </div>
    </div>
  )
}
