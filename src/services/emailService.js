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

module.exports = { sendRevisionEmail, sendReminderEmail };