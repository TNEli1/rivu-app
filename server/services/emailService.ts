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
    // CRITICAL FIX: In development, skip Postmark for test emails and simulate success
    if (process.env.NODE_ENV === 'development' && emailData.to.includes('example.com')) {
      console.log('\n\n====== EMAIL VERIFICATION SIMULATION (DEV MODE) ======');
      console.log(`To: ${emailData.to}`);
      console.log(`Subject: ${emailData.subject}`);
      console.log(`Text content: ${emailData.text.substring(0, 200)}...`);
      
      // Extract verification URL for easy testing
      const verificationUrlMatch = emailData.html.match(/href="([^"]+verify-email[^"]*)/);
      if (verificationUrlMatch && verificationUrlMatch[1]) {
        console.log('\n✅ VERIFICATION LINK: ' + verificationUrlMatch[1]);
      }
      
      console.log('====== EMAIL SIMULATED SUCCESSFULLY ======\n\n');
      return true;
    }
    
    // Use Postmark for production and real emails
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; color: #333;">
      <!-- Rivu Logo Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00C2A8; margin: 0; font-size: 32px; letter-spacing: 1px;">RIVU</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 15px;">Your AI Finance Partner</p>
      </div>
      
      <h2 style="color: #00C2A8; margin-top: 0; margin-bottom: 20px; font-size: 22px;">Reset Your Rivu Password</h2>
      
      <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">Hi,</p>
      
      <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">We received a request to reset your Rivu password.</p>
      
      <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">Click the button below to choose a new one:</p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" style="background-color: #00C2A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; letter-spacing: 0.5px;">Reset My Password</a>
      </div>
      
      <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">If you didn't make this request, you can safely ignore this email.</p>
      
      <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">For security reasons, this link will expire in 24 hours.</p>
      
      <p style="margin-bottom: 30px; line-height: 1.5; font-size: 16px;">Questions? Contact us anytime at <a href="mailto:support@tryrivu.com" style="color: #00C2A8; text-decoration: none; font-weight: bold;">support@tryrivu.com</a>.</p>
      
      <hr style="border: 1px solid #eee; margin: 30px 0;">
      
      <div style="text-align: center;">
        <p style="font-size: 15px; color: #333; margin-bottom: 6px; font-weight: 500;">The Rivu Team</p>
        <p style="font-size: 15px; color: #00C2A8; font-style: italic; margin-top: 0;">Small moves. Big change.</p>
      </div>
    </div>
  `;
  
  const textContent = `
    RIVU
    Your AI Finance Partner
    
    RESET YOUR RIVU PASSWORD
    
    Hi,
    
    We received a request to reset your Rivu password.
    Click the link below to choose a new one:
    
    ${resetUrl}
    
    If you didn't make this request, you can safely ignore this email.
    
    For security reasons, this link will expire in 24 hours.
    
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