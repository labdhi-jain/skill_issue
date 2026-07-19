// server/mailer.js — Nodemailer + Gmail setup
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  },
});

export async function sendOtpEmail(toEmail, code) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background: #0D0B14; font-family: 'Courier New', monospace; }
        .wrap { max-width: 480px; margin: 40px auto; background: #13101F; border: 1px solid #2A2440; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #FF2079, #6B21A8); padding: 32px 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 900; color: #fff; letter-spacing: 4px; }
        .header p  { margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; letter-spacing: 2px; }
        .body { padding: 40px; text-align: center; }
        .label { color: #6B6480; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
        .code  { font-size: 52px; font-weight: 900; letter-spacing: 16px; color: #D4FF3D;
                  background: rgba(212,255,61,0.06); border: 2px solid rgba(212,255,61,0.2);
                  border-radius: 12px; padding: 20px 32px; display: inline-block; margin: 8px 0 24px; }
        .note  { color: #4A4060; font-size: 12px; line-height: 1.6; }
        .footer { border-top: 1px solid #1E1A2E; padding: 20px 40px; text-align: center;
                  color: #3A3050; font-size: 11px; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <h1>SKILL ISSUE</h1>
          <p>// A TYPING GAME WITH TRUST ISSUES</p>
        </div>
        <div class="body">
          <div class="label">your verification code</div>
          <div class="code">${code}</div>
          <div class="note">
            Enter this code in the game to verify your email.<br>
            Expires in <strong style="color:#FF2079">10 minutes</strong>.<br><br>
            If you didn't request this, ignore this email.
          </div>
        </div>
        <div class="footer">SKILL ISSUE · you asked for this</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Skill Issue Game" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Your Verification Code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html,
  });
}

export async function verifyConnection() {
  return transporter.verify();
}
