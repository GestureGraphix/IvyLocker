import { MainLayout } from "@/components/layout/main-layout"
import { TrainingContent } from "@/components/training/training-content"
import { getCurrentUser } from "@/lib/auth"

export default async function TrainingPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <TrainingContent />
    </MainLayout>
  )
}
