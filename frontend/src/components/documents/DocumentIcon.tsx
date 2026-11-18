import {
  BadgeCheck,
  Ban,
  BookOpen,
  Briefcase,
  Building2,
  FileCheck2,
  FileText,
  Gavel,
  Hand,
  Handshake,
  Landmark,
  MailWarning,
  Mic,
  Scale,
  ScrollText,
  ShieldAlert,
} from "lucide-react"
import type { DocumentIconName } from "@/lib/legal-documents"

export function DocumentIcon({
  name,
  className = "w-5 h-5",
}: {
  name: DocumentIconName
  className?: string
}) {
  switch (name) {
    case "handshake":
      return <Handshake className={className} aria-hidden="true" />
    case "scale":
      return <Scale className={className} aria-hidden="true" />
    case "landmark":
      return <Landmark className={className} aria-hidden="true" />
    case "hand":
      return <Hand className={className} aria-hidden="true" />
    case "ban":
      return <Ban className={className} aria-hidden="true" />
    case "gavel":
      return <Gavel className={className} aria-hidden="true" />
    case "building":
      return <Building2 className={className} aria-hidden="true" />
    case "shield-alert":
      return <ShieldAlert className={className} aria-hidden="true" />
    case "mail-warning":
      return <MailWarning className={className} aria-hidden="true" />
    case "scroll-text":
      return <ScrollText className={className} aria-hidden="true" />
    case "book-open":
      return <BookOpen className={className} aria-hidden="true" />
    case "file-check":
      return <FileCheck2 className={className} aria-hidden="true" />
    case "briefcase":
      return <Briefcase className={className} aria-hidden="true" />
    case "mic":
      return <Mic className={className} aria-hidden="true" />
    case "badge-check":
      return <BadgeCheck className={className} aria-hidden="true" />
    case "file-text":
    default:
      return <FileText className={className} aria-hidden="true" />
  }
}
