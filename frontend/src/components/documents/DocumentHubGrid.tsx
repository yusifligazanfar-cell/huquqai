"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/legal-documents"
import { DocumentIcon } from "./DocumentIcon"

interface DocumentHubGridProps {
  selectedId?: DocumentTypeId
  onSelect?: (docType: DocumentTypeId) => void
  compact?: boolean
}

export function DocumentHubGrid({
  selectedId,
  onSelect,
  compact = false,
}: DocumentHubGridProps) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      }
    >
      {DOCUMENT_TYPES.map((spec) => {
        const isSelected = selectedId === spec.id
        const cardInner = (
          <div
            className={`group h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all text-left bg-white dark:bg-slate-900/90 ${
              isSelected
                ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-md"
                : "border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/70 dark:hover:border-indigo-600/60 hover:shadow-md"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border ${spec.accentClass}`}
                >
                  <DocumentIcon name={spec.iconName} className="w-5 h-5" />
                </span>
                {spec.badgeText ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {spec.badgeText}
                  </span>
                ) : (
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                    aria-hidden="true"
                  />
                )}
              </div>

              <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight mb-1.5 leading-snug">
                {spec.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {spec.description}
              </p>
            </div>

            {!compact && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <span>Sənəd formuna keç</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            )}
          </div>
        )

        if (onSelect) {
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => onSelect(spec.id)}
              aria-pressed={isSelected}
              className="block w-full min-h-12 text-left rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {cardInner}
            </button>
          )
        }

        return (
          <Link
            key={spec.id}
            href={spec.href}
            className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {cardInner}
          </Link>
        )
      })}
    </div>
  )
}
