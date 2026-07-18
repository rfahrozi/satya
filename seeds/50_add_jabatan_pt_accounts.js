'use strict';
/**
 * SATYA - Seed: 50_add_jabatan_pt_accounts.js
 *
 * Membuat akun pengguna untuk semua jabatan resmi PT
 * berdasarkan PDF3: "3.Master_Monitoring_Pengadilan_Tinggi_Sesuai Jabatan.pdf"
 *
 * 15 jabatan resmi:
 * KETUA, WAKIL KETUA, HAKIM, PANITERA, PANMUD_HUKUM, PANMUD_PERDATA,
 * PANMUD_PIDANA, PANITERA_PENGGANTI, SEKRETARIS, KABAG_PERENC_KEP,
 * KABAG_UMUM_KEU, KASUBBAG_TURT, KASUBBAG_KEPEG_TI, KASUBBAG_PEL_KEU,
 * KASUBBAG_PTIP
 */

const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  console.log('\n👤 Seed: Membuat Akun Pengguna Semua Jabatan PT...\n');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // Daftar akun jabatan PT (idempotent — skip jika sudah ada)
  const jabatanAccounts = [
    // ── Pimpinan ────────────────────────────────────────────────────────────
    { username: 'ketua_pt',      email: 'ketua@pt-kepri.go.id',         role: 'KPT',             label: 'Ketua PT' },
    { username: 'wakil_ketua',   email: 'wakilketua@pt-kepri.go.id',    role: 'WKPT',            label: 'Wakil Ketua PT' },
    { username: 'hakim_tinggi',  email: 'hakim@pt-kepri.go.id',         role: 'HAKIM_PT',        label: 'Hakim Tinggi' },

    // ── Kepaniteraan ────────────────────────────────────────────────────────
    { username: 'panitera_pt',       email: 'panitera@pt-kepri.go.id',        role: 'PANITERA_PT',        label: 'Panitera PT' },
    { username: 'panmud_hukum',      email: 'panmudhk@pt-kepri.go.id',        role: 'PANMUD_HUKUM_PT',    label: 'Panitera Muda Hukum' },
    { username: 'panmud_perdata',    email: 'panmudpdt@pt-kepri.go.id',       role: 'PANMUD_PERDATA_PT',  label: 'Panitera Muda Perdata' },
    { username: 'panmud_pidana',     email: 'panmudpid@pt-kepri.go.id',       role: 'PANMUD_PIDANA_PT',   label: 'Panitera Muda Pidana' },
    { username: 'pan_pengganti',     email: 'panpengganti@pt-kepri.go.id',    role: 'PANITERA_PENGGANTI', label: 'Panitera Pengganti' },

    // ── Kesekretariatan ─────────────────────────────────────────────────────
    { username: 'sekretaris_pt',     email: 'sekretaris@pt-kepri.go.id',      role: 'SEKRETARIS_PT',      label: 'Sekretaris PT' },
    { username: 'kabag_perenc',      email: 'kabagperenc@pt-kepri.go.id',     role: 'KABAG_PERENC_KEP',   label: 'Kabag Perencanaan & Kepegawaian' },
    { username: 'kabag_umum',        email: 'kabagumum@pt-kepri.go.id',       role: 'KABAG_UMUM_KEU',     label: 'Kabag Umum & Keuangan' },
    { username: 'kasubbag_turt',     email: 'turt@pt-kepri.go.id',            role: 'KASUBBAG_TURT',      label: 'Kasubbag Tata Usaha & Rumah Tangga' },
    { username: 'kasubbag_kepeg_ti', email: 'kepegti@pt-kepri.go.id',         role: 'KASUBBAG_KEPEG_TI',  label: 'Kasubbag Kepegawaian & TI' },
    { username: 'kasubbag_pel_keu',  email: 'pelkeu@pt-kepri.go.id',          role: 'KASUBBAG_PEL_KEU',   label: 'Kasubbag Keuangan & Pelaporan' },
    { username: 'kasubbag_ptip',     email: 'ptip@pt-kepri.go.id',            role: 'KASUBBAG_PTIP',      label: 'Kasubbag Perencanaan Program & Anggaran' },

    // ── Tim Khusus ──────────────────────────────────────────────────────────
    { username: 'tim_verifier',      email: 'verifier@pt-kepri.go.id',        role: 'VERIFIER',           label: 'Tim Verifikator Internal' },
  ];

  let created = 0;
  let skipped = 0;

  for (const acc of jabatanAccounts) {
    const existing = await knex('users').where('username', acc.username).first();
    if (existing) {
      // Update role jika berbeda
      if (existing.role !== acc.role) {
        await knex('users').where('id', existing.id).update({ role: acc.role, email: acc.email });
        console.log(`   🔄 Update role: ${acc.username} -> ${acc.role}`);
      } else {
        console.log(`   ⏭  Skip (sudah ada): ${acc.username} [${acc.role}]`);
        skipped++;
      }
    } else {
      await knex('users').insert({
        username: acc.username,
        email: acc.email,
        password_hash: defaultPassword,
        role: acc.role,
        satker_id: null,
        is_active: true,
      });
      console.log(`   ✅ Buat akun: ${acc.username} (${acc.label}) [${acc.role}]`);
      created++;
    }
  }

  // Pastikan akun admin_pt ada dan role-nya benar
  const adminExist = await knex('users').where('username', 'admin_pt').first();
  if (adminExist && adminExist.role !== 'ADMIN_PT') {
    await knex('users').where('username', 'admin_pt').update({ role: 'ADMIN_PT' });
    console.log('   🔄 Fix role admin_pt -> ADMIN_PT');
  }

  // Statistik akhir
  const total = await knex('users').count('* as count').first();
  const byRole = await knex('users')
    .select('role', knex.raw('COUNT(*) as count'))
    .groupBy('role')
    .orderBy('role');

  console.log(`\n   ✅ Selesai: ${created} akun baru, ${skipped} sudah ada`);
  console.log(`   📊 Total pengguna: ${total.count}`);
  console.log('\n   📋 Distribusi role:');
  byRole.forEach(r => console.log(`      ${r.role.padEnd(25)} : ${r.count} akun`));
  console.log('');
};
