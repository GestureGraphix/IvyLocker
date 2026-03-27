import { MainLayout } from "@/components/layout/main-layout"
import { AccountContent } from "@/components/account/account-content"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (user?.role === "COACH") redirect("/coach")

  let profile: Record<string, any> = {}
  if (user) {
    const rows = await sql`
      SELECT ap.sport, ap.team, ap.position, ap.jersey_number, ap.phone,
             ap.location, ap.university, ap.graduation_year,
             ap.height_cm, ap.weight_kg, ap.hydration_goal_oz,
             ap.calorie_goal, ap.protein_goal_grams
      FROM athlete_profiles ap
      WHERE ap.user_id = ${user.id}
    `
    profile = rows[0] ?? {}
  }

  return (
    <MainLayout userName={user?.name || "Demo Athlete"} userRole={user?.role || "ATHLETE"}>
      <AccountContent
        initialName={user?.name ?? ""}
        initialEmail={user?.email ?? ""}
        initialProfile={profile}
      />
    </MainLayout>
  )
}
