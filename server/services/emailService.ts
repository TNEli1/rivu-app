import * as dotenv from 'dotenv';
import * as postmark from 'postmark';
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
      console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set, using default: support@tryrivu.com'}`);
      
      try {
        // Create Postmark client
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
      } catch (error) {
        // Cast error to a standard Error type with optional Postmark properties
        const postmarkError = error as any;
        console.error('Postmark API error:', postmarkError);
        
        // Log error details if they exist
        if (postmarkError.code) {
          console.error(`Postmark error code: ${postmarkError.code}`);
        }
        
        if (postmarkError.message) {
          console.error(`Postmark error message: ${postmarkError.message}`);
        }
        
        // Check for common Postmark errors and provide specific guidance
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
  const subject = 'Reset Your Rivu Password';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2F80ED;">Reset Your Rivu Password</h2>
      <p>Hi ${email.split('@')[0]},</p>
      <p>We received a request to reset your Rivu password.</p>
      <p>Click the button below to choose a new one:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2F80ED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset My Password</a>
      </div>
      <p>If you didn't make this request, you can ignore this email.</p>
      <p>Questions? Contact us anytime at support@tryrivu.com.</p>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="font-size: 12px; color: #666;">The Rivu Team</p>
      <p style="font-size: 12px; color: #666;">Small moves. Big change.</p>
    </div>
  `;
  
  const textContent = `
    Reset Your Rivu Password
    
    Hi ${email.split('@')[0]},
    
    We received a request to reset your Rivu password.
    Click the link below to choose a new one:
    
    ${resetUrl}
    
    If you didn't make this request, you can ignore this email.
    
    Questions? Contact us anytime at support@tryrivu.com.
    
    —
    The Rivu Team
    Small moves. Big change.
  `;
  
  return await sendEmail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  });
}