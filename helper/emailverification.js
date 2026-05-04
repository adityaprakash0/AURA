import nodemailer from 'nodemailer';

// Transporter setup with Port 587 (Better for Render stability)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Port 587 ke liye false hona chahiye
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Connection errors se bachne ke liye
    }
});

export const sendVerificationEmail = async (userEmail, userName, otp) => {
    try {
        const mailOptions = {
            from: `"AURA Support" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your AURA Account',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to AURA, ${userName}!</h2>
                    <p>Use the OTP below to verify your email:</p>
                    <div style="background: #f4f7fb; padding: 15px; font-size: 24px; font-weight: bold;">
                        ${otp}
                    </div>
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

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};