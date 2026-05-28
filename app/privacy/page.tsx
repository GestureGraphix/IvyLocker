export const metadata = {
  title: 'Privacy Policy — Lockeroom',
  description: 'Privacy Policy for Lockeroom, the athlete performance management platform.',
}

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#f7f2ea', minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 4, color: '#162e22', marginBottom: 8 }}>
          LOCKEROOM
        </p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 2, color: '#1a1a1a', margin: '0 0 8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 48 }}>
          Last updated: May 28, 2026
        </p>

        <Section title="1. Overview">
          Lockeroom (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a performance management platform built for
          collegiate student-athletes. This Privacy Policy explains what data we collect, how we use
          it, and your rights regarding that data. By using the Lockeroom app or website, you agree
          to this policy.
        </Section>

        <Section title="2. Information We Collect">
          <Subsection title="Account Information">
            When you register, we collect your name, email address, password (stored as a one-way
            hash), and role (athlete, coach, or physio).
          </Subsection>
          <Subsection title="Athletic Profile">
            Sport, team, position, university, graduation year, height, weight, and jersey number.
            This information is provided voluntarily and can be updated or deleted at any time.
          </Subsection>
          <Subsection title="Performance Data">
            Training sessions, exercise logs, mobility and recovery records, daily wellness
            check-ins (physical and mental state rated 1–10), and soreness zones.
          </Subsection>
          <Subsection title="Nutrition & Hydration">
            Meal logs including food name, calories, macronutrients (protein, carbs, fat), and
            hydration intake. Nutrition goals you set for yourself.
          </Subsection>
          <Subsection title="Academic Data">
            Course names, assignment titles, deadlines, and exam dates that you choose to log.
          </Subsection>
          <Subsection title="Usage Data">
            Standard server logs including IP address, browser type, pages visited, and timestamps.
            This data is used for security and debugging only.
          </Subsection>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={listStyle}>
            <li>To provide personalized AI-powered daily performance recommendations</li>
            <li>To display your training, nutrition, and wellness data in the app</li>
            <li>To send transactional emails (account verification, password reset)</li>
            <li>To allow coaches and physios to view athlete data they are authorized to access</li>
            <li>To improve the platform and diagnose technical issues</li>
          </ul>
          <p style={paraStyle}>
            We do not use your data for advertising, and we do not sell your data to third parties.
          </p>
        </Section>

        <Section title="4. AI Recommendations">
          Lockeroom uses Amazon Bedrock (powered by Anthropic&apos;s Claude) to generate daily
          performance recommendations. Your aggregated performance metrics — training load,
          nutrition totals, hydration, wellness scores, and academic schedule — are sent to this
          service to generate your recommendation. No personally identifiable information (name,
          email, or contact details) is included in AI requests. Amazon Bedrock&apos;s data
          processing is governed by AWS&apos;s privacy practices.
        </Section>

        <Section title="5. Data Sharing">
          <p style={paraStyle}>We share data only in the following limited circumstances:</p>
          <ul style={listStyle}>
            <li><strong>Coaches & Physios:</strong> If you are linked to a coach or physio on the platform, they can view your performance data as part of their authorized role.</li>
            <li><strong>Service Providers:</strong> We use Neon (PostgreSQL database), Amazon Web Services (email delivery and AI), and Vercel (hosting). These providers process data only as needed to operate the service.</li>
            <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect the safety of users.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          We retain your data for as long as your account is active. If you delete your account,
          your personal data is permanently deleted within 30 days. Anonymized, aggregated
          performance statistics may be retained for platform improvement.
        </Section>

        <Section title="7. Your Rights">
          <ul style={listStyle}>
            <li><strong>Access:</strong> You can view all data you have logged directly in the app.</li>
            <li><strong>Correction:</strong> You can update your profile and logged data at any time.</li>
            <li><strong>Deletion:</strong> You can request full account and data deletion by emailing us.</li>
            <li><strong>Portability:</strong> You can request a copy of your data in a machine-readable format.</li>
          </ul>
          <p style={paraStyle}>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@lockeroom.org" style={{ color: '#2d5a3d' }}>privacy@lockeroom.org</a>.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          Lockeroom is not directed at children under 13. We do not knowingly collect personal
          information from anyone under 13. If you believe a child has provided us with personal
          information, contact us and we will delete it promptly.
        </Section>

        <Section title="9. Security">
          Passwords are stored as cryptographic hashes and are never stored in plain text.
          All data is transmitted over HTTPS. Access to the database is restricted and
          authenticated. While we take reasonable measures to protect your data, no system is
          completely secure.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this policy from time to time. We will notify registered users of
          material changes via email. Continued use of the app after changes constitutes
          acceptance of the updated policy.
        </Section>

        <Section title="11. Contact">
          <p style={paraStyle}>
            If you have questions about this Privacy Policy, contact us at:
          </p>
          <p style={{ ...paraStyle, marginTop: 8 }}>
            <strong>Lockeroom</strong><br />
            <a href="mailto:privacy@lockeroom.org" style={{ color: '#2d5a3d' }}>privacy@lockeroom.org</a><br />
            <a href="https://lockeroom.org" style={{ color: '#2d5a3d' }}>lockeroom.org</a>
          </p>
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 22,
        letterSpacing: 1,
        color: '#162e22',
        margin: '0 0 12px',
        paddingBottom: 8,
        borderBottom: '1px solid #e0d9ce',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: '#444', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <strong style={{ color: '#1a1a1a' }}>{title}:</strong>{' '}
      <span style={{ color: '#444' }}>{children}</span>
    </div>
  )
}

const paraStyle: React.CSSProperties = {
  margin: '8px 0',
  fontSize: 15,
  color: '#444',
  lineHeight: 1.7,
}

const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: '8px 0',
  lineHeight: 1.9,
  color: '#444',
  fontSize: 15,
}
