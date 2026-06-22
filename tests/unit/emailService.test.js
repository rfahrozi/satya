const nodemailer = require('nodemailer');

jest.mock('nodemailer');
jest.mock('axios');

describe('emailService', () => {
    let mockSendMail;
    let emailService;
    let originalEnv;

    beforeEach(() => {
        mockSendMail = jest.fn().mockResolvedValue({ messageId: '1234' });
        nodemailer.createTransport.mockReturnValue({
            sendMail: mockSendMail,
            verify: jest.fn().mockResolvedValue(true)
        });
        jest.clearAllMocks();
        
        originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        jest.isolateModules(() => {
            emailService = require('../../src/services/emailService');
        });
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('sendRevisionEmail()', () => {
        it('should send revision email immediately via nodemailer', async () => {
            const data = { nama_laporan: 'Test', catatan_admin: 'Fix it' };
            const result = await emailService.sendRevisionEmail('test@test.com', data);
            
            expect(result.messageId).toBe('1234');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@test.com',
                subject: '[SATYA] Revisi Laporan: Test',
                html: expect.stringContaining('Fix it')
            }));
        });
    });

    describe('sendReminderEmail()', () => {
        it('should send reminder email', async () => {
            const data = { nama_satker: 'PN Test', deadline_text: '10 Mei 2026' };
            const result = await emailService.sendReminderEmail('test@test.com', data);
            
            expect(result.messageId).toBe('1234');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@test.com',
                subject: '[SATYA] PENGINGAT: Batas Waktu Pelaporan 10 Mei 2026',
                html: expect.stringContaining('PN Test')
            }));
        });
    });

    describe('sendPasswordResetEmail()', () => {
        it('should send password reset email', async () => {
            const data = { username: 'testuser', token: 'mock-token' };
            const result = await emailService.sendPasswordResetEmail('test@test.com', data);
            
            expect(result.messageId).toBe('1234');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@test.com',
                subject: '[SATYA] Permintaan Reset Password',
                html: expect.stringContaining('mock-token')
            }));
        });
    });
});
