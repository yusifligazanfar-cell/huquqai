import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Vəsatət Yaradıcısı | HüquqAI",
  description: "Məhkəmə vəsatətlərini asanlıqla hazırlayın.",
}

export default function CreateMotionPage() {
  return <DocumentCreatorWorkspace docType="motion" />
}
