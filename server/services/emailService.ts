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
    // CRITICAL FIX: Always use Postmark if API key is available, regardless of environment
    if (process.env.POSTMARK_API_KEY) {
      console.log('Sending email via Postmark API');
      console.log('Email configuration:');
      console.log(`- POSTMARK_API_KEY: ${process.env.POSTMARK_API_KEY ? 'Set (hidden)' : 'Not set'}`);
      console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set, using default: noreply@rivufinance.com'}`);
      
      try {
        // Import postmark dynamically to ensure it's loaded
        const postmark = require('postmark');
        const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
        
        // Use a valid sender email address that matches your Postmark verified domain
        const senderEmail = process.env.EMAIL_FROM || 'support@tryrivu.com';
        console.log(`Attempting to send email from: ${senderEmail} to: ${emailData.to}`);
        
        const result = await client.sendEmail({
          From: senderEmail,
          To: emailData.to,
          Subject: emailData.subject,
          TextBody: emailData.text,
          HtmlBody: emailData.html
        });
        
        console.log('Postmark email sent successfully:', result.MessageID);
        return true;
      } catch (postmarkError) {
        console.error('Postmark API error:', postmarkError);
        
        // Enhanced error logging
        if (postmarkError.code) {
          console.error(`Postmark error code: ${postmarkError.code}`);
        }
        
        if (postmarkError.message) {
          console.error(`Postmark error message: ${postmarkError.message}`);
        }
        
        // Check for common Postmark errors
        if (postmarkError.code === 422) {
          console.error('Invalid sender email. Make sure EMAIL_FROM is set to a valid email and domain is verified in Postmark.');
        } else if (postmarkError.code === 401) {
          console.error('Authentication error. Make sure POSTMARK_API_KEY is correct.');
        } else if (postmarkError.code === 429) {
          console.error('Rate limit exceeded. Too many requests to Postmark API.');
        }
        
        // Also log the email that we tried to send for debugging
        console.log('Failed email details:', {
          to: emailData.to,
          subject: emailData.subject
        });
        throw postmarkError; // Re-throw to be caught by outer try-catch
      }
    } else {
      // Fallback to console logging in development or if no API key is provided
      console.log('\n\n====== EMAIL DELIVERY SIMULATION ======');
      console.log(`To: ${emailData.to}`);
      console.log(`Subject: ${emailData.subject}`);
      console.log(`Text content: ${emailData.text.substring(0, 100)}...`);
      
      // Extract the reset URL from the email content to make it easy to test
      const resetUrlMatch = emailData.html.match(/href="([^"]+)"/);
      if (resetUrlMatch && resetUrlMatch[1]) {
        console.log('\n✅ PASSWORD RESET LINK: ' + resetUrlMatch[1]);
      }
      
      console.log('====== END EMAIL CONTENT ======\n\n');
      console.log('⚠️ To send real emails, set POSTMARK_API_KEY environment variable');
      return true;
    }
  } catch (error) {
    console.error('Email sending failed:', error);
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