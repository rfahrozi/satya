/**
 * Jest Manual Mock: src/emailWorker.js
 *
 * File ini digunakan secara otomatis oleh Jest ketika test memanggil:
 *   jest.mock('../../src/emailWorker')
 * tanpa perlu mendefinisikan factory function inline.
 *
 * Single source of truth untuk semua integration test.
 */
module.exports = {
    emailQueue: { add: jest.fn().mockResolvedValue({ id: '1' }) },
    emailWorker: { on: jest.fn() }
};
