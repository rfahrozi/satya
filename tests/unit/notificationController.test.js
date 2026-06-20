const { getMyNotifications, markAsRead, markAllAsRead } = require('../../src/controllers/notificationController');
const knex = require('../../src/config/knex');

jest.mock('../../src/config/knex', () => {
    const mKnex = jest.fn();
    mKnex.fn = { now: jest.fn() };
    return mKnex;
});

describe('notificationController Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            tenant: { satkerId: 1 },
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    const mockKnexChain = (methods = {}) => {
        const chain = {};
        ['where', 'orderBy', 'limit', 'update'].forEach(method => {
            chain[method] = jest.fn().mockReturnValue(chain);
        });
        Object.assign(chain, methods);
        if (!chain.then) chain.then = jest.fn((cb) => cb([]));
        return chain;
    };

    it('getMyNotifications - should return empty array if no satkerId', async () => {
        req.tenant.satkerId = null;
        await getMyNotifications(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('getMyNotifications - should return notifications', async () => {
        const mKnex = mockKnexChain({ then: jest.fn((cb) => cb([{ id: 1 }])) });
        knex.mockReturnValue(mKnex);

        await getMyNotifications(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
    });

    it('markAsRead - should mark notification as read', async () => {
        req.params.id = 1;
        const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
        knex.mockReturnValue(mKnex);

        await markAsRead(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Notifikasi ditandai dibaca' });
    });

    it('markAllAsRead - should mark all as read', async () => {
        const mKnex = mockKnexChain({ then: jest.fn((cb) => cb(1)) });
        knex.mockReturnValue(mKnex);

        await markAllAsRead(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Semua notifikasi ditandai dibaca' });
    });
});
