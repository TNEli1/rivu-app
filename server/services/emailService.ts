import * as dotenv from 'dotenv';
dotenv.config();

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send email using configured provider (Postmark in production, console in development)
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.POSTMARK_API_KEY) {
      // In production, use Postmark to send actual emails
      const postmarkClient = require('postmark').ServerClient;
      const client = new postmarkClient(process.env.POSTMARK_API_KEY);
      
      await client.sendEmail({
        From: process.env.EMAIL_FROM || 'noreply@rivufinance.com',
        To: emailData.to,
        Subject: emailData.subject,
        TextBody: emailData.text,
        HtmlBody: emailData.html
      });
      return true;
    } else {
      // In development, just log to console with more visible formatting
      console.log('\n\n====== DEVELOPMENT MODE: EMAIL WOULD BE SENT IN PRODUCTION ======');
      console.log(`To: ${emailData.to}`);
      console.log(`Subject: ${emailData.subject}`);
      console.log(`Text content: ${emailData.text.substring(0, 100)}...`);
      
      // Extract the reset URL from the email content to make it easy to test
      const resetUrlMatch = emailData.html.match(/href="([^"]+)"/);
      if (resetUrlMatch && resetUrlMatch[1]) {
        console.log('\n✅ PASSWORD RESET LINK: ' + resetUrlMatch[1]);
      }
      
      console.log('====== END EMAIL CONTENT ======\n\n');
      return true;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  resetUrl: string
): Promise<boolean> {
  const subject = 'Reset Your Rivu Finance Password';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2F80ED;">Reset Your Rivu Finance Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your Rivu Finance account.</p>
      <p>Please click the button below to set a new password. This link will expire in 30 minutes.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2F80ED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Thank you,<br>The Rivu Finance Team</p>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="font-size: 12px; color: #666;">This link will expire in 30 minutes. If you need a new link, please visit the <a href="${process.env.APP_URL || 'https://rivufinance.com'}/forgot-password">forgot password page</a>.</p>
    </div>
  `;
  
  const textContent = `
    Reset Your Rivu Finance Password
    
    Hello,
    
    We received a request to reset your password for your Rivu Finance account.
    
    Please visit the following link to set a new password:
    ${resetUrl}
    
    This link will expire in 30 minutes.
    
    If you didn't request a password reset, you can safely ignore this email.
    
    Thank you,
    The Rivu Finance Team
  `;
  
  return await sendEmail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  });
}