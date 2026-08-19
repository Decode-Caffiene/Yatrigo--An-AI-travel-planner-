import nodemailer from "nodemailer";

let transporterPromise;

/**
 * Lazily builds a nodemailer transporter.
 * Uses real SMTP credentials when configured (SMTP_HOST/SMTP_USER/SMTP_PASS).
 * Otherwise falls back to an Ethereal test inbox so email sending works
 * out of the box in development - the preview URL is logged to the console.
 */
const getTransporter = () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          family: 4,
        });
      }

      const testAccount = await nodemailer.createTestAccount();

      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }

  return transporterPromise;
};

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Yatrigo" <no-reply@yatrigo.app>',
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email preview (no SMTP configured): ${previewUrl}`);
  }

  return info;
};
