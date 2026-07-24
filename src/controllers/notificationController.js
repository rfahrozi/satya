const knex = require('../config/knex');

async function getMyNotifications(req, res, next) {
    try {
        const satkerId = req.tenant.satkerId;
        if (!satkerId) {
            return res.status(200).json({ success: true, data: [] });
        }

        let query = knex('in_app_notifications');
        if (satkerId) {
            query = query.where(function() {
                this.where('satker_id', satkerId).orWhere('user_id', req.tenant.userId);
            });
        } else {
            query = query.where('user_id', req.tenant.userId);
        }

        const notifs = await query.orderBy('created_at', 'desc').limit(20);

        res.status(200).json({
            success: true,
            data: notifs
        });
    } catch (error) {
        next(error);
    }
}

async function markAsRead(req, res, next) {
    try {
        const satkerId = req.tenant.satkerId;
        const { id } = req.params;

        await knex('in_app_notifications')
            .where(function() {
                this.where('satker_id', satkerId).orWhere('user_id', req.tenant.userId);
            })
            .where('id', id)
            .update({ is_read: true, updated_at: knex.fn.now() });

        res.status(200).json({
            success: true,
            message: 'Notifikasi ditandai dibaca'
        });
    } catch (error) {
        next(error);
    }
}

async function markAllAsRead(req, res, next) {
    try {
        const satkerId = req.tenant.satkerId;

        await knex('in_app_notifications')
            .where(function() {
                this.where('satker_id', satkerId).orWhere('user_id', req.tenant.userId);
            })
            .where('is_read', false)
            .update({ is_read: true, updated_at: knex.fn.now() });

        res.status(200).json({
            success: true,
            message: 'Semua notifikasi ditandai dibaca'
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead
};
