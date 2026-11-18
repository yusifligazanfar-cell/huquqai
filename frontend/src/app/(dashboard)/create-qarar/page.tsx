import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Qərar Layihəsinin yaradıcısı | HüquqAI",
  description: "Yalnız təhsil məqsədilə — şablon əsasında qərar mətn nümunələri hazırlayın.",
}

export default function CreateQararPage() {
  return <DocumentCreatorWorkspace docType="qarar" />
}
