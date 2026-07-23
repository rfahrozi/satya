'use strict';
/**
 * SATYA - Seed: 60_fix_akip_and_reg_koordinator.js
 *
 * KOREKSI KOORDINATOR berdasarkan XLSX Resmi:
 * "Master_Monitoring_Pengadilan_Tinggi.xlsx" | Sheet: Master Revisi
 * Dianalisis: 19-20 Juli 2026
 *
 * PERBAIKAN:
 * 1. AKIP-001~079 (79 item): Koordinator → KASUBBAG RENCANA PROGRAM DAN ANGGARAN
 *    (seed 40 mengubahnya ke KETUA secara keliru)
 * 2. REG-001: Koordinator → KETUA (bukan WAKIL KETUA)
 * 3. REG-002: Koordinator → PANITERA (bukan WAKIL KETUA)
 * 4. REG-008: Koordinator → PANITERA (bukan KETUA)
 * 5. REG-009: Koordinator → SEKRETARIS (bukan KETUA)
 * 6. REG-010: Koordinator → KABAG PERENCANAAN DAN KEPEGAWAIAN (bukan SEKRETARIS)
 * 7. REG-011: Koordinator → KASUBBAG TATA USAHA DAN RUMAH TANGGA
 *             duty_cluster → TATA USAHA DAN RUMAH TANGGA
 * 8. Tambah akun PANMUD_TIPIKOR (koordinator REG-005)
 */

// ── Mapping koreksi individual REG ───────────────────────────────────────────
// Sumber: XLSX Sheet "Master Revisi" kolom 14 (Koordinator Proses)
const REG_KOREKSI = [
  {
    kode: 'REG-001',
    jabatan: 'KETUA',
    unitCode: 'PIMPINAN_PT',
    rumpun: 'PRIORITAS PERSIDANGAN DAN PELAYANAN',
  },
  {
    kode: 'REG-002',
    jabatan: 'PANITERA',
    unitCode: 'KEPANITERAAN',
    rumpun: 'PENYELESAIAN PERKARA BANDING',
  },
  {
    kode: 'REG-008',
    jabatan: 'PANITERA',
    unitCode: 'KEPANITERAAN',
    rumpun: 'PENGENDALIAN KEPANITERAAN',
  },
  {
    kode: 'REG-009',
    jabatan: 'SEKRETARIS',
    unitCode: 'SEKRETARIAT',
    rumpun: 'PENGENDALIAN KESEKRETARIATAN',
  },
  {
    kode: 'REG-010',
    jabatan: 'KABAG PERENCANAAN DAN KEPEGAWAIAN',
    unitCode: 'KABAG_PERENC_KEP',
    rumpun: 'PERENCANAAN, SDM, ORGANISASI DAN TI',
  },
  {
    kode: 'REG-011',
    jabatan: 'KASUBBAG TATA USAHA DAN RUMAH TANGGA',
    unitCode: 'SUBBAG_TURT',
    rumpun: 'TATA USAHA DAN RUMAH TANGGA', // XLSX berbeda dari seed lama
  },
];

exports.seed = async function (knex) {
  console.log('\n🔧 Seed 60: Koreksi Koordinator AKIP & REG sesuai XLSX Resmi...\n');

  // ── Langkah 1: Load unit map ───────────────────────────────────────────────
  console.log('   [1/5] Memuat unit map dari database...');
  const allUnits = await knex('internal_units').select('id', 'code', 'name');
  const unitMap = {};
  for (const u of allUnits) {
    unitMap[u.code] = u;
  }
  console.log(`   ✅ ${allUnits.length} unit dimuat\n`);

  // Validasi unit yang diperlukan
  const requiredUnits = [
    'PIMPINAN_PT', 'KEPANITERAAN', 'SEKRETARIAT', 'KABAG_PERENC_KEP',
    'SUBBAG_TURT', 'SUBBAG_PTIP',
  ];
  const missing = requiredUnits.filter(c => !unitMap[c]);
  if (missing.length > 0) {
    console.error(`   ❌ Unit tidak ditemukan: ${missing.join(', ')}`);
    throw new Error(`Unit tidak ditemukan: ${missing.join(', ')}`);
  }
  console.log('   ✅ Semua unit yang diperlukan tersedia\n');

  // ── Langkah 2: Koreksi AKIP (79 item) → KASUBBAG RENCANA PROGRAM ──────────
  console.log('   [2/5] Koreksi koordinator 79 item AKIP...');
  console.log('         Dari: KETUA → Ke: KASUBBAG RENCANA PROGRAM DAN ANGGARAN');

  const akipItems = await knex('monitoring_items')
    .where('item_code', 'like', 'AKIP-%')
    .select('id', 'item_code');

  const subbagPtipId = unitMap['SUBBAG_PTIP'].id;
  let akipFixed = 0;

  for (const item of akipItems) {
    // Hapus assignment lama
    await knex('monitoring_item_assignments')
      .where('monitoring_item_id', item.id)
      .del();

    // Insert assignment baru — KASUBBAG RENCANA PROGRAM DAN ANGGARAN
    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: item.id,
      internal_unit_id: subbagPtipId,
      responsibility_type: 'PRIMARY',
      is_active: true,
    });
    akipFixed++;
  }
  console.log(`   ✅ ${akipFixed} item AKIP dikoreksi ke SUBBAG_PTIP\n`);

  // ── Langkah 3: Koreksi REG individual ─────────────────────────────────────
  console.log('   [3/5] Koreksi koordinator item REG...');
  let regFixed = 0;
  const regErrors = [];

  for (const koreksi of REG_KOREKSI) {
    const item = await knex('monitoring_items')
      .where('item_code', koreksi.kode)
      .first();

    if (!item) {
      regErrors.push(`Item ${koreksi.kode} tidak ditemukan`);
      continue;
    }

    const unitId = unitMap[koreksi.unitCode]?.id;
    if (!unitId) {
      regErrors.push(`Unit ${koreksi.unitCode} tidak ada untuk ${koreksi.kode}`);
      continue;
    }

    // Hapus assignment lama
    await knex('monitoring_item_assignments')
      .where('monitoring_item_id', item.id)
      .del();

    // Insert assignment baru
    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: item.id,
      internal_unit_id: unitId,
      responsibility_type: 'PRIMARY',
      is_active: true,
    });

    // Update duty_cluster jika berbeda (khusus REG-011)
    if (koreksi.kode === 'REG-011') {
      await knex('monitoring_items')
        .where('id', item.id)
        .update({ duty_cluster: koreksi.rumpun });
      console.log(`   📝 Update duty_cluster REG-011 → ${koreksi.rumpun}`);
    }

    console.log(`   ✅ ${koreksi.kode}: ${koreksi.jabatan} (${koreksi.unitCode})`);
    regFixed++;
  }

  if (regErrors.length > 0) {
    console.log('   ⚠️  Errors:', regErrors);
  }
  console.log(`\n   ✅ ${regFixed} item REG dikoreksi\n`);

  // ── Langkah 4: Tambah unit PANMUD_TIPIKOR jika belum ada ─────────────────
  console.log('   [4/5] Memastikan unit PANMUD_TIPIKOR ada...');
  let tipkorUnit = await knex('internal_units').where('code', 'PANMUD_TIPIKOR').first();
  if (!tipkorUnit) {
    const kepUnit = await knex('internal_units').where('code', 'KEPANITERAAN').first();
    const [inserted] = await knex('internal_units').insert({
      code: 'PANMUD_TIPIKOR',
      name: 'Kepaniteraan Muda Tipikor/Khusus',
      unit_type: 'SUBBAG',
      parent_id: kepUnit?.id || null,
      is_active: true,
    }).returning('*');
    tipkorUnit = inserted;
    console.log('   ✅ Unit PANMUD_TIPIKOR berhasil ditambahkan');
  } else {
    console.log('   ⏭  Unit PANMUD_TIPIKOR sudah ada, skip');
  }

  // Koreksi REG-005 ke unit PANMUD_TIPIKOR
  const reg005 = await knex('monitoring_items').where('item_code', 'REG-005').first();
  if (reg005 && tipkorUnit) {
    await knex('monitoring_item_assignments')
      .where('monitoring_item_id', reg005.id)
      .del();
    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: reg005.id,
      internal_unit_id: tipkorUnit.id,
      responsibility_type: 'PRIMARY',
      is_active: true,
    });
    console.log('   ✅ REG-005: Assignment dikoreksi ke PANMUD_TIPIKOR');
  }
  console.log();

  // ── Langkah 5: Tambah akun PANMUD_TIPIKOR jika belum ada ──────────────────
  console.log('   [5/5] Memastikan akun panmud_tipikor ada...');
  const existingAccount = await knex('users').where('username', 'panmud_tipikor').first();
  if (!existingAccount) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);
    await knex('users').insert({
      username: 'panmud_tipikor',
      email: 'panmudtipikor@pt-kepri.go.id',
      password_hash: hash,
      role: 'PANMUD_TIPIKOR_PT',
      satker_id: null,
      is_active: true,
    });
    console.log('   ✅ Akun panmud_tipikor berhasil dibuat');
  } else {
    console.log('   ⏭  Akun panmud_tipikor sudah ada, skip');
  }

  // ── Verifikasi Final ───────────────────────────────────────────────────────
  console.log('\n   📊 Verifikasi Final:');

  // Cek distribusi AKIP
  const akipCheck = await knex('monitoring_item_assignments as mia')
    .join('monitoring_items as mi', 'mia.monitoring_item_id', 'mi.id')
    .join('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
    .where(knex.raw("mi.item_code LIKE 'AKIP-%'"))
    .groupBy('iu.code', 'iu.name')
    .select('iu.code', 'iu.name', knex.raw('COUNT(*) as total'));

  console.log('   AKIP Assignments:');
  for (const row of akipCheck) {
    const icon = row.code === 'SUBBAG_PTIP' ? '✅' : '⚠️ ';
    console.log(`      ${icon} ${row.code.padEnd(20)} (${row.name}): ${row.total} item`);
  }

  // Cek REG
  const regCheck = await knex('monitoring_item_assignments as mia')
    .join('monitoring_items as mi', 'mia.monitoring_item_id', 'mi.id')
    .join('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
    .where(knex.raw("mi.item_code LIKE 'REG-%'"))
    .select('mi.item_code', 'iu.code', 'iu.name')
    .orderBy('mi.item_code');

  console.log('\n   REG Assignments (setelah koreksi):');
  for (const row of regCheck) {
    console.log(`      ${row.item_code}: ${row.code} (${row.name})`);
  }

  const totalAssign = await knex('monitoring_item_assignments').count('id as c').first();
  console.log(`\n   📋 Total assignment: ${totalAssign.c} (seharusnya 295)`);
  console.log('\n✅ Seed 60 selesai — Koordinator AKIP & REG telah dikoreksi sesuai XLSX!\n');
};
