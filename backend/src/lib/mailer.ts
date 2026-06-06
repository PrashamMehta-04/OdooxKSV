import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.log(`[mailer] SMTP not configured. Would send email to ${to}: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: `"VendorBridge" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}
