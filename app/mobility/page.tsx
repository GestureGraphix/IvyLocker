import { MainLayout } from "@/components/layout/main-layout"
import { MobilityContent } from "@/components/mobility/mobility-content"
import { getCurrentUser } from "@/lib/auth"

export default async function MobilityPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <MobilityContent />
    </MainLayout>
  )
}
