import { getCurrentUser } from "@/lib/auth"
import { PhysioPortal } from "@/components/physio/physio-portal"
import { MainLayout } from "@/components/layout/main-layout"
import { redirect } from "next/navigation"

export default async function PhysioPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== "PHYSIO") redirect("/")

  return (
    <MainLayout userName={user.name} userRole="PHYSIO">
      <PhysioPortal />
    </MainLayout>
  )
}
