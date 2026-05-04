import nodemailer from 'nodemailer';

// 1. Transporter setup (Aap Gmail use kar sakte hain)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Aapka Gmail address
        pass: process.env.EMAIL_PASS  // Aapka App Password (not your regular password)
    }
});

// 2. Verification Email bhejne ka function
export const sendVerificationEmail = async (userEmail, userName, otp) => {
    try {
        const mailOptions = {
            from: `"AURA Support" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your AURA Account',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Welcome to AURA, ${userName}!</h2>
                    <p>Thank you for signing up. Please use the following One-Time Password (OTP) to verify your email address:</p>
                    <div style="background: #f4f7fb; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px; font-size: 0.9rem; color: #64748b;">This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #94a3b8;">Developed by Aditya Prakash</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error("Email Error:", error);
        return { success: false, error: error.message };
    }
};

// 3. Simple OTP Generator
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};