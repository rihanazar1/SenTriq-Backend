const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if we're in development and don't have real email credentials
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasRealCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (isDevelopment && !hasRealCredentials) {
    // Use Ethereal Email for development testing
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  // For production or when real credentials are provided
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send verification code email
const sendVerificationCode = async (email, code, name) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasRealCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  // In development without real credentials, just log the code
  if (isDevelopment && !hasRealCredentials) {
    console.log('='.repeat(50));
    console.log('📧 DEVELOPMENT MODE - EMAIL NOT SENT');
    console.log('='.repeat(50));
    console.log(`To: ${email}`);
    console.log(`Name: ${name || 'User'}`);
    console.log(`Verification Code: ${code}`);
    console.log('='.repeat(50));

    return {
      success: true,
      messageId: 'dev-mode-' + Date.now(),
      isDevelopmentMode: true
    };
  }

  // Try to send actual email
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SenTriq <noreply@sentriq.com>',
      to: email,
      subject: 'Password Reset Verification Code - SenTriq',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a191f; color: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #A3E635; margin: 0;">SenTriq</h1>
            <p style="color: #666; margin: 5px 0;">Data Privacy & Security Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, rgba(163, 230, 53, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%); padding: 30px; border-radius: 10px; border: 1px solid rgba(163, 230, 53, 0.3);">
            <h2 style="color: #A3E635; margin-top: 0;">Password Reset Request</h2>
            
            <p style="color: #e5e7eb; line-height: 1.6;">
              Hello ${name || 'User'},
            </p>
            
            <p style="color: #e5e7eb; line-height: 1.6;">
              We received a request to reset your password. Use the verification code below to proceed with resetting your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1f2937; padding: 20px; border-radius: 8px; border: 2px solid #A3E635;">
                <span style="font-size: 32px; font-weight: bold; color: #A3E635; letter-spacing: 5px;">${code}</span>
              </div>
            </div>
            
            <p style="color: #e5e7eb; line-height: 1.6;">
              This code will expire in <strong style="color: #A3E635;">10 minutes</strong> for security reasons.
            </p>
            
            <p style="color: #e5e7eb; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated message from SenTriq. Please do not reply to this email.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">
              © 2024 SenTriq. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Email configuration:', {
      user: process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM
    });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationCode
};