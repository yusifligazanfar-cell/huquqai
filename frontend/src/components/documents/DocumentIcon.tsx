import { Ban, FileText, Gavel, Hand, Handshake, Landmark, Scale } from "lucide-react"
import type { DocumentTypeSpec } from "@/lib/legal-documents"

export function DocumentIcon({
  name,
  className = "w-5 h-5",
}: {
  name: DocumentTypeSpec["iconName"]
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
    case "file-text":
    default:
      return <FileText className={className} aria-hidden="true" />
  }
}
