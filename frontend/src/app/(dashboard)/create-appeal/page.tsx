import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Apellyasiya Şikayəti | HüquqAI",
  description: "Məhkəmə qərarlarına qarşı əsaslandırılmış apellyasiya şikayətləri hazırlayın.",
}

export default function CreateAppealPage() {
  return <DocumentCreatorWorkspace docType="appeal" />
}
