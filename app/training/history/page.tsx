import { MainLayout } from "@/components/layout/main-layout"
import { WorkoutHistory } from "@/components/training/workout-history"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function WorkoutHistoryPage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")
  if (user?.role === "PHYSIO") redirect("/physio")

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <WorkoutHistory />
    </MainLayout>
  )
}
