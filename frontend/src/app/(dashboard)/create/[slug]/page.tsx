import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocumentCreatorWorkspace } from "@/components/documents/DocumentCreatorWorkspace"
import { EXTENDED_DOCUMENT_TYPES, getDocumentSpecBySlug } from "@/lib/legal-documents"

export function generateStaticParams() {
  return EXTENDED_DOCUMENT_TYPES.map((spec) => ({ slug: spec.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const spec = getDocumentSpecBySlug(slug)
  if (!spec) {
    return { title: "Sənəd Generatoru | HüquqAI" }
  }
  return {
    title: `${spec.title} | HüquqAI`,
    description: spec.description,
  }
}

export default async function ExtendedDocumentCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const spec = getDocumentSpecBySlug(slug)
  if (!spec || spec.category !== "extended") {
    notFound()
  }
  return <DocumentCreatorWorkspace docType={spec.id} />
}
