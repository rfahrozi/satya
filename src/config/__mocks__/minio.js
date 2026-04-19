/**
 * Jest Manual Mock: src/config/minio.js
 *
 * File ini digunakan secara otomatis oleh Jest ketika test memanggil:
 *   jest.mock('../../src/config/minio')
 * tanpa perlu mendefinisikan factory function inline.
 *
 * Single source of truth untuk semua integration test.
 */
module.exports = {
    BUCKET_NAME: 'test-bucket',
    initMinio: jest.fn().mockResolvedValue(true),
    minioClient: {
        putObject: jest.fn().mockResolvedValue('etag'),
        removeObject: jest.fn().mockResolvedValue(true),
        presignedGetObject: jest.fn().mockResolvedValue('http://mock.presigned.url/file.pdf')
    }
};
