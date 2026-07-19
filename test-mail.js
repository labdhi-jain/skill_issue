import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  },
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: `"SKILL ISSUE" <${process.env.SMTP_USER}>`,
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test',
    });
    console.log('Success:', info.messageId);
  } catch (err) {
    console.error('Mail send failed:', err.message);
  }
}

run();
