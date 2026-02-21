import { NextResponse } from "next/server";

const MIN_PASSWORD_LENGTH = 8;

type ResetPasswordBody = {
  token?: unknown;
  newPassword?: unknown;
};

export async function POST(request: Request) {
  let body: ResetPasswordBody;

  try {
    body = (await request.json()) as ResetPasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  // TODO: Verify token in database:
  // - token exists
  // - token is not expired
  // - token has not been used
  // - token belongs to a valid user

  // TODO: Hash the new password with a strong algorithm (Argon2 or bcrypt).

  // TODO: Update the user record/auth provider with the hashed password.

  // TODO: Delete or invalidate the used reset token (one-time use).

  return NextResponse.json({
    message: "Password has been reset. You can now sign in with your new password.",
  });
}

