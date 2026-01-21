import { MainLayout } from "@/components/layout/main-layout"
import { ScheduleContent } from "@/components/schedule/schedule-content"
import { getCurrentUser } from "@/lib/auth"

export default async function SchedulePage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <ScheduleContent />
    </MainLayout>
  )
}
