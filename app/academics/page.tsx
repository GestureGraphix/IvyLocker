import { MainLayout } from "@/components/layout/main-layout"
import { AcademicsContent } from "@/components/academics/academics-content"
import { getCurrentUser } from "@/lib/auth"

export default async function AcademicsPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <AcademicsContent />
    </MainLayout>
  )
}
