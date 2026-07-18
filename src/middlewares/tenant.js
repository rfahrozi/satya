const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const redis = require('../config/redis');

const tenantContext = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Unauthorized: Token missing', 401));
    }
    const token = authHeader.split(' ')[1];

    try {
        // [SEC-L01] Verifikasi apakah token masuk dalam blacklist di Redis
        if (process.env.NODE_ENV !== 'test') {
            const isBlacklisted = await redis.get(`blacklist_${token}`);
            if (isBlacklisted) {
                return next(new AppError('Token telah di-revoked (Sesi berakhir). Silakan login kembali.', 401));
            }
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.tenant = { userId: decoded.id, role: decoded.role, satkerId: decoded.satkerId };

        // Simpan raw token agar dapat diakses untuk revocation endpoint
        req.tenant.rawToken = token;
        req.tenant.exp = decoded.exp; // Waktu kedaluwarsa

        next();
    } catch (err) {
        next(new AppError('Invalid Token', 401));
    }
};

module.exports = tenantContext;