/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Email Service
 * Mengelola koneksi ke SMTP dan template pengiriman email
 */
const nodemailer = require('nodemailer');

/**
 * Buat transporter hanya di environment non-test.
 * Di mode test, nodemailer tidak perlu terhubung ke server SMTP eksternal,
 * sehingga test tidak bergantung pada koneksi internet atau kredensial SMTP.
 */
const transporter = process.env.NODE_ENV !== 'test'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465, // True untuk port 465 (SSL), false untuk 587 (STARTTLS)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        // Timeout agar tidak hang jika server SMTP lambat atau tidak respond
        connectionTimeout: 10000, // 10 detik
        greetingTimeout: 5000,    // 5 detik
        socketTimeout: 15000,     // 15 detik per operasi
        tls: { rejectUnauthorized: false }
    })
    : null; // Null di mode test — emailWorker di-mock sehingga sendMail tidak pernah dipanggil

/**
 * Mengirim email notifikasi revisi dari Admin ke Satker
 */
async function sendRevisionEmail(to, data) {
    const { nama_laporan, catatan_admin } = data;
    const mailOptions = {
        from: `"SATYA PT KEPRI" <${process.env.SMTP_USER}>`,
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
    return transporter.sendMail(mailOptions);
}

/**
 * Mengirim email pengingat otomatis untuk satker yang belum lengkap laporannya
 */
async function sendReminderEmail(to, data) {
    const { nama_satker, deadline_text } = data;
    const mailOptions = {
        from: `"SATYA PT KEPRI" <${process.env.SMTP_USER}>`,
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
    return transporter.sendMail(mailOptions);
}

module.exports = { sendRevisionEmail, sendReminderEmail };