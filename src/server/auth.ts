import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, magicLink } from "better-auth/plugins";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { sendMail } from "@/server/mail";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.TRUSTED_ORIGINS,
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Defensive validation: the magic link URL must belong to the
        // configured auth origin. This guards against any odd redirect or
        // misconfiguration that could land an attacker-controlled URL in the
        // outbound email.
        if (!url.startsWith(env.BETTER_AUTH_URL)) {
          throw new Error("[auth] refusing to send magic link with unexpected URL host");
        }
        const safeUrl = escapeHtml(url);
        await sendMail({
          to: email,
          subject: "career-hub — your sign-in link",
          html: `
            <div style="font-family:Inter,sans-serif;font-size:14px;color:#0d1014;">
              <h2 style="font-family:Poppins,sans-serif;">Sign in to career-hub</h2>
              <p>Click the link below to sign in. It expires in 15 minutes.</p>
              <p><a href="${safeUrl}" style="color:#c4006d;">Sign in</a></p>
              <p style="color:#6b7280;font-size:12px;">If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
      },
      expiresIn: 60 * 15,
    }),
    bearer(),
  ],
});

export const isAuthEnabled = env.AUTH_ENABLED;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
