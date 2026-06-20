/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Email Service
 * Mengelola koneksi ke SMTP dan template pengiriman email
 */
const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Buat transporter hanya di environment non-test.
 * Di mode test, nodemailer tidak perlu terhubung ke server SMTP eksternal.
 */
const transporter = process.env.NODE_ENV !== 'test'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
    })
    : null;

/**
 * Helper untuk mengirim email.
 * Jika terdapat BREVO_API_KEY di .env, sistem akan otomatis menggunakan Brevo API (via HTTP).
 * Jika tidak ada, sistem akan fallback ke SMTP klasik menggunakan Nodemailer.
 */
async function sendEmailCore(mailOptions) {
    if (process.env.NODE_ENV === 'test') return;

    if (process.env.BREVO_API_KEY) {
        const payload = {
            sender: {
                name: "SATYA PT KEPRI",
                email: process.env.SMTP_USER || "noreply@pt-kepri.go.id"
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            htmlContent: mailOptions.html
        };

        try {
            const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('⚠️ [Brevo API Error]', error.response?.data || error.message);
            throw new Error('Gagal mengirim email melalui Brevo API');
        }
    } else {
        if (!transporter) return;
        return transporter.sendMail(mailOptions);
    }
}

/**
 * Mengirim email notifikasi revisi dari Admin ke Satker
 */
async function sendRevisionEmail(to, data) {
    const { nama_laporan, catatan_admin } = data;
    const mailOptions = {
        from: `"SATYA PT KEPRI" <${process.env.SMTP_USER || 'noreply@pt-kepri.go.id'}>`,
        to: to,
        subject: `[SATYA] Revisi Laporan: ${nama_laporan}`,
        html: `
            <p>Yth. Bapak/Ibu Penanggung Jawab,</p>
            <p>Laporan Anda dengan judul <strong>"${nama_laporan}"</strong> memerlukan revisi.</p>
            <p>Catatan dari Admin:</p>
            <blockquote style="border-left: 4px solid #1d4ed8; padding-left: 1rem; margin-left: 0; color: #374151;">
                <em>${catatan_admin || '-'}</em>
            </blockquote>
            <p>Mohon untuk segera melakukan perbaikan dan mengunggah ulang dokumen pada aplikasi SATYA.</p>
            <p>Terima kasih.</p>
            <hr/>
            <small style="color: #9ca3af;">Email ini dikirim otomatis oleh Sistem SATYA - PT Kepulauan Riau</small>
        `,
    };
    return sendEmailCore(mailOptions);
}

/**
 * Mengirim email pengingat otomatis untuk satker yang belum lengkap laporannya
 */
async function sendReminderEmail(to, data) {
    const { nama_satker, deadline_text } = data;
    const mailOptions = {
        from: `"SATYA PT KEPRI" <${process.env.SMTP_USER || 'noreply@pt-kepri.go.id'}>`,
        to: to,
        subject: `[SATYA] PENGINGAT: Batas Waktu Pelaporan ${deadline_text}`,
        html: `
            <p>Yth. Penanggung Jawab Laporan <strong>${nama_satker}</strong>,</p>
            <p>Diinformasikan bahwa masih terdapat berkas laporan/monev periode berjalan yang sampai saat ini
            <strong>belum diunggah</strong> atau <strong>belum lengkap</strong> ke dalam sistem monitoring SATYA.</p>
            <p>Batas waktu penyampaian laporan adalah <strong>${deadline_text}</strong>.</p>
            <p>Mohon agar segera melakukan upload berkas dimaksud sesuai batas waktu yang telah ditentukan.
            Apabila berkas telah disiapkan, silakan segera diunggah melalui akun satker masing-masing.</p>
            <p>Demikian disampaikan, atas perhatian dan kerja samanya diucapkan terima kasih.</p>
            <hr/>
            <small style="color: #9ca3af;">Email ini dikirim otomatis oleh Sistem SATYA - PT Kepulauan Riau</small>
        `,
    };
    return sendEmailCore(mailOptions);
}

/**
 * Mengirim email link reset password untuk pengguna (Satker)
 */
async function sendPasswordResetEmail(to, data) {
    const { username, token } = data;
    // Konstruksi link. Jika menggunakan proxy Nginx, URL base bisa disesuaikan.
    const baseUrl = process.env.BASE_URL || 'https://devapps.pt-kepri.go.id/satya';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"SATYA PT KEPRI" <${process.env.SMTP_USER || 'noreply@pt-kepri.go.id'}>`,
        to: to,
        subject: `[SATYA] Permintaan Reset Password`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(to right, #6366f1, #a855f7); padding: 30px 20px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">SATYA PT Kepulauan Riau</h2>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 30px;">
                        <h3 style="margin-top: 0; font-size: 20px; color: #1e293b;">Permintaan Reset Password</h3>
                        
                        <p style="font-size: 15px; line-height: 1.6;">Yth. <strong>${username}</strong>,</p>
                        
                        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                            Anda menerima email ini karena Anda (atau orang lain) telah meminta untuk mereset password akun Anda di SATYA PT Kepulauan Riau.
                        </p>

                        <!-- Box -->
                        <div style="background-color: #f0fdf4; border: 1px solid #dcfce3; border-left: 5px solid #22c55e; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                            <h4 style="margin-top: 0; margin-bottom: 10px; color: #16a34a; font-size: 16px;">Link Reset Password</h4>
                            <p style="margin-top: 0; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                Silakan klik tombol berikut untuk melanjutkan proses reset password. Link ini hanya berlaku selama 1 jam.
                            </p>
                            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
                                Reset Password Sekarang
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan menempelkan URL berikut ke browser Anda:<br/>
                            <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 15px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            &copy; ${new Date().getFullYear()} Pengadilan Tinggi Kepulauan Riau. Email ini dihasilkan secara otomatis.
                        </p>
                    </div>
                </div>
            </div>
        `,
    };
    return sendEmailCore(mailOptions);
}

module.exports = { sendRevisionEmail, sendReminderEmail, sendPasswordResetEmail };