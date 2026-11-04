import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (!env.smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      requireTLS: !env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendPasswordResetEmail(to, token) {
  const mailer = getTransporter();
  if (!mailer) throw new Error('SMTP email delivery is not configured.');

  const resetUrl = new URL('/reset-password', env.clientOrigin);
  resetUrl.searchParams.set('token', token);
  const safeUrl = escapeHtml(resetUrl.toString());

  return mailer.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your StudyFlow password',
    text: [
      'We received a request to reset your StudyFlow password.',
      '',
      `Use this one-time link within 30 minutes: ${resetUrl.toString()}`,
      '',
      'If you did not request this change, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html><html><body style="margin:0;padding:32px;background:#f7f8fc;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px"><h1 style="font-size:22px">Reset your StudyFlow password</h1><p>We received a request to reset the password for your account.</p><p>This one-time link expires in 30 minutes.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:9px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p style="font-size:13px;color:#64748b">If you did not request a password reset, you can safely ignore this email.</p></div></body></html>`,
  });
}
