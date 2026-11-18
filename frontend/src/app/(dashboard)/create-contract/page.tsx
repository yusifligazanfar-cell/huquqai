import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Müqavilə Tərtibatçısı | HüquqAI",
  description: "Müxtəlif növ müqavilələri avtomatik tərtib edin.",
}

export default function CreateContractPage() {
  return <DocumentCreatorWorkspace docType="contract" />
}
