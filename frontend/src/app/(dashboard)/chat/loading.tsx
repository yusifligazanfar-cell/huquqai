export default function Loading() {
  return (
    <div className="h-[calc(100svh-5.5rem)] flex flex-col justify-between animate-pulse p-2 sm:p-4">
      <div className="space-y-4 max-w-3xl mx-auto w-full pt-8">
        <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-white/10 mx-auto" />
        <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-lg mx-auto" />
      </div>
      <div className="max-w-3xl mx-auto w-full pb-4">
        <div className="h-14 bg-slate-200 dark:bg-white/10 rounded-2xl" />
      </div>
    </div>
  )
}
