import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  // Dev fallback: log instead of crashing if SMTP is unreachable.
  if (!env.AUTH_ENABLED) {
    console.warn(`[mail] AUTH_ENABLED=false — would send to ${input.to}: ${input.subject}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });
  } catch (err) {
    console.error("[mail] sendMail failed:", err);
    throw err;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
