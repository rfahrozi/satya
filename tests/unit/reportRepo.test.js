/**
 * Unit Test: Report Repository Helper
 * Menguji fungsi getBaseDeadlineMonthYear secara terisolasi
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

const reportRepo = require('../../src/repositories/reportRepo');
const knex = require('../../src/config/knex');

jest.mock('../../src/config/knex');

describe('reportRepo Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockKnexChain = (methods = {}) => {
        const chain = {};
        ['select', 'leftJoin', 'join', 'where', 'andOn', 'on', 'orderBy', 'count', 'first', 'limit'].forEach(method => {
            chain[method] = jest.fn().mockReturnValue(chain);
        });
        Object.assign(chain, methods);
        if (!chain.then) chain.then = jest.fn((cb) => cb([]));
        return chain;
    };

    it('getSatkerProgress - should return progress', async () => {
        const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ id: 1 }])) });
        knex.mockReturnValue(mKnex);
        knex.raw = jest.fn().mockReturnValue('raw_sql');

        const result = await reportRepo.getSatkerProgress(1, 'monthly', 1, 2026);
        expect(result).toEqual([{ id: 1 }]);
    });

    it('getRekapitulasiPimpinan - should return rekapitulasi', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ total_wajib: 1 }] });
        const result = await reportRepo.getRekapitulasiPimpinan('monthly', 1, 2026);
        expect(result).toEqual([{ total_wajib: 1 }]);
    });

    it('getTotalReportTypes - should return count', async () => {
        const mKnex = mockKnexChain({ first: jest.fn().mockResolvedValue({ total: '10' }) });
        knex.mockReturnValue(mKnex);
        
        const result = await reportRepo.getTotalReportTypes();
        expect(result).toBe(10);
    });

    it('findSatkersForReminder - should return satkers', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ id: 1, email: 'test@test.com' }] });
        const result = await reportRepo.findSatkersForReminder('monthly', 1, 2026);
        expect(result).toEqual([{ id: 1, email: 'test@test.com' }]);
    });

    it('getAntrianVerifikasi - should return antrian', async () => {
        const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ submission_id: 1 }])) });
        knex.mockReturnValue(mKnex);
        
        const result = await reportRepo.getAntrianVerifikasi('monthly', 1, 2026);
        expect(result).toEqual([{ submission_id: 1 }]);
    });

    it('getLoopRevisi - should return loop revisi', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ submission_id: 1 }] });
        const result = await reportRepo.getLoopRevisi();
        expect(result).toEqual([{ submission_id: 1 }]);
    });

    it('getKetepatanWaktu - should return ketepatan waktu', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ tepat_waktu: 5 }] });
        const result = await reportRepo.getKetepatanWaktu('monthly', 1, 2026);
        expect(result).toEqual({ tepat_waktu: 5 });
    });

    it('getRecentActivity - should return recent activity', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        const result = await reportRepo.getRecentActivity();
        expect(result).toEqual([{ id: 1 }]);
    });

    it('getHeatmapKepatuhan - should return heatmap', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ persen: 100 }] });
        const result = await reportRepo.getHeatmapKepatuhan(2026);
        expect(result).toEqual([{ persen: 100 }]);
    });

    it('getSubmissionHistory - should return history', async () => {
        knex.raw = jest.fn().mockResolvedValue({ rows: [{ actor_name: 'admin' }] });
        const result = await reportRepo.getSubmissionHistory(1);
        expect(result).toEqual([{ actor_name: 'admin' }]);
    });
});
