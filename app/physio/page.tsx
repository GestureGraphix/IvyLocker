import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { PhysioDashboard } from "@/components/physio/physio-dashboard"

export default async function PhysioPage() {
  const user = await getCurrentUser()

  if (!user) redirect("/login")

  return (
    <MainLayout userName={user.name} userRole="PHYSIO">
      <PhysioDashboard />
    </MainLayout>
  )
}
