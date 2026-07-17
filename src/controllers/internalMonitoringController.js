const notImplemented = (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
module.exports = new Proxy({}, { get: () => notImplemented });
