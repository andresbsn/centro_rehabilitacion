import nodemailer from 'nodemailer';

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let cachedTransporter = null;

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || 'turnos@centro.com';

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return { skipped: true, reason: 'NO_RECIPIENTS' };

  if (!transporter) {
    console.log('[email] skipped (SMTP not configured)', { to: recipients, subject });
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  return transporter.sendMail({
    from,
    to: recipients.join(', '),
    subject,
    text,
    html
  });
}
