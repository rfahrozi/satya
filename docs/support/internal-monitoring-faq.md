# Internal Monitoring: Support FAQ

## 1. Mengapa target checklist saya tidak muncul?
* Kemungkinan Periode belum dibuka atau target belum di-generate oleh Admin PT. 
* Pastikan Anda ditugaskan (assigned) pada Unit yang benar sebagai PIC Utama (Primary). Hubungi Admin PT untuk mengecek tabel Assignment.

## 2. Mengapa saya tidak dapat submit target?
Target hanya dapat disubmit apabila:
* Status masih `NOT_STARTED`, `IN_PROGRESS`, atau `REVISION_REQUIRED`.
* Semua *Evidence Requirement* yang diwajibkan telah terisi (baik file maupun data).
* Periode bulanan belum ditutup.

## 3. Apa arti status `REVISION_REQUIRED`?
Ini berarti Approver atau Verifier menemukan ketidaksesuaian pada dokumen/bukti yang Anda lampirkan, sehingga target dikembalikan ke Anda (Collector). 
Silakan baca kolom komentar penolakan, lalu unggah dokumen perbaikan, dan klik **Submit** ulang.

## 4. Mengapa batas waktu (Deadline) saya berubah?
Sistem kalender secara otomatis menghitung *working days*. Hari Sabtu, Minggu, serta Libur Nasional yang didaftarkan dalam sistem tidak dihitung sebagai hari efektif.
Selain itu, Admin/Regulator (OJK) mungkin menerbitkan *Deadline Override* yang secara otomatis menimpa jadwal default Anda.

## 5. Bagaimana cara mengganti Pejabat/Assignee?
Pihak Satker tidak dapat mengubah assignee secara sepihak jika Surat Keputusan (SK) belum diurus. Setelah SK mutasi diterbitkan, Admin PT akan mengubah profil User di menu **Master Data > Unit / Assignment**.
Target berjalan yang sudah telanjur masuk ke Pejabat lama harus dialihkan secara manual oleh Admin PT.

## 6. Saya salah unggah dokumen bukti, bagaimana cara menghapusnya?
Demi alasan Audit dan Keamanan, bukti (Evidence) **tidak pernah dihapus** (append-only). 
Jika salah, Anda cukup mengunggah ulang dokumen yang benar di persyaratan yang sama. Dokumen yang lama akan otomatis berubah status menjadi `SUPERSEDED` (kedaluwarsa), dan hanya dokumen dengan versi terbaru yang akan di-review.

## 7. Bagaimana cara menutup Follow-Up?
Penyelesaian temuan Follow-Up hanya dapat disetujui dan ditutup oleh Verifier (Admin PT). 
Anda (sebagai PIC) hanya dapat menekan tombol **Submit Resolution** beserta bukti perbaikannya. Setelah diverifikasi, Admin akan mengubah status menjadi `CLOSED`.
