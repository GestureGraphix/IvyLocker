import { MainLayout } from "@/components/layout/main-layout"
import { PhysioContent } from "@/components/physio/physio-content"
import { getCurrentUser } from "@/lib/auth"

export default async function MobilityPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <PhysioContent />
    </MainLayout>
  )
}
