const { AppError } = require('./errorHandler');

/**
 * Middleware authenticate
 * Karena tenantContext.js sudah memverifikasi token dan meng-assign req.tenant,
 * kita hanya memastikan pengguna sudah login (req.user atau req.tenant ada).
 */
const authenticate = (req, res, next) => {
    // Pada internalMonitoringRoutes.js req.user di-mapping dari req.tenant
    if (!req.user && !req.tenant) {
        return next(new AppError('Unauthorized: Harap login terlebih dahulu.', 401));
    }
    next();
};

/**
 * Middleware authorize
 * Memeriksa apakah role pengguna ada di dalam array allowedRoles.
 * @param {string[]} allowedRoles Array of role codes (e.g. ['ADMIN_PT', 'KPT'])
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const role = (req.user && req.user.role) ? req.user.role : (req.tenant && req.tenant.role);

        if (!role) {
            return next(new AppError('Unauthorized: Role tidak ditemukan.', 403));
        }

        if (!allowedRoles.includes(role)) {
            return next(new AppError('Forbidden: Anda tidak memiliki akses ke fitur ini.', 403));
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
