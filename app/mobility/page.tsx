import { MainLayout } from "@/components/layout/main-layout"
import { PhysioContent } from "@/components/physio/physio-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function MobilityPage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <PhysioContent />
    </MainLayout>
  )
}
