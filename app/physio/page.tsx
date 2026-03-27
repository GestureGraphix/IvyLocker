import { getCurrentUser } from "@/lib/auth"
import { MainLayout } from "@/components/layout/main-layout"
import { PhysioDashboard } from "@/components/physio/physio-dashboard"

export default async function PhysioPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Physio"} userRole="PHYSIO">
      <PhysioDashboard />
    </MainLayout>
  )
}
