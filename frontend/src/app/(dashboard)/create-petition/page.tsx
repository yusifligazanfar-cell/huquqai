import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "İddia Ərizəsi | HüquqAI",
  description: "İddia ərizələrini süni intellektin köməyi ilə saniyələr ərzində formalaşdırın.",
}

export default function CreatePetitionPage() {
  return <DocumentCreatorWorkspace docType="petition" />
}
