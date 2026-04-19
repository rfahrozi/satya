/**
 * Catatan: File ini adalah DEAD CODE dari desain awal.
 *
 * Mock untuk MinIO dan emailWorker kini dikelola sebagai Jest Manual Mocks
 * yang lebih idiomatic dan merupakan single source of truth:
 *
 *   src/config/__mocks__/minio.js      → mock untuk MinIO
 *   src/__mocks__/emailWorker.js       → mock untuk emailWorker
 *
 * Cara penggunaan di setiap file test (tanpa factory function inline):
 *   jest.mock('../../src/config/minio');
 *   jest.mock('../../src/emailWorker');
 *
 * Jest akan otomatis menggunakan file __mocks__ yang sesuai.
 */