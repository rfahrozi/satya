/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Auth Controller
 * Controller tipis: hanya menangani HTTP layer. Semua logika bisnis ada di authService.
 */

const authService = require('../services/authService');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Handle Login Pengguna
 */
async function login(req, res, next) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            throw new AppError('Username dan password wajib diisi.', 400);
        }

        const result = await authService.loginUser(username, password);

        res.status(200).json({
            success: true,
            message: 'Login berhasil. Selamat datang di SATYA.',
            data: result
        });
    } catch (error) {
        if (error.message.includes('INVALID_CREDENTIALS')) {
            next(new AppError('Username atau password salah.', 401));
        } else {
            next(error);
        }
    }
}

/**
 * [ADMIN] Simpan atau Update Akun User Satker
 */
async function saveOrUpdateUser(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') {
            throw new AppError('Anda tidak memiliki izin untuk mengelola akun.', 403);
        }

        const { id, ...userData } = req.body;

        if (id) {
            await authService.updateUser(id, userData);
            res.status(200).json({ success: true, message: 'Akun berhasil diperbarui.' });
        } else {
            await authService.createUser(userData);
            res.status(201).json({ success: true, message: 'Akun baru berhasil dibuat.' });
        }
    } catch (error) {
        next(error);
    }
}

/**
 * [ADMIN] Ambil Semua Daftar User Satker
 */
async function getAllUsers(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') {
            throw new AppError('Akses ditolak.', 403);
        }

        const users = await authService.getAllUsers();

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [ADMIN] Hapus Akun User Satker
 */
async function deleteUser(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') {
            throw new AppError('Akses ditolak.', 403);
        }

        const { id } = req.params;
        await authService.deleteUser(id);

        res.status(200).json({
            success: true,
            message: 'Akun berhasil dihapus.'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [ADMIN] Reset Password User ke default (password123)
 */
async function resetPassword(req, res, next) {
    try {
        if (req.tenant.role !== 'ADMIN_PT') {
            throw new AppError('Akses ditolak.', 403);
        }

        const { id } = req.params;
        await authService.updateUser(id, { password: 'password123' });

        res.status(200).json({
            success: true,
            message: 'Password berhasil direset ke password default (password123).'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [PUBLIC] Minta reset password (Kirim link ke email)
 */
async function forgotPassword(req, res, next) {
    try {
        const { username } = req.body;
        if (!username) {
            throw new AppError('Username wajib diisi.', 400);
        }

        const result = await authService.forgotPassword(username);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

/**
 * [PUBLIC] Reset password menggunakan token dari email
 */
async function resetPasswordWithToken(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            throw new AppError('Token dan Password Baru wajib diisi.', 400);
        }
        
        if (newPassword.length < 6) {
            throw new AppError('Password harus minimal 6 karakter.', 400);
        }

        await authService.resetPasswordWithToken(token, newPassword);
        
        res.status(200).json({
            success: true,
            message: 'Password Anda berhasil diubah. Silakan login menggunakan password baru.'
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login,
    saveOrUpdateUser,
    getAllUsers,
    deleteUser,
    resetPassword,
    forgotPassword,
    resetPasswordWithToken
};