import { MainLayout } from "@/components/layout/main-layout"
import { FuelContent } from "@/components/fuel/fuel-content"
import { getCurrentUser } from "@/lib/auth"

export default async function FuelPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <FuelContent />
    </MainLayout>
  )
}
