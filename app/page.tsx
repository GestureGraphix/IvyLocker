import { MainLayout } from "@/components/layout/main-layout"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")
  if (user?.role === "PHYSIO") redirect("/physio")

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <DashboardContent userName={user?.name} />
    </MainLayout>
  )
}
