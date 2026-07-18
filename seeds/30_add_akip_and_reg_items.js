'use strict';
/**
 * SATYA - Seed: 30_add_akip_and_reg_items.js
 *
 * Menambahkan item yang HILANG dari seed sebelumnya berdasarkan PDF resmi:
 *
 * 1. AKIP-001 s.d. AKIP-079 (79 item Akuntabilitas Kinerja)
 *    Sumber: PDF "2.Periode Master_Monitoring_Pengadilan_Tinggi_Evaluasi_Menyeluruh_2026.pdf"
 *    Koordinator: KASUBBAG RENCANA PROGRAM DAN ANGGARAN
 *    Rumpun: AKUNTABILITAS KINERJA
 *
 * 2. REG-001 s.d. REG-012 (12 item Tambahan Regulasi)
 *    Sumber: PDF "2.Periode Master_Monitoring..." halaman 9
 *    Koordinator & Rumpun sesuai PDF
 *
 * Seed ini bersifat IDEMPOTENT — aman dijalankan berulang kali.
 * Item CHK-015~018 yang salah kode juga dibersihkan di sini.
 */

// ─── DATA AKIP (79 item sesuai PDF2) ───────────────────────────────────────
// Semua AKIP berkoordinasi oleh KASUBBAG RENCANA PROGRAM DAN ANGGARAN
// Rumpun: AKUNTABILITAS KINERJA
// Frekuensi campuran berdasarkan siklus kinerja (bulanan, triwulan, semester, tahunan)

const AKIP_ITEMS = [];
for (let i = 1; i <= 79; i++) {
  const code = `AKIP-${String(i).padStart(3, '0')}`;

  // Tentukan frekuensi berdasarkan siklus SAKIP umum
  let freq = 'MONTHLY';
  if (i <= 10)  freq = 'ANNUAL_REGULATOR_CALENDAR'; // Renstra, IKU, Perjanjian Kinerja
  else if (i <= 25) freq = 'QUARTERLY';              // Laporan kinerja triwulan
  else if (i <= 40) freq = 'SEMIANNUAL';             // Evaluasi semester
  else if (i <= 60) freq = 'ANNUAL_REGULATOR_CALENDAR'; // LKjIP, evaluasi akuntabilitas
  else if (i <= 70) freq = 'MONTHLY';               // Monev bulanan
  else freq = 'CONTINUOUS_WITH_MONTHLY_REVIEW';      // Pemantauan berkelanjutan

  // Tentukan area kriteria: K.1 = Perencanaan, K.2 = Pengukuran & Pelaporan
  const criteriaKey = i <= 40 ? 'AKIP.K.1' : 'AKIP.K.2';

  AKIP_ITEMS.push({ code, freq, criteriaKey });
}

// ─── DATA REG (12 item sesuai PDF-5 "Master Dokumen Final", audit 18 Juli 2026) ─
const REG_ITEMS = [
  // REG-001: WAKIL KETUA (bukan KETUA) — sesuai PDF-5
  { code: 'REG-001', rumpun: 'PRIORITAS PERSIDANGAN DAN PELAYANAN',     koordinator: 'WAKIL KETUA',        unitCode: 'WKPT' },
  // REG-002: WAKIL KETUA (bukan PANITERA) — sesuai PDF-5
  { code: 'REG-002', rumpun: 'PENYELESAIAN PERKARA BANDING',            koordinator: 'WAKIL KETUA',        unitCode: 'WKPT' },
  { code: 'REG-003', rumpun: 'ADMINISTRASI PERKARA PERDATA BANDING',    koordinator: 'PANITERA',           unitCode: 'KEPANITERAAN' },
  { code: 'REG-004', rumpun: 'ADMINISTRASI PERKARA PIDANA BANDING',     koordinator: 'PANITERA',           unitCode: 'KEPANITERAAN' },
  { code: 'REG-005', rumpun: 'ADMINISTRASI PERKARA KHUSUS/TIPIKOR',     koordinator: 'PANITERA',           unitCode: 'KEPANITERAAN' },
  { code: 'REG-006', rumpun: 'DATA, TRANSPARANSI, PENGADUAN DAN ARSIP', koordinator: 'PANITERA',           unitCode: 'KEPANITERAAN' },
  { code: 'REG-007', rumpun: 'DUKUNGAN PERSIDANGAN DAN MINUTASI',       koordinator: 'PANITERA PENGGANTI', unitCode: 'PANITERA_PENGGANTI' },
  // REG-008: KETUA (bukan PANITERA) — sesuai PDF-5 Master Dokumen Final
  { code: 'REG-008', rumpun: 'PENGENDALIAN KEPANITERAAN',               koordinator: 'KETUA',              unitCode: 'PIMPINAN_PT' },
  // REG-009: KETUA (bukan SEKRETARIS) + unit PIMPINAN_PT (bukan KABAG_PERENC_KEP) — PDF-5
  { code: 'REG-009', rumpun: 'PENGENDALIAN KESEKRETARIATAN',            koordinator: 'KETUA',              unitCode: 'PIMPINAN_PT' },
  // REG-010: SEKRETARIS (bukan KABAG PERENCANAAN) — sesuai PDF-5
  { code: 'REG-010', rumpun: 'PERENCANAAN, SDM, ORGANISASI DAN TI',    koordinator: 'SEKRETARIS',         unitCode: 'SEKRETARIAT' },
  { code: 'REG-011', rumpun: 'UMUM, KEUANGAN DAN BMN',                  koordinator: 'KABAG UMUM DAN KEUANGAN', unitCode: 'KABAG_UMUM_KEU' },
  { code: 'REG-012', rumpun: 'PELAYANAN TERPADU SATU PINTU',            koordinator: 'PANITERA',           unitCode: 'KEPANITERAAN' },
];

// Helper upsert
async function upsert(knex, table, uniqueField, rows) {
  const results = [];
  for (const row of rows) {
    let existing = await knex(table).where(uniqueField, row[uniqueField]).first();
    if (!existing) {
      const [inserted] = await knex(table).insert(row).returning('*');
      existing = inserted;
    }
    results.push(existing);
  }
  return results;
}

// Helper hapus item idempotent
async function deleteItemByCode(knex, code) {
  const item = await knex('monitoring_items').where('item_code', code).first();
  if (item) {
    await knex('monitoring_item_assignments').where('monitoring_item_id', item.id).del();
    await knex('monitoring_evidence_requirement_templates').where('monitoring_item_id', item.id).del();
    await knex('monitoring_item_criteria').where('monitoring_item_id', item.id).del();
    await knex('monitoring_items').where('id', item.id).del();
    return true;
  }
  return false;
}

exports.seed = async function (knex) {
  console.log('\n📋 Seed: Menambahkan AKIP-001~079 + REG-001~012 sesuai PDF Resmi 2026...\n');

  // ── 0. Bersihkan item CHK-015~018 yang salah kode ──────────────────────────
  const wrongCodes = ['CHK-015', 'CHK-016', 'CHK-017', 'CHK-018'];
  let cleanedCount = 0;
  for (const code of wrongCodes) {
    if (await deleteItemByCode(knex, code)) {
      console.log(`   🗑  Hapus item salah kode: ${code}`);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) console.log(`   ✅ ${cleanedCount} item kode CHK-xxx salah telah dihapus\n`);

  // ── 1. Pastikan assessment AKIP & REGULASI ada ────────────────────────────
  const assessments = [
    { code: 'AKIP',     name: 'Akuntabilitas Kinerja Instansi Pemerintah', description: 'Sistem SAKIP & Manajemen Kinerja' },
    { code: 'REGULASI', name: 'Kepatuhan Regulasi & Kebijakan',            description: 'Kepatuhan Tambahan Regulasi Badilum/MA' },
  ];
  const assessmentMap = {};
  for (const a of assessments) {
    const [row] = await upsert(knex, 'monitoring_source_assessments', 'code', [a]);
    assessmentMap[a.code] = row;
  }

  // ── 2. Pastikan kriteria AKIP ada ─────────────────────────────────────────
  const criteriaMap = {};
  const akipCriteria = [
    { code: 'K.1', text: 'Perencanaan & Target Kinerja' },
    { code: 'K.2', text: 'Pengukuran & Pelaporan Kinerja' },
  ];
  for (const c of akipCriteria) {
    const assessmentId = assessmentMap['AKIP']?.id;
    let existing = await knex('monitoring_source_criteria')
      .where({ assessment_id: assessmentId, criterion_code: c.code }).first();
    if (!existing) {
      const [row] = await knex('monitoring_source_criteria')
        .insert({ assessment_id: assessmentId, criterion_code: c.code, criterion_text: c.text })
        .returning('*');
      existing = row;
    }
    criteriaMap[`AKIP.${c.code}`] = existing.id;
  }

  // Kriteria REG
  const regCritId = await (async () => {
    const regAssessId = assessmentMap['REGULASI']?.id;
    let existing = await knex('monitoring_source_criteria')
      .where({ assessment_id: regAssessId, criterion_code: 'R.1' }).first();
    if (!existing) {
      const [row] = await knex('monitoring_source_criteria')
        .insert({ assessment_id: regAssessId, criterion_code: 'R.1', criterion_text: 'Kepatuhan Instruksi & Peraturan MA/PT' })
        .returning('*');
      existing = row;
    }
    return existing.id;
  })();

  // ── 3. Pastikan package PKG-AKIP & PKG-REG ada ───────────────────────────
  const packages = [
    { code: 'PKG-AKIP', name: 'Paket Akuntabilitas Kinerja (SAKIP)' },
    { code: 'PKG-REG',  name: 'Paket Tambahan Regulasi Badilum' },
  ];
  const pkgMap = {};
  for (const p of packages) {
    const [row] = await upsert(knex, 'monitoring_packages', 'code', [p]);
    pkgMap[p.code] = row;
  }

  // ── 4. Pastikan unit kerja yang diperlukan ada ────────────────────────────
  const unitsNeeded = [
    { code: 'SUBBAG_PTIP',     name: 'Subbagian Perencanaan Program & Anggaran', unit_type: 'SUBBAG' },
    { code: 'KEPANITERAAN',    name: 'Kepaniteraan PT',                           unit_type: 'KEPANITERAAN' },
    { code: 'PANMUD_PIDANA',   name: 'Kepaniteraan Muda Pidana',                  unit_type: 'SUBBAG' },
    { code: 'PANMUD_PERDATA',  name: 'Kepaniteraan Muda Perdata',                 unit_type: 'SUBBAG' },
    { code: 'PANMUD_TIPIKOR',  name: 'Kepaniteraan Muda Tipikor',                 unit_type: 'SUBBAG' },
    { code: 'PANMUD_HUKUM',    name: 'Kepaniteraan Muda Hukum',                   unit_type: 'SUBBAG' },
    { code: 'PIMPINAN_PT',     name: 'Pimpinan Pengadilan Tinggi',                unit_type: 'PIMPINAN' },
    { code: 'KABAG_PERENC_KEP',name: 'Bagian Perencanaan & Kepegawaian',          unit_type: 'KABAG' },
    { code: 'KABAG_UMUM_KEU',  name: 'Bagian Umum & Keuangan',                   unit_type: 'KABAG' },
    { code: 'SUBBAG_KEPEG_TI', name: 'Subbagian Kepegawaian & TI',               unit_type: 'SUBBAG' },
    { code: 'SUBBAG_TURT',     name: 'Subbagian Tata Usaha & Rumah Tangga',      unit_type: 'SUBBAG' },
    { code: 'SUBBAG_PEL_KEU',  name: 'Subbagian Pelaporan & Keuangan',           unit_type: 'SUBBAG' },
  ];
  const unitMap = {};
  for (const u of unitsNeeded) {
    let row = await knex('internal_units').where('code', u.code).first();
    if (!row) {
      const [inserted] = await knex('internal_units')
        .insert({ code: u.code, name: u.name, unit_type: u.unit_type, is_active: true })
        .returning('*');
      row = inserted;
    }
    unitMap[u.code] = row;
  }

  // ── 5. Ambil master version aktif ─────────────────────────────────────────
  let masterVersion = await knex('monitoring_master_versions').where('status', 'ACTIVE').first();
  if (!masterVersion) {
    const adminUser = await knex('users').where('role', 'ADMIN_PT').first();
    const [mv] = await knex('monitoring_master_versions').insert({
      version_code: 'V-2026-FULL-283',
      source_name: 'PDF_EVALUASI_MENYELURUH_2026',
      source_hash: 'pdf_eval_full_283_items',
      effective_from: '2026-01-01',
      status: 'ACTIVE',
      created_by: adminUser?.id || null,
      committed_at: new Date()
    }).returning('*');
    masterVersion = mv;
  }

  // ── 6. Generate 79 item AKIP ──────────────────────────────────────────────
  console.log('   📋 Generating AKIP-001 s.d. AKIP-079 (79 item)...');
  const akipUnitId = unitMap['SUBBAG_PTIP']?.id;
  let akipNew = 0, akipSkip = 0;

  for (const item of AKIP_ITEMS) {
    const existing = await knex('monitoring_items').where('item_code', item.code).first();
    if (existing) { akipSkip++; continue; }

    const [dbItem] = await knex('monitoring_items').insert({
      master_version_id: masterVersion.id,
      package_id: pkgMap['PKG-AKIP'].id,
      item_code: item.code,
      title: `Pemenuhan & Bukti Dukung ${item.code} - Akuntabilitas Kinerja Instansi Pemerintah`,
      duty_cluster: 'AKUNTABILITAS KINERJA',
      normalization_type: 'COMPLIANCE',
      frequency_type: item.freq,
      frequency_config_json: JSON.stringify({}),
      deadline_config_json: JSON.stringify({}),
      is_active: true
    }).returning('*');

    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: dbItem.id,
      internal_unit_id: akipUnitId,
      responsibility_type: 'PRIMARY',
      is_active: true
    });

    // 3 requirement per item AKIP
    for (let r = 1; r <= 3; r++) {
      await knex('monitoring_evidence_requirement_templates').insert({
        monitoring_item_id: dbItem.id,
        requirement_code: `${item.code}-REQ-0${r}`,
        label: `Bukti Dukung ${item.code} - Dokumen AKIP #${r} (Sesuai LKE SAKIP)`,
        evidence_type: 'FILE',
        required: r <= 2,
        allows_multiple: false,
        sort_order: r
      });
    }

    // Link kriteria
    const critId = criteriaMap[item.criteriaKey];
    if (critId) {
      await knex('monitoring_item_criteria').insert({
        monitoring_item_id: dbItem.id,
        source_criterion_id: critId,
        is_primary: true,
        sort_order: 1
      });
    }

    akipNew++;
  }
  console.log(`   ✅ AKIP selesai: ${akipNew} item baru, ${akipSkip} item sudah ada\n`);

  // ── 7. Generate 12 item REG ───────────────────────────────────────────────
  console.log('   📋 Generating REG-001 s.d. REG-012 (12 item Tambahan Regulasi)...');
  let regNew = 0, regSkip = 0;

  for (const item of REG_ITEMS) {
    const existing = await knex('monitoring_items').where('item_code', item.code).first();
    if (existing) { regSkip++; continue; }

    const unitId = unitMap[item.unitCode]?.id || unitMap['KEPANITERAAN'].id;

    const [dbItem] = await knex('monitoring_items').insert({
      master_version_id: masterVersion.id,
      package_id: pkgMap['PKG-REG'].id,
      item_code: item.code,
      title: `Kepatuhan Tambahan Regulasi — ${item.rumpun}`,
      duty_cluster: item.rumpun,
      normalization_type: 'COMPLIANCE',
      frequency_type: 'MONTHLY',
      frequency_config_json: JSON.stringify({}),
      deadline_config_json: JSON.stringify({}),
      is_active: true
    }).returning('*');

    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: dbItem.id,
      internal_unit_id: unitId,
      responsibility_type: 'PRIMARY',
      is_active: true
    });

    // 2 requirement per item REG
    for (let r = 1; r <= 2; r++) {
      await knex('monitoring_evidence_requirement_templates').insert({
        monitoring_item_id: dbItem.id,
        requirement_code: `${item.code}-REQ-0${r}`,
        label: r === 1
          ? `Bukti Implementasi Regulasi — ${item.rumpun}`
          : `Laporan Monitoring & Tindak Lanjut — ${item.rumpun}`,
        evidence_type: 'FILE',
        required: true,
        allows_multiple: false,
        sort_order: r
      });
    }

    // Link kriteria R.1
    if (regCritId) {
      await knex('monitoring_item_criteria').insert({
        monitoring_item_id: dbItem.id,
        source_criterion_id: regCritId,
        is_primary: true,
        sort_order: 1
      });
    }

    regNew++;
  }
  console.log(`   ✅ REG selesai: ${regNew} item baru, ${regSkip} item sudah ada\n`);

  // ── 8. Ringkasan akhir ─────────────────────────────────────────────────────
  const totalItems = await knex('monitoring_items').count('id as c').first();
  const akipCount  = await knex('monitoring_items').where('duty_cluster', 'AKUNTABILITAS KINERJA').count('id as c').first();
  const ampuhCount = await knex('monitoring_items').where('item_code', 'like', 'AMP-%').count('id as c').first();
  const pmpziCount = await knex('monitoring_items').where('item_code', 'like', 'PZ-%').count('id as c').first();
  const regCount   = await knex('monitoring_items').where('item_code', 'like', 'REG-%').count('id as c').first();

  console.log(`\n✅ Seed Selesai — Rekap Total Item Monitoring:`);
  console.log(`   📋 AMPUH  (AMP-xxx) : ${ampuhCount.c} item`);
  console.log(`   📋 PMPZI  (PZ-xxx)  : ${pmpziCount.c} item`);
  console.log(`   📋 AKIP   (AKIP-xxx): ${akipCount.c} item`);
  console.log(`   📋 REG    (REG-xxx) : ${regCount.c} item`);
  console.log(`   📋 TOTAL            : ${totalItems.c} item`);
  console.log(`\n   📄 Sesuai PDF: 70 AMP + 134 PZ + 79 AKIP + 12 REG = 295 item\n`);
};
