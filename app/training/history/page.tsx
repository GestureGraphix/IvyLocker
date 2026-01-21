import { MainLayout } from "@/components/layout/main-layout"
import { WorkoutHistory } from "@/components/training/workout-history"
import { getCurrentUser } from "@/lib/auth"

export default async function WorkoutHistoryPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <WorkoutHistory />
    </MainLayout>
  )
}
