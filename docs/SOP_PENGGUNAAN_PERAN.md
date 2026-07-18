# PANDUAN PENGGUNAAN & SOP PERAN (SATYA v2.1.0)
## Sistem Monitoring & Evaluasi Terpadu | Pengadilan Tinggi Kepulauan Riau

Dokumen ini berisi Standard Operating Procedure (SOP) untuk masing-masing peran dalam sistem SATYA setelah implementasi fitur Monitoring Internal PT (AMPUH, PMPZI, AKIP).

---

## 1. KETUA / WAKIL KETUA / HAKIM TINGGI PT (PIMPINAN)
**Peran:** Pimpinan Tertinggi & Eksekutif Pengawas

### Hak Akses:
- Dashboard Agregat PN→PT
- Dashboard Eksekutif Internal PT
- Risk Heatmap, Risk Trends, Risk Acceptance Register
- Management Review

### SOP Penggunaan:
1. **Pemantauan Kinerja Internal (Bulanan):**
   - Buka menu **Dashboard Eksekutif**.
   - Pantau *Compliance Rate Global* (Target: ≥80%).
   - Cek tabel **Progress Per Unit** untuk melihat Kabag/Koordinator mana yang memiliki item *Overdue*.
   - Evaluasi **Item Kritis (Overdue)** di panel kanan bawah.
2. **Pengawasan Risiko (Kuartalan):**
   - Buka menu **Risk Heatmap**.
   - Fokus pada risiko yang berada di area **Kritis (Merah)**.
   - Buka **Risk Acceptance Register** untuk menyetujui atau mencabut toleransi risiko.
3. **Management Review (Tahunan/Semester):**
   - Buka menu **Management Review**.
   - Finalisasi (*Finalize*) paket review yang telah disiapkan oleh Admin PT.

---

## 2. PEJABAT ESELON III (PANITERA, SEKRETARIS, KABAG)
**Peran:** Manajer Menengah (Approver) & Penanggung Jawab Bagian

### Hak Akses:
- Portal Checklist
- Antrian Review (Awaiting Approval)
- Follow-up Queue

### SOP Penggunaan:
1. **Pemantauan Bawahan (Mingguan):**
   - Buka **Portal Checklist**.
   - Pastikan Koordinator/Sub-bagian di bawah Anda telah mengunggah evidence (bukti dukung) untuk semua target 295 checklist wajib.
   - Penuhi juga target dokumen yang menjadi tanggung jawab Anda sendiri (sebagai Koordinator Proses).
2. **Approval Target (Berkelanjutan):**
   - Saat target berstatus `Menunggu Approval` (AWAITING_APPROVAL), buka detail target.
   - Periksa kelengkapan dokumen yang diunggah Koordinator.
   - Klik **Approve** jika sudah sesuai, atau kembalikan jika ada yang kurang.
3. **Manajemen Tindak Lanjut:**
   - Pantau menu **Follow-up Aktif**.
   - Pastikan tindak lanjut yang menjadi tanggung jawab bagian Anda dikerjakan sebelum jatuh tempo.

---

## 3. KOORDINATOR PROSES (PANMUD, KASUBBAG, PANITERA PENGGANTI)
**Peran:** PIC Pelaksana Lapangan (Uploader)

### Hak Akses:
- Portal Checklist
- Daftar Target Saya (My Targets)

### SOP Penggunaan:
1. **Pemenuhan Dokumen (Harian/Mingguan):**
   - Buka menu **Portal Checklist**.
   - Perhatikan item yang memiliki indikator `⚠ Jatuh tempo ... hari lagi`.
   - Expand item checklist (klik panah bawah ▼).
   - Unggah dokumen (PDF/Excel) pada slot requirement yang bertanda bintang (*).
   - Setelah semua wajib terisi, klik **Submit Target**.
2. **Perbaikan Revisi:**
   - Jika menerima notifikasi Revisi, buka target yang berstatus merah `REVISION_REQUIRED`.
   - Baca catatan Verifikator, unggah dokumen pengganti (versi baru), lalu Submit kembali.

---

## 4. VERIFIKATOR INTERNAL PT
**Peran:** Quality Control & Auditor

### Hak Akses:
- Antrian Review (Awaiting Verification)
- Repeat Finding Queue
- Portal Checklist (Akses Read/Verify)

### SOP Penggunaan:
1. **Verifikasi Bukti (Harian):**
   - Buka menu **Antrian Review**.
   - Buka setiap target berstatus `AWAITING_VERIFICATION`.
   - Unduh dan periksa bukti dukung.
   - Jika sesuai standar AMPUH/PMPZI/AKIP: Klik **Verifikasi**.
   - Jika tidak sesuai: Klik **Minta Revisi** dan wajib isi catatan kekurangan.
2. **Penciptaan Follow-up:**
   - Jika dokumen valid tetapi ada saran perbaikan minor, buat catatan di panel **Follow-ups** dan tugaskan ke Koordinator terkait.
3. **Deteksi Temuan Berulang (Bulanan):**
   - Buka menu **Repeat Finding Queue**.
   - Klik **Deteksi Ulang**. Konfirmasi jika ada pola pelanggaran yang sama berulang kali.

---

## 5. ADMIN PT (Superuser)
**Peran:** Pengelola Sistem & Data Master

### Hak Akses:
- Seluruh fitur di atas (Dashboard Operational, Retensi/Audit)
- Master Data (Unit, Paket, Checklist - 295 items)
- User Management
- Buka/Tutup Periode

### SOP Penggunaan:
1. **Inisiasi Siklus (Awal Bulan/Tahun):**
   - Buka menu **Master Data** -> **Periode**.
   - Buat periode baru dan set status menjadi `ACTIVE`.
   - Klik **Generate Targets** agar sistem mendistribusikan ke-295 *Master Checklist* secara otomatis sesuai pemetaan jabatan definitif.
2. **Persiapan Management Review:**
   - Buka menu **Management Review** -> Klik **+ Review Baru**.
   - Klik **Build Pack** agar sistem mengompilasi semua temuan dan risiko otomatis.
3. **Bantuan Teknis & Keamanan (New):**
   - Jika pengguna melaporkan kelambatan akses unggah, hal itu wajar jika kuota **Rate Limit** mereka habis (batasnya 15 berkas per menit, dan login 10 percobaan per 15 menit). Anjurkan mereka menunggu sesaat.
   - Peringatkan pengguna untuk tidak mengunggah file melebihi 10MB karena akan terblokir oleh batasan Server (Storage). File otomatis di-stream dan diverifikasi ekstensi aslinya.
   - Bantu *reset password* melalui halaman User Management jika pengguna lupa kata sandi.
