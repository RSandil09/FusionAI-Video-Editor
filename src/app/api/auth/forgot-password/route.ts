import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getFirebaseAdmin } from "@/lib/auth/server";

export async function POST(request: Request) {
	try {
		const { email } = await request.json();

		if (!email || typeof email !== "string") {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Generate the reset link via Firebase Admin — same link Firebase would send,
		// but we deliver it via our own SMTP instead of Firebase's default sender.
		const { auth } = getFirebaseAdmin();
		let resetLink: string;
		try {
			resetLink = await auth.generatePasswordResetLink(email);
		} catch (err: any) {
			// user-not-found → return generic message so we don't leak account existence
			if (err?.errorInfo?.code === "auth/user-not-found") {
				return NextResponse.json({ ok: true });
			}
			throw err;
		}

		const smtpUser = process.env.SMTP_USER;
		const smtpPass = process.env.SMTP_PASS;

		if (!smtpUser || !smtpPass) {
			throw new Error("SMTP_USER and SMTP_PASS environment variables are not set");
		}

		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 587,
			secure: false,
			auth: { user: smtpUser, pass: smtpPass },
		});

		await transporter.sendMail({
			from: `"Fusion AI" <${smtpUser}>`,
			to: email,
			subject: "Reset your Fusion AI password",
			html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#18181b;border-radius:12px;border:1px solid #27272a;padding:40px 36px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Fusion AI</span>
            </td>
          </tr>
          <tr>
            <td style="color:#e4e4e7;font-size:20px;font-weight:600;padding-bottom:12px;">
              Reset your password
            </td>
          </tr>
          <tr>
            <td style="color:#a1a1aa;font-size:14px;line-height:1.6;padding-bottom:28px;">
              We received a request to reset the password for your Fusion AI account.
              Click the button below to choose a new password. This link expires in 1 hour.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${resetLink}"
                 style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                Reset password
              </a>
            </td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:12px;line-height:1.5;padding-bottom:20px;border-top:1px solid #27272a;padding-top:20px;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password won't change until you click the link above.
            </td>
          </tr>
          <tr>
            <td style="color:#52525b;font-size:11px;">
              Can't click the button? Copy and paste this URL into your browser:<br/>
              <span style="color:#7c3aed;word-break:break-all;">${resetLink}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("❌ Forgot password error:", error);
		return NextResponse.json(
			{ error: "Failed to send reset email. Please try again." },
			{ status: 500 },
		);
	}
}
