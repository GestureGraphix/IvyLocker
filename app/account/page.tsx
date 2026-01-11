import { MainLayout } from "@/components/layout/main-layout"
import { AccountContent } from "@/components/account/account-content"
import { getCurrentUser } from "@/lib/auth"

export default async function AccountPage() {
  const user = await getCurrentUser()

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <AccountContent />
    </MainLayout>
  )
}
