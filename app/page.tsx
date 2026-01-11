import { MainLayout } from "@/components/layout/main-layout"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <DashboardContent userName={user?.name} />
    </MainLayout>
  )
}
