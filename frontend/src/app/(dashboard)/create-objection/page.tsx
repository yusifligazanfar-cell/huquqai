import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Etiraz Yaradıcısı | HüquqAI",
  description: "Qərarlara etiraz ərizələrini generasiya edin.",
}

export default function CreateObjectionPage() {
  return <DocumentCreatorWorkspace docType="objection" />
}
