/**
 * SATYA — Seed: User Accounts untuk Internal Monitoring PT Kepri
 * ──────────────────────────────────────────────────────────────
 * Membuat akun untuk proses UAT:
 * 1. Pimpinan (KPT, WKPT)
 * 2. Pejabat (Panitera, Panmud, Kabag)
 * 3. Koordinator (4 Koordinator)
 * 4. Verifikator (Tim Penjaminan Mutu)
 *
 * Password default semua user: password123
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  console.log('\n👤 Seed: User Accounts Internal Monitoring — Mulai...\n');

  // Bersihkan user kuno/lawas yang sudah tidak relevan di struktur baru
  await knex('internal_assignments').whereIn('user_id', function() {
    this.select('id').from('users').whereIn('username', ['koor_perkara', 'koor_rb', 'koor_sarpras', 'koor_keuangan']);
  }).del();
  await knex('users').whereIn('username', ['koor_perkara', 'koor_rb', 'koor_sarpras', 'koor_keuangan']).del();

  // Ambil ID dari internal_units dan positions yang dibuat di seed master_data
  const units = await knex('internal_units').select('id', 'code');
  const unitMap = units.reduce((acc, u) => ({ ...acc, [u.code]: u.id }), {});

  const positions = await knex('positions').select('id', 'code');
  const posMap = positions.reduce((acc, p) => ({ ...acc, [p.code]: p.id }), {});

  if (Object.keys(unitMap).length === 0 || Object.keys(posMap).length === 0) {
    console.warn('⚠ Tabel internal_units atau positions masih kosong. Jalankan seed master_data terlebih dahulu.');
    return;
  }

  const defaultPassword = await bcrypt.hash('password123', 10);

  // Definisi User Baru untuk UAT
  const UAT_USERS = [
    // ── Pimpinan ──
    { username: 'ketua_pt',   email: 'ketua@pt-kepri.go.id', role: 'KPT',      posCode: 'KPT',  unitCode: null },
    { username: 'wakil_kpt',  email: 'wakil@pt-kepri.go.id', role: 'WKPT',     posCode: 'WKPT', unitCode: null },

    // ── Kepaniteraan ──
    { username: 'panitera',       email: 'panitera@pt-kepri.go.id',       role: 'PANITERA_PT',       posCode: 'PANITERA_PT',       unitCode: 'KEPANITERAAN' },
    { username: 'panmud_pidana',  email: 'panmud_pidana@pt-kepri.go.id',  role: 'PANMUD_PIDANA_PT',  posCode: 'PANMUD_PIDANA_PT',  unitCode: 'PANMUD_PIDANA' },
    { username: 'panmud_perdata', email: 'panmud_perdata@pt-kepri.go.id', role: 'PANMUD_PERDATA_PT', posCode: 'PANMUD_PERDATA_PT', unitCode: 'PANMUD_PERDATA' },
    { username: 'panmud_tipikor', email: 'panmud_tipikor@pt-kepri.go.id', role: 'PANMUD_TIPIKOR_PT', posCode: 'PANMUD_TIPIKOR_PT', unitCode: 'PANMUD_TIPIKOR' },
    { username: 'panmud_hk',      email: 'panmud_hk@pt-kepri.go.id',      role: 'PANMUD_HUKUM_PT',   posCode: 'PANMUD_HUKUM_PT',   unitCode: 'PANMUD_HUKUM' },

    // ── Kesekretariatan (Kabag) ──
    { username: 'kabag_perenc', email: 'perencanaan@pt-kepri.go.id', role: 'KABAG_PK', posCode: 'KABAG_PK', unitCode: 'KABAG_PERENC_KEP' },
    { username: 'kabag_umum',   email: 'umum@pt-kepri.go.id',        role: 'KABAG_UK', posCode: 'KABAG_UK', unitCode: 'KABAG_UMUM_KEU' },

    // ── Koordinator Pelaksana (Kasubbag Perencanaan & Kepegawaian) ──
    { username: 'kasubbag_ptip',     email: 'ptip@pt-kepri.go.id',    role: 'KASUBBAG_PTIP',     posCode: 'KASUBBAG_PTIP',     unitCode: 'SUBBAG_PTIP' },
    { username: 'kasubbag_kepeg_ti', email: 'kepegti@pt-kepri.go.id', role: 'KASUBBAG_KEPEG_TI', posCode: 'KASUBBAG_KEPEG_TI', unitCode: 'SUBBAG_KEPEG_TI' },

    // ── Koordinator Pelaksana (Kasubbag Umum & Keuangan) ──
    { username: 'kasubbag_turt',     email: 'turt@pt-kepri.go.id',    role: 'KASUBBAG_TURT',     posCode: 'KASUBBAG_TURT',     unitCode: 'SUBBAG_TURT' },
    { username: 'kasubbag_pel_keu',  email: 'pelkeu@pt-kepri.go.id',  role: 'KASUBBAG_PEL_KEU',  posCode: 'KASUBBAG_PEL_KEU',  unitCode: 'SUBBAG_PEL_KEU' },

    // ── Tim Penjamin Mutu & Arsiparis (Verifikator) ──
    { username: 'tim_mutu',     email: 'mutu@pt-kepri.go.id',     role: 'VERIFIER',  posCode: 'VERIFIER_PT', unitCode: null },
    { username: 'arsiparis',    email: 'arsiparis@pt-kepri.go.id',role: 'ARSIPARIS', posCode: 'VERIFIER_PT', unitCode: null },
  ];

  let usersAdded = 0;
  let assignmentsAdded = 0;

  for (const u of UAT_USERS) {
    // 1. Insert atau Update User
    let user = await knex('users').where('username', u.username).first();
    if (!user) {
      const [inserted] = await knex('users').insert({
        username: u.username,
        email: u.email,
        password_hash: defaultPassword,
        role: u.role,
        satker_id: null,
        is_active: true
      }).returning('*');
      user = inserted;
      usersAdded++;
    } else {
      // Update role jika berbeda (agar perbaikan role terapply ke existing user)
      if (user.role !== u.role) {
        await knex('users').where('id', user.id).update({ role: u.role });
        user.role = u.role;
      }
    }

    // 2. Insert atau Update Assignment (Memetakan user ke Unit & Jabatan)
    if (u.posCode || u.unitCode) {
      const posId  = u.posCode ? posMap[u.posCode] : null;
      const unitId = u.unitCode ? unitMap[u.unitCode] : null;

      const roleScope = ['KPT','WKPT','PIMPINAN','PANITERA_PT','KABAG_PK','KABAG_UK'].includes(u.role) ? 'SUPERVISOR'
                      : ['VERIFIER','VERIFIER_PT','ARSIPARIS'].includes(u.role) ? 'VERIFIER'
                      : 'UNIT_PIC';

      const existAssign = await knex('internal_assignments')
        .where('user_id', user.id)
        .first();

      if (!existAssign) {
        await knex('internal_assignments').insert({
          user_id: user.id,
          internal_unit_id: unitId,
          position_id: posId,
          role_scope: roleScope,
          is_primary: true,
          is_active: true
        });
        assignmentsAdded++;
      } else {
        await knex('internal_assignments').where('id', existAssign.id).update({
          internal_unit_id: unitId,
          position_id: posId,
          role_scope: roleScope,
          is_active: true
        });
      }
    }
  }

  console.log(`✅ Seed User & Assignments Selesai:`);
  console.log(`   - ${usersAdded} akun user baru dibuat`);
  console.log(`   - ${assignmentsAdded} pemetaan unit & jabatan ditambahkan`);
  console.log(`\n🔑 Kredensial UAT (Password semua akun: password123):`);
  console.log(`   - ketua_pt, wakil_kpt      (Pimpinan Tertinggi)`);
  console.log(`   - kabag_perenc, kabag_umum (Approver Unit)`);
  console.log(`   - kasubbag_ptip, kasubbag_kepeg_ti, kasubbag_turt, kasubbag_pel_keu (Collector Dokumen)`);
  console.log(`   - panitera, panmud_hk      (Kepaniteraan)`);
  console.log(`   - tim_mutu                 (Verifikator)`);
  console.log('\n');
};
