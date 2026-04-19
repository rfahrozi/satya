const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const tenantContext = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Unauthorized: Token missing', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.tenant = { userId: decoded.id, role: decoded.role, satkerId: decoded.satkerId };
        next();
    } catch (err) {
        next(new AppError('Invalid Token', 401));
    }
};
module.exports = tenantContext;