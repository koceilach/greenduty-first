import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_RESEND_FROM_EMAIL = "onboarding@resend.dev";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? DEFAULT_RESEND_FROM_EMAIL;
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type ForgotPasswordBody = {
  email?: unknown;
};

export async function POST(request: Request) {
  let body: ForgotPasswordBody;

  try {
    body = (await request.json()) as ForgotPasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  // TODO: Add per-IP and per-email rate limiting to prevent abuse.

  // TODO: Generate a cryptographically secure reset token.
  // Example plan:
  // 1) token = crypto.randomBytes(...)
  // 2) tokenHash = secure hash of token (store hash only)

  // TODO: Save tokenHash in database with:
  // - user identifier (resolved by email)
  // - created_at timestamp
  // - expires_at timestamp (short TTL, e.g. 15-30 minutes)
  // - used_at nullable field for one-time use enforcement

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    new URL(request.url).origin;

  // TODO: Replace this placeholder with the real token once token generation
  // and DB persistence are implemented.
  const resetLink = `${appBaseUrl}/reset-password?token=TODO_GENERATED_TOKEN`;

  if (!resend) {
    return NextResponse.json(
      { error: "Email service is not configured. Missing RESEND_API_KEY." },
      { status: 500 }
    );
  }

  const senderCandidates = Array.from(
    new Set(
      [RESEND_FROM_EMAIL, DEFAULT_RESEND_FROM_EMAIL]
        .map((sender) => sender.trim())
        .filter((sender) => sender.length > 0)
    )
  );

  let lastErrorMessage = "Unknown email provider error.";

  for (const sender of senderCandidates) {
    try {
      const { data, error } = await resend.emails.send({
        from: sender,
        to: email,
        subject: "Reset your GreenDuty password",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin: 0 0 12px;">Password Reset Request</h2>
            <p style="margin: 0 0 16px;">
              We received a request to reset your password for GreenDuty.
            </p>
            <p style="margin: 0 0 16px;">
              <a href="${resetLink}" style="display: inline-block; padding: 10px 16px; border-radius: 999px; background: #10b981; color: #052e2b; font-weight: 700; text-decoration: none;">
                Reset Password
              </a>
            </p>
            <p style="margin: 0; color: #475569;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        lastErrorMessage = error.message ?? "Resend rejected the email request.";
        console.error("Resend forgot-password error:", {
          from: sender,
          error,
        });
        continue;
      }

      if (!data?.id) {
        lastErrorMessage = "Email provider did not return a message id.";
        console.error("Resend forgot-password missing message id:", {
          from: sender,
          data,
        });
        continue;
      }

      return NextResponse.json({
        message: "If an account exists for that email, a reset link has been sent.",
      });
    } catch (error) {
      lastErrorMessage =
        error instanceof Error
          ? error.message
          : "Unexpected error while sending reset email.";
      console.error("Failed to send forgot-password email:", {
        from: sender,
        error,
      });
    }
  }

  const errorPayload: { error: string; details?: string } = {
    error: "Failed to send reset email. Please verify your Resend sender/domain setup.",
  };

  if (process.env.NODE_ENV !== "production") {
    errorPayload.details = lastErrorMessage;
  }

  return NextResponse.json(errorPayload, { status: 502 });

}
