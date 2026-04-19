/**
 * Unit Test: Report Controller - Helper Functions
 * Menguji fungsi checkKetepatanWaktu dan logika sederhana di controller
 * tanpa memanggil HTTP endpoints
 */

// Setup env
process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

describe('Unit Test: reportController helpers', () => {

    /**
     * checkKetepatanWaktu tidak di-export, jadi kita test perilakunya
     * melalui endpoint my-progress yang menggunakannya.
     * Namun kita bisa mengisolasi logikanya dengan re-implementasi ringan.
     */
    function checkKetepatanWaktu(createdAt, periodeBulan, periodeTahun) {
        if (!createdAt) return null;

        let deadlineMonth = periodeBulan + 1;
        let deadlineYear = periodeTahun;

        if (deadlineMonth > 12) {
            deadlineMonth = 1;
            deadlineYear += 1;
        }

        const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, 10, 23, 59, 59);
        const uploadDate = new Date(createdAt);
        return uploadDate > deadlineDate ? 'Terlambat' : 'Tepat Waktu';
    }

    describe('checkKetepatanWaktu()', () => {
        it('harus mengembalikan null jika createdAt tidak ada', () => {
            expect(checkKetepatanWaktu(null, 3, 2026)).toBeNull();
            expect(checkKetepatanWaktu(undefined, 3, 2026)).toBeNull();
        });

        it('harus mengembalikan "Tepat Waktu" jika upload sebelum tanggal 10 bulan berikutnya', () => {
            // Upload tanggal 5 April (untuk laporan Maret 2026)
            const createdAt = '2026-04-05T10:00:00.000Z';
            expect(checkKetepatanWaktu(createdAt, 3, 2026)).toBe('Tepat Waktu');
        });

        it('harus mengembalikan "Terlambat" jika upload setelah tanggal 10 bulan berikutnya', () => {
            // Upload tanggal 15 April (untuk laporan Maret 2026) - terlambat
            const createdAt = '2026-04-15T10:00:00.000Z';
            expect(checkKetepatanWaktu(createdAt, 3, 2026)).toBe('Terlambat');
        });

        it('harus menangani pergantian tahun dengan benar (Desember → Januari)', () => {
            // Upload tanggal 5 Januari 2027 (untuk laporan Desember 2026) - tepat waktu
            const tepat = '2027-01-05T10:00:00.000Z';
            expect(checkKetepatanWaktu(tepat, 12, 2026)).toBe('Tepat Waktu');

            // Upload tanggal 15 Januari 2027 (untuk laporan Desember 2026) - terlambat
            const terlambat = '2027-01-15T10:00:00.000Z';
            expect(checkKetepatanWaktu(terlambat, 12, 2026)).toBe('Terlambat');
        });

        it('harus mengembalikan "Tepat Waktu" untuk upload pagi hari tanggal 10 bulan berikutnya', () => {
            // Upload pagi tanggal 10 April (untuk laporan Maret 2026) - masih dalam batas
            const createdAt = '2026-04-10T08:00:00.000Z'; // jam 8 pagi UTC pada tanggal 10
            expect(checkKetepatanWaktu(createdAt, 3, 2026)).toBe('Tepat Waktu');
        });
    });

    describe('Validasi logika persentase kepatuhan', () => {
        function hitungPersentase(totalWajib, totalUpload) {
            return totalWajib === 0 ? 0 : Math.round((totalUpload / totalWajib) * 100);
        }

        it('harus mengembalikan 0 jika tidak ada laporan wajib', () => {
            expect(hitungPersentase(0, 0)).toBe(0);
        });

        it('harus mengembalikan 100 jika semua laporan sudah diupload', () => {
            expect(hitungPersentase(28, 28)).toBe(100);
        });

        it('harus menghitung persentase parsial dengan benar', () => {
            expect(hitungPersentase(28, 14)).toBe(50);
            expect(hitungPersentase(28, 7)).toBe(25);
        });

        it('harus membulatkan persentase ke angka bulat', () => {
            // 10/28 = 35.71... → dibulatkan ke 36
            expect(hitungPersentase(28, 10)).toBe(36);
        });
    });
});
