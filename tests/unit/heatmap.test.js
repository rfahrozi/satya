/**
 * Unit Test: reportController - getDashboardHeatmap
 * Menguji handler heatmap beserta helper _resolveWarna & _hitungStatsGlobal
 * secara terisolasi dengan mocking reportRepo.getHeatmapKepatuhan.
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

jest.mock('../../src/config/minio');
jest.mock('../../src/emailWorker', () => ({
    emailQueue: { add: jest.fn() },
    emailWorker: { on: jest.fn() },
}));

const reportController = require('../../src/controllers/reportController');
const reportRepo = require('../../src/repositories/reportRepo');

jest.mock('../../src/repositories/reportRepo');
jest.mock('../../src/services/reportService');

// ─── Fixture helper ──────────────────────────────────────────────────────────

/**
 * Buat 12 baris heatmap untuk satu satker (simulasi output DB).
 */
function buatRowsSatker(satkerId, namaSatker, overrides = {}) {
    return Array.from({ length: 12 }, (_, i) => ({
        satker_id: satkerId,
        nama_satker: namaSatker,
        bulan: i + 1,
        total_wajib: 28,
        total_upload: overrides[i + 1]?.total_upload ?? 0,
        persen: overrides[i + 1]?.persen ?? 0,
        persen_tepat_waktu: overrides[i + 1]?.persen_tepat_waktu ?? null,
    }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Unit Test: reportController - getDashboardHeatmap', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            query: { tahun: '2026' },
            tenant: { userId: 1, role: 'ADMIN_PT', satkerId: null },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    // ── Happy Path ──

    test('mengembalikan struktur heatmap yang benar untuk dua satker', async () => {
        const rows = [
            ...buatRowsSatker(1, 'PN Batam', {
                1: { total_upload: 28, persen: 100, persen_tepat_waktu: 90 },
                2: { total_upload: 20, persen: 71,  persen_tepat_waktu: 80 },
                3: { total_upload: 14, persen: 50,  persen_tepat_waktu: 60 },
                4: { total_upload: 0,  persen: 0,   persen_tepat_waktu: null },
            }),
            ...buatRowsSatker(2, 'PN TPI', {
                1: { total_upload: 22, persen: 78, persen_tepat_waktu: 70 },
                2: { total_upload: 0,  persen: 0,  persen_tepat_waktu: null },
            }),
        ];
        reportRepo.getHeatmapKepatuhan.mockResolvedValue(rows);

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const resp = mockRes.json.mock.calls[0][0];

        expect(resp.success).toBe(true);
        expect(resp.tahun).toBe(2026);
        expect(resp.data).toHaveLength(2);

        // Cek sel 12 bulan
        expect(resp.data[0].sel).toHaveLength(12);
        expect(resp.data[0].nama_satker).toBe('PN Batam');

        // Cek field warna pada sel
        expect(resp.data[0].sel[0].warna).toBe('hijau');  // persen 100
        expect(resp.data[0].sel[1].warna).toBe('kuning'); // persen 71
        expect(resp.data[0].sel[2].warna).toBe('kuning'); // persen 50
        expect(resp.data[0].sel[3].warna).toBe('abu');    // persen 0

        // Cek stats global ada
        expect(resp.stats).toBeDefined();
        expect(resp.stats.persen_global).toBeGreaterThanOrEqual(0);
        expect(resp.stats.total_wajib).toBeGreaterThan(0);
    });

    test('menggunakan tahun sekarang jika query.tahun kosong', async () => {
        mockReq.query = {};
        reportRepo.getHeatmapKepatuhan.mockResolvedValue([]);

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        expect(reportRepo.getHeatmapKepatuhan).toHaveBeenCalledWith(
            new Date().getFullYear()
        );
    });

    test('mengembalikan data kosong jika tidak ada satker', async () => {
        reportRepo.getHeatmapKepatuhan.mockResolvedValue([]);

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        const resp = mockRes.json.mock.calls[0][0];
        expect(resp.data).toEqual([]);
        expect(resp.stats.persen_global).toBe(0);
        expect(resp.stats.satker_merah).toBe(0);
    });

    test('meneruskan error ke next jika repo gagal', async () => {
        reportRepo.getHeatmapKepatuhan.mockRejectedValue(new Error('DB down'));

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    // ── _resolveWarna (lewat field sel.warna) ──

    describe('logika warna sel', () => {
        async function getSelWarna(persen) {
            reportRepo.getHeatmapKepatuhan.mockResolvedValue([
                { satker_id: 1, nama_satker: 'Test', bulan: 1,
                  total_wajib: 28, total_upload: 5, persen, persen_tepat_waktu: null }
            ]);
            await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);
            return mockRes.json.mock.calls[0][0].data[0].sel[0].warna;
        }

        test('persen >= 80 → hijau', async () => {
            expect(await getSelWarna(80)).toBe('hijau');
            jest.clearAllMocks();
            expect(await getSelWarna(100)).toBe('hijau');
        });

        test('persen >= 50 dan < 80 → kuning', async () => {
            jest.clearAllMocks();
            expect(await getSelWarna(50)).toBe('kuning');
            jest.clearAllMocks();
            expect(await getSelWarna(79)).toBe('kuning');
        });

        test('persen > 0 dan < 50 → merah', async () => {
            jest.clearAllMocks();
            expect(await getSelWarna(1)).toBe('merah');
            jest.clearAllMocks();
            expect(await getSelWarna(49)).toBe('merah');
        });

        test('persen = 0 → abu', async () => {
            jest.clearAllMocks();
            expect(await getSelWarna(0)).toBe('abu');
        });

        test('persen null → abu', async () => {
            jest.clearAllMocks();
            expect(await getSelWarna(null)).toBe('abu');
        });
    });

    // ── rata_tahunan & warna_rata ──

    test('menghitung rata_tahunan dengan benar', async () => {
        // Semua 12 bulan persen = 80 → rata 80
        const rows = buatRowsSatker(1, 'PN Full', {});
        rows.forEach(r => { r.persen = 80; r.total_upload = 22; });

        reportRepo.getHeatmapKepatuhan.mockResolvedValue(rows);

        // Simulasi tahun lampau agar semua 12 bulan ikut dihitung
        mockReq.query = { tahun: '2025' };
        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        const satker = mockRes.json.mock.calls[0][0].data[0];
        expect(satker.rata_tahunan).toBe(80);
        expect(satker.warna_rata).toBe('hijau');
    });

    test('satker_merah dihitung dengan benar', async () => {
        const rows = [
            ...buatRowsSatker(1, 'PN A', {}),  // semua 0 → rata 0 → merah
            ...buatRowsSatker(2, 'PN B', {}),  // semua 0 → rata 0 → merah
        ];
        reportRepo.getHeatmapKepatuhan.mockResolvedValue(rows);
        mockReq.query = { tahun: '2025' };

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        expect(mockRes.json.mock.calls[0][0].stats.satker_merah).toBe(2);
    });

    // ── persen_tepat_waktu ──

    test('meneruskan persen_tepat_waktu dari DB ke response', async () => {
        const rows = [
            { satker_id: 1, nama_satker: 'PN X', bulan: 5,
              total_wajib: 28, total_upload: 25, persen: 89, persen_tepat_waktu: 72 }
        ];
        reportRepo.getHeatmapKepatuhan.mockResolvedValue(rows);

        await reportController.getDashboardHeatmap(mockReq, mockRes, mockNext);

        const sel = mockRes.json.mock.calls[0][0].data[0].sel[0];
        expect(sel.persen_tepat_waktu).toBe(72);
    });
});
