import { MainLayout } from "@/components/layout/main-layout"
import { ScheduleContent } from "@/components/schedule/schedule-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SchedulePage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <ScheduleContent />
    </MainLayout>
  )
}
