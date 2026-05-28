import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

const ses = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const FROM = process.env.SES_FROM_EMAIL || "noreply@ivylocker.com"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

async function send(to: string, subject: string, html: string) {
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    })
  )
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`
  await send(
    to,
    "Verify your Lockeroom email",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:24px;color:#162e22">Welcome to Lockeroom, ${name}</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5">
        Verify your email address to activate your account.
      </p>
      <a href="${link}" style="display:inline-block;background:#162e22;color:#f7f2ea;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:15px;font-weight:600">
        Verify Email
      </a>
      <p style="margin:24px 0 0;color:#999;font-size:13px">
        Link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
    `
  )
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`
  await send(
    to,
    "Reset your Lockeroom password",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:24px;color:#162e22">Reset your password</h2>
      <p style="margin:0 0 4px;color:#555;font-size:15px">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5">
        We received a request to reset your password. Click below to choose a new one.
      </p>
      <a href="${link}" style="display:inline-block;background:#162e22;color:#f7f2ea;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:15px;font-weight:600">
        Reset Password
      </a>
      <p style="margin:24px 0 0;color:#999;font-size:13px">
        Link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
      </p>
    </div>
    `
  )
}
