export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-2 sm:p-4">
      <div className="space-y-2 text-center md:text-left">
        <div className="h-8 w-56 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-80 bg-slate-200/60 dark:bg-white/5 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="h-80 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-6 space-y-4">
          <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-11 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
          <div className="h-11 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
          <div className="h-11 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
        </div>
        <div className="h-80 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] p-6 space-y-4">
          <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-24 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
          <div className="h-11 bg-slate-200/60 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
