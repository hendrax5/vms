import nodemailer from 'nodemailer';

interface SendMailOptions {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    to,
    subject,
    html
}: SendMailOptions) {
    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        const info = await transporter.sendMail({
            from: `"VMS Datacenter" <${smtpUser}>`,
            to,
            subject,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
