# Internal Monitoring: Operational Runbook

## 1. Membuka Periode (Opening a Period)
**Kapan dilakukan:** Pada awal siklus monitoring bulanan.
**Langkah:**
1. Login sebagai `ADMIN_PT`.
2. Buka menu **Master Data > Monitoring Periods**.
3. Klik **Create Period**. Masukkan Tahun, Bulan, Start Date, dan End Date.
4. Klik **Open Period**. 

## 2. Generate Target secara Aman
**Kapan dilakukan:** Setelah periode dibuka dan assignment diverifikasi.
**Langkah:**
1. Klik **Preview Generation** pada periode yang aktif.
2. Periksa kolom peringatan (Warning). Pastikan tidak ada assignment Collector yang kosong.
3. Klik **Generate**. Sistem bersifat *idempotent*; target yang sudah terbentuk tidak akan diduplikasi.

## 3. Menangani Assignment Warning
**Kapan dilakukan:** Saat preview generation mendeteksi PIC yang kosong.
**Langkah:**
1. Buka modul **Master Data > Unit / Assignment**.
2. Daftarkan User sebagai PIC utama (Primary) untuk unit tersebut.
3. Lakukan **Preview Generation** ulang.

## 4. Mengelola Overdue Target
**Kapan dilakukan:** Saat batas waktu (Due Date) terlewati, namun target belum `VERIFIED`.
**Langkah:**
1. Sistem otomatis menandai target menjadi `was_submitted_late = true` pada saat submit.
2. Sebagai Pimpinan/Admin, periksa halaman Dashboard **Executive** untuk memfilter unit dengan overdue tinggi.
3. Follow up dilakukan di luar sistem kecuali terdapat tiket manual.

## 5. Mengubah Deadline Override
**Kapan dilakukan:** Saat regulator (misal OJK/BI) memberikan kelonggaran spesifik untuk checklist tertentu.
**Langkah:**
1. Masuk ke **Master Data > Deadline Overrides**.
2. Tambahkan rule dengan mengikat pada `Item Code` atau `Event ID`.
3. Target yang belum tersubmit dan berada pada window override akan otomatis menyesuaikan tanggal jatuh temponya.

## 6. Mengganti Assignee karena Mutasi Pegawai
**Kapan dilakukan:** Saat pegawai PIC Unit pindah tugas.
**Langkah:**
1. Jangan menghapus user lama agar rekam jejak (audit trail) evidence sebelumnya tetap ada.
2. Set User lama menjadi `is_active = false`.
3. Buat User baru atau edit role User yang menggantikan dan assign ke Unit tersebut sebagai PIC.
4. Target periode berjalan yang masih *open* (NOT_STARTED/IN_PROGRESS) harus di-reassign secara manual lewat **Admin Override**.

## 7. Menangani Bukti/Evidence Gagal Upload
**Kapan dilakukan:** User melaporkan gagal upload dokumen.
**Langkah:**
1. Periksa ekstensi file yang dilarang (hanya PDF, DOC, XLS, JPG/PNG yang diizinkan).
2. Periksa limitasi besaran file (`MONITORING_UPLOAD_MAX_BYTES` di environment). Maksimum default 10MB.
3. Pastikan service MinIO/Object storage aktif via `GET /health`.

## 8. Menutup Periode
**Kapan dilakukan:** Pada akhir siklus evaluasi bulanan saat seluruh target terverifikasi atau di-cancel.
**Langkah:**
1. Buka menu **Monitoring Periods**.
2. Klik **Close Period**.
3. **Peringatan:** Setelah periode ditutup, tidak ada submission, approval, atau verifikasi baru yang diizinkan pada target di bulan tersebut.

## 9. Rollback Feature Flag (Disaster Recovery)
**Kapan dilakukan:** Jika terdapat critical bug (S1) pada Production.
**Langkah:**
1. Ubah `.env` parameter `PT_INTERNAL_MONITORING_ENABLED=false`.
2. Restart backend service.
3. Seluruh API `/internal-monitoring/*` akan merespons dengan HTTP 501. Data tidak akan hilang.
