import { MainLayout } from "@/components/layout/main-layout"
import { FuelContent } from "@/components/fuel/fuel-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function FuelPage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <FuelContent />
    </MainLayout>
  )
}
