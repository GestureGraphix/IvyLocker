import { AthleteDetailView } from "@/components/coach/athlete-detail-view"

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AthleteDetailView athleteId={id} />
}
