require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');

async function runTest() {
    try {
        console.log();
        console.log("-----------------------------------------");
        
        if (process.env.BREVO_API_KEY) {
            console.log(`📡 Menggunakan Brevo API untuk pengiriman email...`);
            console.log("-----------------------------------------");
            console.log("⏳ Mengirim test email via Brevo API...");
            
            const targetEmail = process.argv[2] || process.env.SMTP_USER || "test@example.com";
            const payload = {
                sender: {
                    name: "SATYA PT KEPRI",
                    email: process.env.SMTP_USER || "noreply@pt-kepri.go.id"
                },
                to: [{ email: targetEmail }],
                subject: "[TESTING] Cek Koneksi Brevo API Aplikasi SATYA",
                htmlContent: `
                    <h3>Test Koneksi Brevo API Berhasil!</h3>
                    <p>Ini adalah email uji coba (dummy) yang diminta dari terminal aplikasi SATYA.</p>
                    <p>Jika Anda menerima email ini, berarti aplikasi SATYA sudah bisa berkomunikasi via API Brevo tanpa terhalang blokir port SMTP.</p>
                    <br />
                    <small>Waktu pengetesan: ${new Date().toLocaleString('id-ID')}</small>
                `
            };

            const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`✅ EMAIL TERKIRIM: Berhasil terkirim ke ${targetEmail}`);
            console.log(`📃 Message-ID: ${response.data.messageId}`);
            process.exit(0);

        } else {
            console.log(`📡 Mencoba koneksi ke SMTP Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
            console.log(`👤 Menggunakan Akun/User: ${process.env.SMTP_USER}`);
            console.log("-----------------------------------------");
            
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: parseInt(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                connectionTimeout: 10000,
                tls: { rejectUnauthorized: false }
            });

            // 1. Verifikasi Koneksi ke SMTP Server
            console.log("⏳ Memverifikasi koneksi port & handshake SSL/TLS...");
            await transporter.verify();
            console.log("✅ KONEKSI SUKSES: Server terbuka dan kredensial diterima.");

            // 2. Simulasi Pengiriman Email
            console.log("⏳ Mencoba mengirimkan email test...");
            const targetEmail = process.argv[2] || process.env.SMTP_USER; 
            
            const info = await transporter.sendMail({
                from: `"System SATYA Testing" <${process.env.SMTP_USER}>`,
                to: targetEmail, 
                subject: "[TESTING] Cek Koneksi SMTP Aplikasi SATYA",
                html: `
                    <h3>Test Koneksi Berhasil!</h3>
                    <p>Ini adalah email uji coba (dummy) yang diminta dari terminal aplikasi SATYA.</p>
                    <p>Jika Anda menerima email ini, berarti aplikasi SATYA sudah bisa berkomunikasi tanpa diblokir oleh firewall server PT Kepri.</p>
                    <br />
                    <small>Waktu pengetesan: ${new Date().toLocaleString('id-ID')}</small>
                `,
            });
            
            console.log(`✅ EMAIL TERKIRIM: Berhasil terkirim ke ${targetEmail}`);
            console.log(`📃 Message-ID: ${info.messageId}`);
            process.exit(0);
        }

    } catch (error) {
        console.log("❌ KONEKSI ATAU PENGIRIMAN GAGAL!");
        if (error.response) {
            console.error("Detail Error (API):", error.response.data);
        } else {
            console.error("Detail Error:", error.message);
        }
        
        // Memberikan hint error
        if (error.code === 'ETIMEDOUT') {
            console.log("💡 HINT: Timeout. Port 465/587 kemungkinan diblokir oleh firewall router/Windows Anda atau Network PT.");
        } else if (error.code === 'EAUTH') {
            console.log("💡 HINT: Authentication gagal. Username / Password email di .env salah.");
        }
        process.exit(1);
    }
}

runTest();
