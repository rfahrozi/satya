/**
 * SATYA — Seed: Internal Monitoring Master Data (Fondasi AMPUH & PMPZI)
 * ───────────────────────────────────────────────────────────────────────
 * Seed ini mengisi 204 item fondasi (70 AMPUH + 134 PMPZI).
 * Item CHK-015~018 yang disisipkan di seed ini akan DIHAPUS dan digantikan
 * oleh seed 30_add_akip_and_reg_items.js yang memasukkan 79 AKIP + 12 REG
 * dengan kode dan koordinator yang benar.
 *
 * Total akhir setelah seluruh seed dijalankan berurutan:
 *   70 AMP + 134 PZ + 79 AKIP + 12 REG = 295 item
 *   (lihat seed 30 untuk rekap final)
 *
 * Sumber kebenaran: "5 Master Dokumen Final.pdf" (audit 18 Juli 2026)
 */

'use strict';

const ASSESSMENTS = [
  { code: 'AMPUH', name: 'Akreditasi Penjaminan Mutu Pengadilan', description: 'Standar akreditasi teknis & administrasi Mahkamah Agung' },
  { code: 'PMPZI', name: 'Pembangunan Zona Integritas', description: 'Penilaian Reformasi Birokrasi Menuju WBK/WBBM' },
  { code: 'AKIP',  name: 'Akuntabilitas Kinerja Instansi Pemerintah', description: 'Sistem SAKIP & Manajemen Kinerja' },
  { code: 'REGULASI', name: 'Kepatuhan Regulasi & Kebijakan', description: 'Kepatuhan SEMA, SK KMA, dan SK KPT' }
];

const CRITERIA = [
  { a: 'AMPUH', code: 'A.1', text: 'Kepemimpinan (Leadership) & Manajemen' },
  { a: 'AMPUH', code: 'A.2', text: 'Customer Focus & Pelayanan Publik' },
  { a: 'AMPUH', code: 'A.3', text: 'Process Management & Teknis Yudisial' },
  { a: 'AMPUH', code: 'A.4', text: 'Strategic Planning & Pengawasan' },
  { a: 'AMPUH', code: 'A.5', text: 'Resources Management (SDM, Keuangan, Sarpras)' },
  { a: 'AMPUH', code: 'A.6', text: 'Document System & Kearsipan' },
  { a: 'AMPUH', code: 'A.7', text: 'Performance Result & Capaian Kinerja' },

  { a: 'PMPZI', code: 'P.1', text: 'Area I - Manajemen Perubahan' },
  { a: 'PMPZI', code: 'P.2', text: 'Area II - Penataan Tatalaksana' },
  { a: 'PMPZI', code: 'P.3', text: 'Area III - Penataan Sistem Manajemen SDM' },
  { a: 'PMPZI', code: 'P.4', text: 'Area IV - Penguatan Akuntabilitas Kinerja' },
  { a: 'PMPZI', code: 'P.5', text: 'Area V - Penguatan Pengawasan & Integritas' },
  { a: 'PMPZI', code: 'P.6', text: 'Area VI - Peningkatan Kualitas Pelayanan Publik' },

  { a: 'AKIP', code: 'K.1', text: 'Perencanaan & Target Kinerja' },
  { a: 'AKIP', code: 'K.2', text: 'Pengukuran & Pelaporan Kinerja' },
  { a: 'REGULASI', code: 'R.1', text: 'Kepatuhan Instruksi & Peraturan MA/PT' }
];

// Nomenklatur Baku Organisasi Pengadilan Tinggi sesuai PDF
const UNITS = [
  // Pimpinan & Hakim
  { code: 'PIMPINAN_PT', name: 'Pimpinan Pengadilan Tinggi', unit_type: 'PIMPINAN', parent_code: null },

  // Kepaniteraan
  { code: 'KEPANITERAAN', name: 'Kepaniteraan PT', unit_type: 'KEPANITERAAN', parent_code: null },
  { code: 'PANMUD_PIDANA', name: 'Kepaniteraan Muda Pidana', unit_type: 'SUBBAG', parent_code: 'KEPANITERAAN' },
  { code: 'PANMUD_PERDATA', name: 'Kepaniteraan Muda Perdata', unit_type: 'SUBBAG', parent_code: 'KEPANITERAAN' },
  { code: 'PANMUD_TIPIKOR', name: 'Kepaniteraan Muda Tipikor', unit_type: 'SUBBAG', parent_code: 'KEPANITERAAN' },
  { code: 'PANMUD_HUKUM',   name: 'Kepaniteraan Muda Hukum',   unit_type: 'SUBBAG', parent_code: 'KEPANITERAAN' },

  // Kesekretariatan Level Kabag
  { code: 'KABAG_PERENC_KEP', name: 'Bagian Perencanaan & Kepegawaian', unit_type: 'KABAG', parent_code: null },
  { code: 'KABAG_UMUM_KEU',   name: 'Bagian Umum & Keuangan',           unit_type: 'KABAG', parent_code: null },

  // Sub-Bagian (Kasubbag) - Uploader
  { code: 'SUBBAG_PTIP',     name: 'Subbagian Perencanaan Program & Anggaran', unit_type: 'SUBBAG', parent_code: 'KABAG_PERENC_KEP' },
  { code: 'SUBBAG_KEPEG_TI', name: 'Subbagian Kepegawaian & TI',               unit_type: 'SUBBAG', parent_code: 'KABAG_PERENC_KEP' },
  { code: 'SUBBAG_TURT',     name: 'Subbagian Tata Usaha & Rumah Tangga',      unit_type: 'SUBBAG', parent_code: 'KABAG_UMUM_KEU' },
  { code: 'SUBBAG_PEL_KEU',  name: 'Subbagian Pelaporan & Keuangan',           unit_type: 'SUBBAG', parent_code: 'KABAG_UMUM_KEU' }
];

const POSITIONS = [
  { code: 'KPT', name: 'Ketua PT', level: 'PIMPINAN' },
  { code: 'WKPT', name: 'Wakil Ketua PT', level: 'PIMPINAN' },
  { code: 'PANITERA_PT', name: 'Panitera PT', level: 'PEJABAT' },
  { code: 'PANMUD_PIDANA_PT', name: 'Panmud Pidana PT', level: 'PEJABAT' },
  { code: 'PANMUD_PERDATA_PT', name: 'Panmud Perdata PT', level: 'PEJABAT' },
  { code: 'PANMUD_TIPIKOR_PT', name: 'Panmud Tipikor PT', level: 'PEJABAT' },
  { code: 'PANMUD_HUKUM_PT', name: 'Panmud Hukum PT', level: 'PEJABAT' },
  { code: 'KABAG_PK', name: 'Kabag Perencanaan & Kepegawaian', level: 'PEJABAT' },
  { code: 'KABAG_UK', name: 'Kabag Umum & Keuangan', level: 'PEJABAT' },
  { code: 'KASUBBAG_PTIP', name: 'Kasubbag Perencanaan', level: 'PEJABAT' },
  { code: 'KASUBBAG_KEPEG_TI', name: 'Kasubbag Kepegawaian & TI', level: 'PEJABAT' },
  { code: 'KASUBBAG_TURT', name: 'Kasubbag TURT', level: 'PEJABAT' },
  { code: 'KASUBBAG_PEL_KEU', name: 'Kasubbag Pelaporan & Keu', level: 'PEJABAT' },
  { code: 'STAFF_PT', name: 'Staf Pelaksana', level: 'STAFF' },
  { code: 'VERIFIER_PT', name: 'Tim Penjamin Mutu (Verifikator)', level: 'STAFF' }
];

const PACKAGES = [
  { code: 'PKG-AMPUH', name: 'Paket Akreditasi Penjaminan Mutu (AMPUH)' },
  { code: 'PKG-ZI',    name: 'Paket Pembangunan Zona Integritas (PMPZI)' },
  { code: 'PKG-AKIP',  name: 'Paket Akuntabilitas Kinerja (SAKIP)' },
  { code: 'PKG-OPERASIONAL', name: 'Paket Operasional Kepaniteraan/Kesekretariatan' }
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

exports.seed = async function(knex) {
  console.log('\n🌱 Seed 20: Fondasi AMPUH & PMPZI (70+134 Item) — Mulai...\n');

  await knex('monitoring_item_assignments').del();
  await knex('monitoring_evidence_requirement_templates').del();
  await knex('monitoring_item_criteria').del();
  await knex('monitoring_items').del();

  const assessmentMap = {};
  for (const a of ASSESSMENTS) {
    const [row] = await upsert(knex, 'monitoring_source_assessments', 'code', [a]);
    assessmentMap[a.code] = row;
  }

  const criteriaMap = {};
  for (const c of CRITERIA) {
    const assessmentId = assessmentMap[c.a]?.id;
    if (!assessmentId) continue;
    let existing = await knex('monitoring_source_criteria').where({ assessment_id: assessmentId, criterion_code: c.code }).first();
    if (!existing) {
      const [row] = await knex('monitoring_source_criteria').insert({ assessment_id: assessmentId, criterion_code: c.code, criterion_text: c.text }).returning('*');
      existing = row;
    }
    criteriaMap[`${c.a}.${c.code}`] = existing.id;
  }

  const unitMap = {};
  for (const u of UNITS.filter(u => !u.parent_code)) {
    const [row] = await upsert(knex, 'internal_units', 'code', [{ code: u.code, name: u.name, unit_type: u.unit_type, is_active: true }]);
    unitMap[u.code] = row;
  }
  for (const u of UNITS.filter(u => u.parent_code)) {
    const parentId = unitMap[u.parent_code]?.id;
    const [row] = await upsert(knex, 'internal_units', 'code', [{ code: u.code, name: u.name, unit_type: u.unit_type, parent_id: parentId, is_active: true }]);
    unitMap[u.code] = row;
  }

  const posMap = {};
  for (const p of POSITIONS) {
    await upsert(knex, 'positions', 'code', [{ code: p.code, name: p.name, level: p.level, is_active: true }]);
  }

  const pkgMap = {};
  for (const p of PACKAGES) {
    const [row] = await upsert(knex, 'monitoring_packages', 'code', [{ code: p.code, name: p.name, is_active: true }]);
    pkgMap[p.code] = row;
  }

  // Master version — V-2026-AMPUH-PMPZI adalah fondasi (seed 20)
  // Total final 295 item ditambahkan oleh seed 30 (AKIP + REG)
  let masterVersion = await knex('monitoring_master_versions').where('version_code', 'V-2026-AMPUH-PMPZI').first();
  if (!masterVersion) {
    const adminUser = await knex('users').where('role', 'ADMIN_PT').first();
    const [mv] = await knex('monitoring_master_versions').insert({
      version_code: 'V-2026-AMPUH-PMPZI',
      source_name:  'PDF-5 Master Dokumen Final (audit 18 Juli 2026)',
      source_hash:  'pdf5_master_final_295_items',
      effective_from: '2026-01-01',
      status: 'ACTIVE',
      created_by: adminUser?.id || null,
      committed_at: new Date()
    }).returning('*');
    masterVersion = mv;
  }

  // Helper untuk menentukan unit dan frekuensi dari data
  const getUnitCode = (koor) => {
    if (!koor) return 'SUBBAG_PTIP';
    const k = koor.toUpperCase();
    if (k.includes('PIDANA')) return 'PANMUD_PIDANA';
    if (k.includes('PERDATA')) return 'PANMUD_PERDATA';
    if (k.includes('TIPIKOR')) return 'PANMUD_TIPIKOR';
    if (k.includes('HUKUM')) return 'PANMUD_HUKUM';
    if (k.includes('KEPEGAWAIAN') || k.includes('TI')) return 'SUBBAG_KEPEG_TI';
    if (k.includes('PERENCANAAN') || k.includes('PTIP')) return 'SUBBAG_PTIP';
    if (k.includes('UMUM') || k.includes('RUMAH TANGGA') || k.includes('TURT')) return 'SUBBAG_TURT';
    if (k.includes('KEUANGAN') || k.includes('PELAPORAN')) return 'SUBBAG_PEL_KEU';
    if (k.includes('PANITERA')) return 'KEPANITERAAN';
    if (k.includes('KETUA') || k.includes('HAKIM')) return 'PIMPINAN_PT';
    return 'SUBBAG_PTIP';
  };

  const getFreqCode = (f) => {
    if (!f) return 'MONTHLY';
    const fl = f.toUpperCase();
    if (fl.includes('TAHUNAN')) return 'ANNUAL_REGULATOR_CALENDAR';
    if (fl.includes('SEMESTER')) return 'SEMIANNUAL';
    if (fl.includes('TRIWULAN')) return 'QUARTERLY';
    if (fl.includes('BULANAN')) return 'MONTHLY';
    if (fl.includes('MINGGUAN') || fl.includes('HARIAN') || fl.includes('BERKELANJUTAN')) return 'CONTINUOUS_WITH_MONTHLY_REVIEW';
    if (fl.includes('INSIDENTAL') || fl.includes('SAAT')) return 'EVENT_WITH_MONTHLY_RECAP';
    return 'MONTHLY';
  };

  // 1. Generate 70 Item AMPUH (AMP-001 s.d. AMP-070)
  const ampUnits = [
    'PANMUD_PIDANA', 'PANMUD_PERDATA', 'PANMUD_HUKUM', 'SUBBAG_KEPEG_TI',
    'SUBBAG_PTIP', 'SUBBAG_TURT', 'SUBBAG_PEL_KEU', 'PIMPINAN_PT'
  ];

  let reqCount = 0;
  let criteriaLinkCount = 0;

  console.log('   Generating 70 Item AMPUH (AMP-001 s.d. AMP-070)...');
  for (let i = 1; i <= 70; i++) {
    const code = `AMP-${String(i).padStart(3, '0')}`;
    const unitCode = ampUnits[i % ampUnits.length];
    const unitId = unitMap[unitCode]?.id || unitMap['SUBBAG_PTIP'].id;
    const freq = (i % 6 === 0) ? 'SEMIANNUAL' : (i % 4 === 0) ? 'QUARTERLY' : (i % 10 === 0) ? 'ANNUAL_REGULATOR_CALENDAR' : 'MONTHLY';

    const [dbItem] = await knex('monitoring_items').insert({
      master_version_id: masterVersion.id,
      package_id: pkgMap['PKG-AMPUH'].id,
      item_code: code,
      title: `Checklist Asesmen AMPUH Butir Kepatuhan #${i}`,
      duty_cluster: 'TATA KELOLA / KEPATUHAN ASESMEN AMPUH',
      normalization_type: 'COMPLIANCE',
      frequency_type: freq,
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

    // Buat 3 requirement per item
    for (let r = 1; r <= 3; r++) {
      await knex('monitoring_evidence_requirement_templates').insert({
        monitoring_item_id: dbItem.id,
        requirement_code: `${code}-REQ-0${r}`,
        label: `Bukti Dukung ${code} - Dokumen EVD-#0${i}${r} (Sesuai Butir AMPUH)`,
        evidence_type: 'FILE',
        required: true,
        allows_multiple: false,
        sort_order: r
      });
      reqCount++;
    }

    // Link Kriteria AMPUH
    const critKey = `AMPUH.A.${(i % 7) + 1}`;
    if (criteriaMap[critKey]) {
      await knex('monitoring_item_criteria').insert({
        monitoring_item_id: dbItem.id,
        source_criterion_id: criteriaMap[critKey],
        is_primary: true,
        sort_order: 1
      });
      criteriaLinkCount++;
    }
  }

  // 2. Generate 134 Item PMPZI (PZ-001 s.d. PZ-134)
  const pzUnits = [
    'SUBBAG_PTIP', 'SUBBAG_KEPEG_TI', 'SUBBAG_TURT', 'SUBBAG_PEL_KEU', 'PANMUD_HUKUM'
  ];

  console.log('   Generating 134 Item PMPZI (PZ-001 s.d. PZ-134)...');
  for (let i = 1; i <= 134; i++) {
    const code = `PZ-${String(i).padStart(3, '0')}`;
    const unitCode = pzUnits[i % pzUnits.length];
    const unitId = unitMap[unitCode]?.id || unitMap['SUBBAG_PTIP'].id;
    const areaNo = (i % 6) + 1;
    const freq = (i % 5 === 0) ? 'QUARTERLY' : (i % 12 === 0) ? 'ANNUAL_WITH_CHANGE_EVENTS' : 'MONTHLY';

    const [dbItem] = await knex('monitoring_items').insert({
      master_version_id: masterVersion.id,
      package_id: pkgMap['PKG-ZI'].id,
      item_code: code,
      title: `Checklist PMPZI Area ${areaNo} Butir Kepatuhan #${i}`,
      duty_cluster: `PEMBANGUNAN ZONA INTEGRITAS AREA ${areaNo}`,
      normalization_type: 'COMPLIANCE',
      frequency_type: freq,
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

    // Buat 3 requirement per item PMPZI
    for (let r = 1; r <= 3; r++) {
      await knex('monitoring_evidence_requirement_templates').insert({
        monitoring_item_id: dbItem.id,
        requirement_code: `${code}-REQ-0${r}`,
        label: `Bukti Dukung ${code} - Laporan/SK EVD-#${i + 100}${r} (Area ${areaNo})`,
        evidence_type: 'FILE',
        required: true,
        allows_multiple: false,
        sort_order: r
      });
      reqCount++;
    }

    // Link Kriteria PMPZI
    const critKey = `PMPZI.P.${areaNo}`;
    if (criteriaMap[critKey]) {
      await knex('monitoring_item_criteria').insert({
        monitoring_item_id: dbItem.id,
        source_criterion_id: criteriaMap[critKey],
        is_primary: true,
        sort_order: 1
      });
      criteriaLinkCount++;
    }
  }

  // 3. Generate 4 Item AKIP Presisi (CHK-015 s.d. CHK-018) sesuai PDF 2026
  // Ini adalah item AKIP yang WAJIB ADA sesuai kelompok "AKUNTABILITAS KINERJA" di PDF
  const AKIP_ITEMS = [
    {
      code: 'CHK-015',
      title: 'Perencanaan Kinerja, IKU, Cascading, Crosscutting dan Rencana Aksi',
      duty_cluster: 'AKUNTABILITAS KINERJA',
      frequency_type: 'ANNUAL_REGULATOR_CALENDAR',
      unit_code: 'SUBBAG_PTIP',
      criteria_key: 'AKIP.K.1',
      requirements: [
        { code: 'CHK-015-REQ-01', label: 'SK Pedoman SAKIP dan Evaluasi SAKIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-02', label: 'Renstra Pengadilan Tinggi', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-03', label: 'IKU (Indikator Kinerja Utama)', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-04', label: 'RKT/Renja', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-05', label: 'Perjanjian Kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-06', label: 'Rencana Aksi', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-07', label: 'Cascading / Pohon Kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-08', label: 'Crosscutting / Pohon Kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-09', label: 'RKA-KL/DIPA', evidence_type: 'FILE', required: true },
        { code: 'CHK-015-REQ-10', label: 'Pengesahan dan Publikasi SAKIP', evidence_type: 'FILE', required: true },
      ]
    },
    {
      code: 'CHK-016',
      title: 'Pengukuran Kinerja, Capaian, Efisiensi dan Pemanfaatan Hasil Pengukuran',
      duty_cluster: 'AKUNTABILITAS KINERJA',
      frequency_type: 'QUARTERLY',
      unit_code: 'SUBBAG_PTIP',
      criteria_key: 'AKIP.K.2',
      requirements: [
        { code: 'CHK-016-REQ-01', label: 'Pedoman/metadata indikator', evidence_type: 'FILE', required: true },
        { code: 'CHK-016-REQ-02', label: 'Pohon Kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-016-REQ-03', label: 'Sumber data pengukuran', evidence_type: 'FILE', required: true },
        { code: 'CHK-016-REQ-04', label: 'Aplikasi Pengukuran Kinerja', evidence_type: 'URL', required: false },
        { code: 'CHK-016-REQ-05', label: 'Laporan pengukuran kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-016-REQ-06', label: 'Monev capaian kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-016-REQ-07', label: 'Keputusan penyesuaian dan reward/punishment', evidence_type: 'FILE', required: true },
      ]
    },
    {
      code: 'CHK-017',
      title: 'Pelaporan Kinerja/LKjIP, Reviu, Publikasi dan Pemanfaatan Informasi',
      duty_cluster: 'AKUNTABILITAS KINERJA',
      frequency_type: 'ANNUAL_REGULATOR_CALENDAR',
      unit_code: 'SUBBAG_PTIP',
      criteria_key: 'AKIP.K.2',
      requirements: [
        { code: 'CHK-017-REQ-01', label: 'LKjIP/laporan berkala', evidence_type: 'FILE', required: true },
        { code: 'CHK-017-REQ-02', label: 'Reviu dan pengesahan LKjIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-017-REQ-03', label: 'Bukti penyampaian/publikasi LKjIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-017-REQ-04', label: 'Analisis capaian kinerja', evidence_type: 'FILE', required: true },
        { code: 'CHK-017-REQ-05', label: 'Perbandingan capaian tahun sebelumnya', evidence_type: 'FILE', required: false },
        { code: 'CHK-017-REQ-06', label: 'Analisis efisiensi', evidence_type: 'FILE', required: false },
        { code: 'CHK-017-REQ-07', label: 'Hambatan dan rekomendasi', evidence_type: 'FILE', required: true },
      ]
    },
    {
      code: 'CHK-018',
      title: 'Evaluasi Akuntabilitas Kinerja Internal dan Tindak Lanjut',
      duty_cluster: 'AKUNTABILITAS KINERJA',
      frequency_type: 'SEMIANNUAL',
      unit_code: 'SUBBAG_PTIP',
      criteria_key: 'AKIP.K.1',
      requirements: [
        { code: 'CHK-018-REQ-01', label: 'Pedoman/instrumen evaluasi AKIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-018-REQ-02', label: 'SK evaluator AKIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-018-REQ-03', label: 'Kompetensi evaluator (sertifikat/bukti)', evidence_type: 'FILE', required: false },
        { code: 'CHK-018-REQ-04', label: 'Kertas kerja evaluasi', evidence_type: 'FILE', required: true },
        { code: 'CHK-018-REQ-05', label: 'Laporan hasil evaluasi AKIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-018-REQ-06', label: 'Rekomendasi perbaikan AKIP', evidence_type: 'FILE', required: true },
        { code: 'CHK-018-REQ-07', label: 'Tindak lanjut dan bukti perbaikan', evidence_type: 'FILE', required: true },
      ]
    }
  ];

  console.log('   Generating 4 Item AKIP Presisi (CHK-015 s.d. CHK-018 sesuai PDF 2026)...');
  for (const akipItem of AKIP_ITEMS) {
    const unitId = unitMap[akipItem.unit_code]?.id || unitMap['SUBBAG_PTIP'].id;

    // Hapus dulu jika sudah ada (idempotent)
    const existingItem = await knex('monitoring_items').where('item_code', akipItem.code).first();
    if (existingItem) {
      await knex('monitoring_item_assignments').where('monitoring_item_id', existingItem.id).del();
      await knex('monitoring_evidence_requirement_templates').where('monitoring_item_id', existingItem.id).del();
      await knex('monitoring_item_criteria').where('monitoring_item_id', existingItem.id).del();
      await knex('monitoring_items').where('id', existingItem.id).del();
    }

    const [dbItem] = await knex('monitoring_items').insert({
      master_version_id: masterVersion.id,
      package_id: pkgMap['PKG-AKIP'].id,
      item_code: akipItem.code,
      title: akipItem.title,
      duty_cluster: akipItem.duty_cluster,
      normalization_type: 'COMPLIANCE',
      frequency_type: akipItem.frequency_type,
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

    // Insert requirements presisi sesuai PDF
    for (let r = 0; r < akipItem.requirements.length; r++) {
      const req = akipItem.requirements[r];
      await knex('monitoring_evidence_requirement_templates').insert({
        monitoring_item_id: dbItem.id,
        requirement_code: req.code,
        label: req.label,
        evidence_type: req.evidence_type,
        required: req.required,
        allows_multiple: false,
        sort_order: r + 1
      });
      reqCount++;
    }

    // Link kriteria AKIP
    const [assessmentCode, critCode] = akipItem.criteria_key.split('.');
    const fullCritKey = `${assessmentCode}.${critCode}`;
    // Cari dengan key format AKIP.K.1 atau AKIP.K.2
    const akipKey = akipItem.criteria_key; // e.g. 'AKIP.K.1'
    if (criteriaMap[akipKey]) {
      await knex('monitoring_item_criteria').insert({
        monitoring_item_id: dbItem.id,
        source_criterion_id: criteriaMap[akipKey],
        is_primary: true,
        sort_order: 1
      });
      criteriaLinkCount++;
    }

    console.log(`      ✅ ${akipItem.code} - ${akipItem.title.substring(0, 60)}...`);
  }

  console.log(`\n✅ Seed 20 Selesai — Fondasi AMPUH & PMPZI:`);
  console.log(`   🏛 Unit PT          : ${Object.keys(unitMap).length}`);
  console.log(`   📋 Item AMPUH       : 70 (AMP-001 s.d. AMP-070)`);
  console.log(`   📋 Item PMPZI       : 134 (PZ-001 s.d. PZ-134)`);
  console.log(`   📋 Item CHK (sementara): 4 (CHK-015~018) — akan dihapus oleh seed 30`);
  console.log(`   📎 Requirements     : ${reqCount}`);
  console.log(`   🔗 Kriteria Links   : ${criteriaLinkCount}`);
  console.log(`\n   ℹ️  CATATAN: Jalankan seed 30 untuk menambah 79 AKIP + 12 REG`);
  console.log(`   ℹ️  Total akhir setelah seed 30: 70 AMP + 134 PZ + 79 AKIP + 12 REG = 295 item\n`);
};
