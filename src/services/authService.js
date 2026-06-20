/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Auth Service
 * Logika bisnis untuk Autentikasi, Enkripsi, Keamanan Token, dan Manajemen User
 */

const knex = require('../config/knex');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Validasi Login Pengguna
 * @param {string} username
 * @param {string} password
 */
async function loginUser(username, password) {
    // 1. Cari user berdasarkan username
    const user = await knex('users')
        .where({ username })
        .andWhere('is_active', true)
        .first();

    // 2. Jika user tidak ditemukan
    if (!user) {
        throw new AppError('INVALID_CREDENTIALS: Username tidak ditemukan atau akun nonaktif.', 401);
    }

    // 3. Verifikasi Password menggunakan Bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new AppError('INVALID_CREDENTIALS: Password yang Anda masukkan salah.', 401);
    }

    // 4. Generate JWT Token
    const token = generateToken(user);

    // 5. Kembalikan data user (tanpa password_hash) dan token
    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            satkerId: user.satker_id
        }
    };
}

/**
 * Membuat akun user baru (hanya dipanggil oleh Admin PT)
 * @param {Object} userData - { username, password, role, satker_id, email }
 */
async function createUser({ username, password, role, satker_id, email }) {
    if (!password || password.trim() === '') {
        throw new AppError('Password wajib diisi untuk akun baru.', 400);
    }
    const password_hash = await bcrypt.hash(password, 10);
    await knex('users').insert({
        username,
        password_hash,
        role: role || 'SATKER_PN',
        satker_id: satker_id || null,
        email: email || null
    });
}

/**
 * Memperbarui data akun user yang sudah ada
 * @param {number} id - ID user yang akan diperbarui
 * @param {Object} userData - { username, password, role, satker_id, email }
 */
async function updateUser(id, { username, password, role, satker_id, email }) {
    const userData = {
        username,
        role: role || 'SATKER_PN',
        satker_id: satker_id || null,
        email: email || null
    };
    // Hanya hash password baru jika ada yang dikirim
    if (password && password.trim() !== '') {
        userData.password_hash = await bcrypt.hash(password, 10);
    }
    await knex('users').where({ id }).update(userData);
}

/**
 * Mengambil semua daftar user Satker dan Pimpinan (tidak termasuk Admin)
 * @returns {Array}
 */
async function getAllUsers() {
    return knex('users')
        .leftJoin('satkers', 'users.satker_id', 'satkers.id')
        .select(
            'users.id',
            'users.username',
            'users.role',
            'users.email',
            'users.is_active',
            'satkers.nama_satker'
        )
        .whereNot('users.role', 'ADMIN_PT'); // Jangan tampilkan sesama admin untuk keamanan
}

/**
 * Helper: Membuat Token JWT
 * @param {Object} user
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        role: user.role,
        satkerId: user.satker_id
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });
}

/**
 * Helper: Verifikasi Token (Digunakan internal jika diperlukan)
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw new AppError('Token kedaluwarsa atau tidak valid.', 401);
    }
}

/**
 * Menghapus akun user
 * @param {number} id
 */
async function deleteUser(id) {
    await knex('users').where({ id }).del();
}

const crypto = require('crypto');
const { emailQueue } = require('../emailWorker');

/**
 * Handle proses Lupa Password
 */
async function forgotPassword(usernameOrEmail) {
    const user = await knex('users')
        .where('username', usernameOrEmail)
        .orWhere('email', usernameOrEmail)
        .first();

    if (!user) {
        throw new AppError('Pengguna dengan username atau email tersebut tidak ditemukan.', 404);
    }

    if (!user.email) {
        throw new AppError('Akun ini belum memiliki alamat email yang terdaftar. Harap hubungi Admin PT.', 400);
    }

    // Buat token random
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000; // Berlaku 1 jam

    await knex('users')
        .where({ id: user.id })
        .update({
            reset_password_token: resetToken,
            reset_password_expires: resetExpires
        });

    // Kirim antrean email (Worker akan memprosesnya di background)
    await emailQueue.add('sendPasswordResetEmail', {
        to: user.email,
        username: user.username,
        token: resetToken
    });

    return { message: 'Tautan reset kata sandi telah dikirim ke email Anda.' };
}

/**
 * Handle proses Reset Password menggunakan Token
 */
async function resetPasswordWithToken(token, newPassword) {
    const user = await knex('users')
        .where('reset_password_token', token)
        .andWhere('reset_password_expires', '>', Date.now())
        .first();

    if (!user) {
        throw new AppError('Tautan reset password tidak valid atau sudah kadaluarsa.', 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await knex('users')
        .where({ id: user.id })
        .update({
            password_hash,
            reset_password_token: null,
            reset_password_expires: null
        });
}

module.exports = {
    loginUser,
    createUser,
    updateUser,
    getAllUsers,
    deleteUser,
    generateToken,
    verifyToken,
    forgotPassword,
    resetPasswordWithToken
};