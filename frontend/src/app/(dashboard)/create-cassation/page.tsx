import type { Metadata } from "next"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"

export const metadata: Metadata = {
  title: "Kassasiya Şikayəti | HüquqAI",
  description: "Ali Məhkəməyə təqdim edilməli olan kassasiya şikayətlərini tərtib edin.",
}

export default function CreateCassationPage() {
  return <DocumentCreatorWorkspace docType="cassation" />
}
