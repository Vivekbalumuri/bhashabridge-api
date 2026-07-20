import 'dotenv/config';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function wrapLayout(bodyFragment) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #F8F8FC;
        color: #1A1A2E;
    }
    .container {
        max-width: 600px;
        margin: 40px auto;
        background: #FFFFFF;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .header {
        background: linear-gradient(135deg, #E8621A, #0D7377);
        padding: 40px 20px;
        text-align: center;
        color: #FFFFFF;
    }
    .logo-box {
        background: white;
        width: 50px;
        height: 50px;
        line-height: 50px;
        border-radius: 14px;
        display: inline-block;
        font-weight: bold;
        font-size: 28px;
        color: #E8621A;
        margin-bottom: 15px;
    }
    .content {
        padding: 40px;
        line-height: 1.6;
    }
    .footer {
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #6B6B8A;
        background: #F8F8FC;
    }
    .button {
        display: inline-block;
        padding: 14px 32px;
        background-color: #E8621A;
        color: #FFFFFF !important;
        text-decoration: none;
        border-radius: 14px;
        font-weight: bold;
        margin-top: 20px;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8F8FC; color: #1A1A2E;">
  ${bodyFragment}
</body>
</html>`;
}

const COMMON_FOOTER = `
    <div class="footer">
        &copy; 2026 BhashaBridge. All rights reserved.<br>
        bashabridge.customercare@gmail.com
    </div>
`;

export async function sendWelcomeEmail(email, displayName) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping welcome email to:', email);
    return;
  }
  const name = displayName || 'Learner';
  const htmlContent = wrapLayout(`
    <div class="container">
        <div class="header">
            <div class="logo-box">B</div>
            <h1 style="margin: 0; color: white;">Welcome to BhashaBridge!</h1>
        </div>
        <div class="content">
            <h2>Namaste, ${name}! 🎯</h2>
            <p>We're so excited to have you on board. You've taken the first step toward mastering South Indian languages.</p>
            <p>BhashaBridge makes learning <b>Telugu, Tamil, Malayalam, and Kannada</b> fun, interactive, and daily.</p>

            <center>
                <a href="https://play.google.com/store/apps/details?id=com.bhashabridge.app" class="button">Start Your First Lesson</a>
            </center>

            <p style="margin-top: 30px;">Happy learning,<br>The BhashaBridge Team</p>
        </div>
        ${COMMON_FOOTER}
    </div>
  `);

  try {
    await resend.emails.send({
      from: 'BhashaBridge <onboarding@yourdomain.com>',
      to: [email],
      subject: 'Welcome to BhashaBridge! 🎯',
      html: htmlContent
    });
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendPasswordResetEmail(email, resetLink) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping password reset email to:', email);
    return;
  }
  const htmlContent = wrapLayout(`
    <div class="container">
        <div class="header" style="background: #1A1A2E;">
            <div class="logo-box" style="background: linear-gradient(to bottom, #E8621A, #0D7377); color: white;">B</div>
            <h1 style="margin: 0; color: white;">Reset Password</h1>
        </div>
        <div class="content">
            <p>We received a request to reset the password for your BhashaBridge account.</p>
            <p>If you didn't make this request, you can safely ignore this email.</p>

            <center>
                <a href="${resetLink}" class="button" style="background-color: #0D7377;">Change My Password</a>
            </center>

            <p style="font-size: 13px; color: #6B6B8A; margin-top: 40px;">
                For security, this link will expire in 24 hours. Open this link on your phone to return directly to the app.
            </p>
        </div>
        ${COMMON_FOOTER}
    </div>
  `);

  try {
    await resend.emails.send({
      from: 'BhashaBridge <security@yourdomain.com>',
      to: [email],
      subject: 'Reset Password 🔑',
      html: htmlContent
    });
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}

export async function sendReferralRewardEmail(email, daysEarned) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping referral reward email to:', email);
    return;
  }
  const htmlContent = wrapLayout(`
    <div class="container">
        <div class="header" style="background: #E8621A;">
            <div class="logo-box" style="color: #E8621A;">B</div>
            <h1 style="margin: 0; color: white;">You Earned a Reward! 🎁</h1>
        </div>
        <div class="content">
            <p>Great news! A friend just joined BhashaBridge using your referral code.</p>
            <div style="background: #FDF0E8; border: 1px solid #E8621A; border-radius: 12px; padding: 20px; text-align: center;">
                <span style="font-size: 18px;">You've been granted</span><br>
                <span style="font-size: 32px; font-weight: bold; color: #E8621A;">${daysEarned} Days Premium</span>
            </div>
            <p>Your premium features (unlimited lives, ad-free learning) are now active in the app. Go check it out!</p>

            <center>
                <a href="bhashabridge://home" class="button">Open BhashaBridge</a>
            </center>
        </div>
        ${COMMON_FOOTER}
    </div>
  `);

  try {
    await resend.emails.send({
      from: 'BhashaBridge <rewards@yourdomain.com>',
      to: [email],
      subject: 'You earned a Reward! 🎁',
      html: htmlContent
    });
    console.log('Referral reward email sent to:', email);
  } catch (error) {
    console.error('Failed to send referral reward email:', error);
  }
}

export async function sendDailyReminderEmail(email, streak) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping daily reminder email to:', email);
    return;
  }
  const htmlContent = wrapLayout(`
    <div class="container">
        <div class="header">
            <div class="logo-box">B</div>
            <h1 style="margin: 0; color: white;">Time for your Daily Goal! 🎯</h1>
        </div>
        <div class="content">
            <p>Don't lose your learning streak! You were doing so well.</p>
            <p>Spending just 5 minutes today will help you remember those tricky new words.</p>

            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 64px;">🔥 ${streak}</span><br>
                <span style="color: #6B6B8A;">Day Streak</span>
            </div>

            <center>
                <a href="bhashabridge://lessons" class="button">Start Today's Lesson</a>
            </center>
        </div>
        ${COMMON_FOOTER}
    </div>
  `);

  try {
    await resend.emails.send({
      from: 'BhashaBridge <reminders@yourdomain.com>',
      to: [email],
      subject: 'Time for your Daily Goal! 🎯',
      html: htmlContent
    });
    console.log('Daily reminder email sent to:', email);
  } catch (error) {
    console.error('Failed to send daily reminder email:', error);
  }
}
