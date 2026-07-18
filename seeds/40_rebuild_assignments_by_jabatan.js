'use strict';
/**
 * SATYA - Seed: 40_rebuild_assignments_by_jabatan.js
 *
 * PERBAIKAN TOTAL ASSIGNMENT BERDASARKAN PDF3:
 * "3.Master_Monitoring_Pengadilan_Tinggi_Sesuai Jabatan.pdf"
 *
 * PDF3 mendefinisikan 15 jabatan resmi beserta perannya per item.
 * Seed ini:
 * 1. Menambah unit/jabatan yang BELUM ADA (WAKIL_KETUA, HAKIM, PANITERA_PENGGANTI, SEKRETARIAT)
 * 2. MENGHAPUS semua assignment lama yang salah (pola round-robin)
 * 3. INSERT assignment baru berdasarkan Koordinator Proses per item dari PDF3
 *
 * Mapping Jabatan PDF3 -> unit_code sistem:
 *   KETUA                                    -> PIMPINAN_PT
 *   WAKIL KETUA                              -> WKPT           [BARU]
 *   HAKIM                                    -> HAKIM_TINGGI   [BARU]
 *   PANITERA                                 -> KEPANITERAAN
 *   PANITERA MUDA HUKUM                      -> PANMUD_HUKUM
 *   PANITERA MUDA PERDATA                    -> PANMUD_PERDATA
 *   PANITERA MUDA PIDANA                     -> PANMUD_PIDANA
 *   PANITERA PENGGANTI                       -> PANITERA_PENGGANTI [BARU]
 *   SEKRETARIS                               -> SEKRETARIAT    [BARU]
 *   KABAG PERENCANAAN DAN KEPEGAWAIAN        -> KABAG_PERENC_KEP
 *   KABAG UMUM DAN KEUANGAN                  -> KABAG_UMUM_KEU
 *   KASUBBAG TATA USAHA DAN RUMAH TANGGA     -> SUBBAG_TURT
 *   KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFO  -> SUBBAG_KEPEG_TI
 *   KASUBBAG KEUANGAN DAN PELAPORAN          -> SUBBAG_PEL_KEU
 *   KASUBBAG RENCANA PROGRAM DAN ANGGARAN    -> SUBBAG_PTIP
 */

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING KOORDINATOR PROSES (295 item — sesuai PDF-5 "Master Dokumen Final")
// Format: { 'ITEM-CODE': 'JABATAN_PDF3' }
// Sumber kebenaran: "5 Master Dokumen Final.pdf" (audit 18 Juli 2026)
// Verifikasi silang: "3.Master_Monitoring_Pengadilan_Tinggi_Sesuai Jabatan.pdf"
// ─────────────────────────────────────────────────────────────────────────────
const KOORDINATOR_MAP = {
  // ── AMPUH (AMP-001 s.d. AMP-070) ──────────────────────────────────────────
  'AMP-001': 'WAKIL KETUA',
  'AMP-002': 'WAKIL KETUA',
  'AMP-003': 'WAKIL KETUA',
  'AMP-004': 'HAKIM',
  'AMP-005': 'PANITERA MUDA PIDANA',
  'AMP-006': 'KETUA',
  'AMP-007': 'WAKIL KETUA',
  'AMP-008': 'HAKIM',
  'AMP-009': 'WAKIL KETUA',
  'AMP-010': 'WAKIL KETUA',
  'AMP-011': 'PANITERA MUDA PERDATA',
  'AMP-012': 'PANITERA MUDA HUKUM',
  'AMP-013': 'PANITERA MUDA HUKUM',
  'AMP-014': 'PANITERA MUDA PERDATA',
  'AMP-015': 'PANITERA MUDA PERDATA',
  'AMP-016': 'KETUA',
  'AMP-017': 'PANITERA PENGGANTI',
  'AMP-018': 'HAKIM',
  'AMP-019': 'PANITERA MUDA HUKUM',
  'AMP-020': 'WAKIL KETUA',
  'AMP-021': 'WAKIL KETUA',
  'AMP-022': 'WAKIL KETUA',
  'AMP-023': 'WAKIL KETUA',
  'AMP-024': 'KETUA',
  'AMP-025': 'PANITERA MUDA HUKUM',
  'AMP-026': 'PANITERA',
  'AMP-027': 'PANITERA MUDA HUKUM',
  'AMP-028': 'PANITERA MUDA HUKUM',
  'AMP-029': 'HAKIM',
  'AMP-030': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-031': 'PANITERA',
  'AMP-032': 'PANITERA MUDA HUKUM',
  'AMP-033': 'PANITERA',
  'AMP-034': 'KASUBBAG TATA USAHA DAN RUMAH TANGGA',
  'AMP-035': 'PANITERA',
  'AMP-036': 'PANITERA MUDA HUKUM',
  'AMP-037': 'PANITERA',
  'AMP-038': 'PANITERA MUDA HUKUM',
  'AMP-039': 'PANITERA MUDA HUKUM',
  'AMP-040': 'PANITERA',
  'AMP-041': 'PANITERA MUDA HUKUM',
  'AMP-042': 'WAKIL KETUA',
  'AMP-043': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-044': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-045': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-046': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-047': 'PANITERA',
  'AMP-048': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-049': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-050': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-051': 'KASUBBAG TATA USAHA DAN RUMAH TANGGA',
  'AMP-052': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-053': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-054': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-055': 'SEKRETARIS',
  'AMP-056': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-057': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-058': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-059': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-060': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-061': 'SEKRETARIS',
  'AMP-062': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-063': 'KASUBBAG TATA USAHA DAN RUMAH TANGGA',
  'AMP-064': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-065': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-066': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-067': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-068': 'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'AMP-069': 'KASUBBAG KEUANGAN DAN PELAPORAN',
  'AMP-070': 'KASUBBAG TATA USAHA DAN RUMAH TANGGA',

  // ── PMPZI (PZ-001 s.d. PZ-134) ─────────────────────────────────────────────
  'PZ-001':  'WAKIL KETUA', 'PZ-002':  'WAKIL KETUA', 'PZ-003':  'WAKIL KETUA',
  'PZ-004':  'WAKIL KETUA', 'PZ-005':  'WAKIL KETUA', 'PZ-006':  'WAKIL KETUA',
  'PZ-007':  'WAKIL KETUA', 'PZ-008':  'WAKIL KETUA', 'PZ-009':  'WAKIL KETUA',
  'PZ-010':  'WAKIL KETUA', 'PZ-011':  'WAKIL KETUA', 'PZ-012':  'WAKIL KETUA',
  'PZ-013':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-014':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-015':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-016':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-017':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-018':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-019':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-020':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-021':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-022':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-023':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-024':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-025':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-026':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-027':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-028':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-029':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-030':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-031':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-032':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-033':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-034':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-035':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-036':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-037':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-038':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-039':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-040':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-041':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-042':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-043':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-044':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-045':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-046':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-047':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-048':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-049':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-050':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-051':  'WAKIL KETUA', 'PZ-052':  'WAKIL KETUA', 'PZ-053':  'WAKIL KETUA',
  'PZ-054':  'WAKIL KETUA', 'PZ-055':  'WAKIL KETUA', 'PZ-056':  'WAKIL KETUA',
  'PZ-057':  'WAKIL KETUA', 'PZ-058':  'WAKIL KETUA', 'PZ-059':  'WAKIL KETUA',
  'PZ-060':  'WAKIL KETUA', 'PZ-061':  'WAKIL KETUA', 'PZ-062':  'WAKIL KETUA',
  'PZ-063':  'WAKIL KETUA', 'PZ-064':  'WAKIL KETUA', 'PZ-065':  'WAKIL KETUA',
  'PZ-066':  'WAKIL KETUA', 'PZ-067':  'WAKIL KETUA', 'PZ-068':  'WAKIL KETUA',
  'PZ-069':  'PANITERA',   'PZ-070':  'PANITERA',   'PZ-071':  'PANITERA',
  'PZ-072':  'PANITERA',   'PZ-073':  'PANITERA',   'PZ-074':  'PANITERA',
  'PZ-075':  'PANITERA',   'PZ-076':  'PANITERA',
  'PZ-077':  'KASUBBAG TATA USAHA DAN RUMAH TANGGA',
  'PZ-078':  'PANITERA',   'PZ-079':  'PANITERA',   'PZ-080':  'PANITERA',
  'PZ-081':  'PANITERA',   'PZ-082':  'PANITERA',   'PZ-083':  'PANITERA',
  'PZ-084':  'PANITERA',   'PZ-085':  'PANITERA',   'PZ-086':  'PANITERA',
  'PZ-087':  'PANITERA',
  'PZ-088':  'WAKIL KETUA', 'PZ-089':  'WAKIL KETUA', 'PZ-090':  'WAKIL KETUA',
  'PZ-091':  'WAKIL KETUA', 'PZ-092':  'WAKIL KETUA', 'PZ-093':  'WAKIL KETUA',
  'PZ-094':  'WAKIL KETUA', 'PZ-095':  'WAKIL KETUA',
  'PZ-096':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-097':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-098':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-099':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-100':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-101':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-102':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-103':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-104':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-105':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-106':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-107':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-108':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-109':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-110':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-111':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-112':  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI',
  'PZ-113':  'WAKIL KETUA', 'PZ-114':  'WAKIL KETUA', 'PZ-115':  'WAKIL KETUA',
  'PZ-116':  'WAKIL KETUA', 'PZ-117':  'WAKIL KETUA', 'PZ-118':  'WAKIL KETUA',
  'PZ-119':  'WAKIL KETUA', 'PZ-120':  'WAKIL KETUA', 'PZ-121':  'WAKIL KETUA',
  'PZ-122':  'WAKIL KETUA', 'PZ-123':  'WAKIL KETUA', 'PZ-124':  'WAKIL KETUA',
  'PZ-125':  'WAKIL KETUA', 'PZ-126':  'WAKIL KETUA', 'PZ-127':  'WAKIL KETUA',
  'PZ-128':  'WAKIL KETUA', 'PZ-129':  'WAKIL KETUA',
  'PZ-130':  'PANITERA',
  'PZ-131':  'PANITERA', 'PZ-132':  'PANITERA', 'PZ-133':  'PANITERA', 'PZ-134':  'PANITERA',

  // ── AKIP (AKIP-001 s.d. AKIP-079) ─────────────────────────────────────────
  // Koordinator AKIP = KETUA (sesuai PDF-5 "Master Dokumen Final", audit 18 Juli 2026)
  // KOREKSI: Sebelumnya KASUBBAG RENCANA PROGRAM DAN ANGGARAN (dari PDF-3),
  // dikoreksi ke KETUA berdasarkan PDF-5 yang merupakan dokumen final & definitif.
  ...Object.fromEntries(
    Array.from({ length: 79 }, (_, i) => [
      `AKIP-${String(i + 1).padStart(3, '0')}`,
      'KETUA'
    ])
  ),

  // ── Tambahan Regulasi (REG-001 s.d. REG-012) — sesuai PDF-5 ───────────────
  // KOREKSI berdasarkan PDF-5 "Master Dokumen Final" (audit 18 Juli 2026):
  //   REG-001: WAKIL KETUA (bukan KETUA)
  //   REG-002: WAKIL KETUA (bukan PANITERA)
  //   REG-008: KETUA (bukan PANITERA)
  //   REG-009: KETUA (bukan SEKRETARIS)
  //   REG-010: SEKRETARIS (bukan KABAG PERENCANAAN DAN KEPEGAWAIAN)
  'REG-001': 'WAKIL KETUA',
  'REG-002': 'WAKIL KETUA',
  'REG-003': 'PANITERA',
  'REG-004': 'PANITERA',
  'REG-005': 'PANITERA',
  'REG-006': 'PANITERA',
  'REG-007': 'PANITERA PENGGANTI',
  'REG-008': 'KETUA',
  'REG-009': 'KETUA',
  'REG-010': 'SEKRETARIS',
  'REG-011': 'KABAG UMUM DAN KEUANGAN',
  'REG-012': 'PANITERA',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING JABATAN PDF3 -> UNIT CODE SISTEM
// ─────────────────────────────────────────────────────────────────────────────
const JABATAN_TO_UNIT = {
  'KETUA':                                           'PIMPINAN_PT',
  'WAKIL KETUA':                                     'WKPT',
  'HAKIM':                                           'HAKIM_TINGGI',
  'PANITERA':                                        'KEPANITERAAN',
  'PANITERA MUDA HUKUM':                             'PANMUD_HUKUM',
  'PANITERA MUDA PERDATA':                           'PANMUD_PERDATA',
  'PANITERA MUDA PIDANA':                            'PANMUD_PIDANA',
  'PANITERA PENGGANTI':                              'PANITERA_PENGGANTI',
  'SEKRETARIS':                                      'SEKRETARIAT',
  'KABAG PERENCANAAN DAN KEPEGAWAIAN':               'KABAG_PERENC_KEP',
  'KABAG UMUM DAN KEUANGAN':                         'KABAG_UMUM_KEU',
  'KASUBBAG TATA USAHA DAN RUMAH TANGGA':            'SUBBAG_TURT',
  'KASUBBAG KEPEGAWAIAN DAN TEKNOLOGI INFORMASI':    'SUBBAG_KEPEG_TI',
  'KASUBBAG KEUANGAN DAN PELAPORAN':                 'SUBBAG_PEL_KEU',
  'KASUBBAG RENCANA PROGRAM DAN ANGGARAN':           'SUBBAG_PTIP',
};

// Unit baru yang perlu ditambahkan
const NEW_UNITS = [
  { code: 'WKPT',              name: 'Wakil Ketua Pengadilan Tinggi',     unit_type: 'PIMPINAN',    parent_code: null },
  { code: 'HAKIM_TINGGI',      name: 'Hakim Tinggi',                      unit_type: 'FUNGSIONAL',  parent_code: null },
  { code: 'PANITERA_PENGGANTI',name: 'Panitera Pengganti',                unit_type: 'FUNGSIONAL',  parent_code: 'KEPANITERAAN' },
  { code: 'SEKRETARIAT',       name: 'Sekretariat Pengadilan Tinggi',     unit_type: 'KESEKRETARIATAN', parent_code: null },
];

exports.seed = async function (knex) {
  console.log('\n🔧 Seed: Rebuild Assignment Berdasarkan PDF3 (Sesuai Jabatan)...\n');

  // ── Langkah 1: Tambah unit baru yang belum ada ─────────────────────────────
  console.log('   [1/5] Menambah unit jabatan baru...');
  const unitIdMap = {};

  // Seed unit baru
  for (const u of NEW_UNITS) {
    let existing = await knex('internal_units').where('code', u.code).first();
    if (!existing) {
      // Cari parent_id jika ada parent_code
      let parentId = null;
      if (u.parent_code) {
        const parent = await knex('internal_units').where('code', u.parent_code).first();
        parentId = parent?.id || null;
      }
      const [inserted] = await knex('internal_units').insert({
        code: u.code, name: u.name, unit_type: u.unit_type,
        parent_id: parentId, is_active: true
      }).returning('*');
      existing = inserted;
      console.log(`   ✅ Unit baru: ${u.code} (${u.name})`);
    }
    unitIdMap[u.code] = existing.id;
  }

  // Load semua unit yang sudah ada ke dalam map
  const allUnits = await knex('internal_units');
  for (const u of allUnits) {
    unitIdMap[u.code] = u.id;
  }

  // Validasi semua unit mapping tersedia
  const missingUnits = Object.values(JABATAN_TO_UNIT).filter(code => !unitIdMap[code]);
  if (missingUnits.length > 0) {
    console.error('   ❌ Unit code belum ada di DB:', missingUnits);
    throw new Error(`Unit tidak ditemukan: ${missingUnits.join(', ')}`);
  }
  console.log(`   ✅ Semua ${Object.keys(unitIdMap).length} unit tersedia\n`);

  // ── Langkah 2: Hapus SEMUA assignment lama ────────────────────────────────
  console.log('   [2/5] Menghapus assignment lama (round-robin)...');
  const deletedCount = await knex('monitoring_item_assignments').delete();
  console.log(`   ✅ Hapus ${deletedCount} assignment lama\n`);

  // ── Langkah 3: Insert assignment baru berdasarkan KOORDINATOR_MAP ──────────
  console.log('   [3/5] Insert assignment baru sesuai PDF3...');
  let insertedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const [itemCode, jabatan] of Object.entries(KOORDINATOR_MAP)) {
    // Cari item di DB
    const item = await knex('monitoring_items').where('item_code', itemCode).first();
    if (!item) {
      skippedCount++;
      continue;
    }

    // Cari unit code
    const unitCode = JABATAN_TO_UNIT[jabatan];
    if (!unitCode) {
      errors.push(`Jabatan tidak ada di mapping: ${jabatan} (${itemCode})`);
      continue;
    }
    const unitId = unitIdMap[unitCode];
    if (!unitId) {
      errors.push(`Unit ID tidak ditemukan: ${unitCode} untuk ${itemCode}`);
      continue;
    }

    // Insert assignment PRIMARY (Koordinator Proses)
    await knex('monitoring_item_assignments').insert({
      monitoring_item_id: item.id,
      internal_unit_id: unitId,
      responsibility_type: 'PRIMARY',
      is_active: true
    });
    insertedCount++;
  }

  console.log(`   ✅ Insert: ${insertedCount} assignment PRIMARY`);
  if (errors.length > 0) {
    console.log(`   ⚠️  Errors: ${errors.length}`);
    errors.forEach(e => console.log(`      - ${e}`));
  }
  if (skippedCount > 0) {
    console.log(`   ⚠️  Item tidak ditemukan di DB: ${skippedCount}`);
  }
  console.log('');

  // ── Langkah 4: Update duty_cluster pada monitoring_items ──────────────────
  console.log('   [4/5] Update duty_cluster berdasarkan Koordinator Proses...');

  // Mapping item_code prefix -> duty_cluster dari PDF3
  // AMP: rumpun dari KOORDINATOR_MAP via PDF2
  // PZ: semua REFORMASI BIROKRASI/ZONA INTEGRITAS
  // AKIP: AKUNTABILITAS KINERJA
  // REG: per item

  const ITEM_DUTY_CLUSTER = {
    // AMP - berdasarkan rumpun tupoksi PDF2/PDF3
    'AMP-001': 'PENGAWASAN DAN PEMBINAAN',       'AMP-002': 'PENGAWASAN DAN PEMBINAAN',
    'AMP-003': 'PENGAWASAN DAN INTEGRITAS',       'AMP-004': 'TEKNIS YUDISIAL',
    'AMP-005': 'ADMINISTRASI PERKARA PIDANA',     'AMP-006': 'KEPEMIMPINAN DAN TATA KELOLA',
    'AMP-007': 'PENGAWASAN DAN PEMBINAAN',        'AMP-008': 'TEKNIS YUDISIAL',
    'AMP-009': 'PENGAWASAN DAN PEMBINAAN',        'AMP-010': 'PENGAWASAN TEKNIS PERKARA',
    'AMP-011': 'ADMINISTRASI PERKARA PERDATA',    'AMP-012': 'DATA, ARSIP, INFORMASI DAN PENGADUAN',
    'AMP-013': 'ADMINISTRASI DAN DATA PERKARA',   'AMP-014': 'ADMINISTRASI PERKARA PERDATA',
    'AMP-015': 'ADMINISTRASI PERKARA PERDATA',    'AMP-016': 'ADMINISTRASI PERKARA',
    'AMP-017': 'PERSIDANGAN DAN MINUTASI',        'AMP-018': 'TEKNIS YUDISIAL',
    'AMP-019': 'DATA, ARSIP, INFORMASI DAN PENGADUAN', 'AMP-020': 'REFORMASI BIROKRASI/ZONA INTEGRITAS',
    'AMP-021': 'REFORMASI BIROKRASI/ZONA INTEGRITAS', 'AMP-022': 'REFORMASI BIROKRASI/ZONA INTEGRITAS',
    'AMP-023': 'REFORMASI BIROKRASI/ZONA INTEGRITAS', 'AMP-024': 'KEPEMIMPINAN DAN TATA KELOLA',
    'AMP-025': 'DATA, ARSIP, INFORMASI DAN PENGADUAN', 'AMP-026': 'PELAYANAN PERKARA/PTSP',
    'AMP-027': 'DATA, ARSIP, INFORMASI DAN PENGADUAN', 'AMP-028': 'DATA, ARSIP, INFORMASI DAN PENGADUAN',
    'AMP-029': 'TEKNIS YUDISIAL',                 'AMP-030': 'TATA KELOLA/KEPATUHAN',
    'AMP-031': 'TATA KELOLA/KEPATUHAN',           'AMP-032': 'ADMINISTRASI DAN DATA PERKARA',
    'AMP-033': 'PELAYANAN PERKARA/PTSP',          'AMP-034': 'PELAYANAN PERKARA/PTSP',
    'AMP-035': 'TATA KELOLA/KEPATUHAN',           'AMP-036': 'TATA KELOLA/KEPATUHAN',
    'AMP-037': 'ADMINISTRASI PERKARA',            'AMP-038': 'TATA KELOLA/KEPATUHAN',
    'AMP-039': 'DATA, ARSIP, INFORMASI DAN PENGADUAN', 'AMP-040': 'KEUANGAN PERKARA',
    'AMP-041': 'DATA, ARSIP, INFORMASI DAN PENGADUAN', 'AMP-042': 'PENGAWASAN TEKNIS PERKARA',
    'AMP-043': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-044': 'UMUM, KEUANGAN DAN BMN',
    'AMP-045': 'UMUM, KEUANGAN DAN BMN',          'AMP-046': 'UMUM, KEUANGAN DAN BMN',
    'AMP-047': 'KEUANGAN PERKARA',                'AMP-048': 'UMUM, KEUANGAN DAN BMN',
    'AMP-049': 'UMUM, KEUANGAN DAN BMN',          'AMP-050': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-051': 'PELAYANAN PERKARA/PTSP',          'AMP-052': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-053': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-054': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-055': 'AKUNTABILITAS KINERJA DAN MANAJEMEN', 'AMP-056': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-057': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-058': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-059': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-060': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-061': 'AKUNTABILITAS KINERJA DAN MANAJEMEN', 'AMP-062': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-063': 'TATA KELOLA/KEPATUHAN',           'AMP-064': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'AMP-065': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-066': 'TATA KELOLA/KEPATUHAN',
    'AMP-067': 'PERENCANAAN, SDM, ORGANISASI DAN TI', 'AMP-068': 'TATA KELOLA/KEPATUHAN',
    'AMP-069': 'UMUM, KEUANGAN DAN BMN',          'AMP-070': 'PENGAWASAN DAN PEMBINAAN',
    // REG
    'REG-001': 'PRIORITAS PERSIDANGAN DAN PELAYANAN',
    'REG-002': 'PENYELESAIAN PERKARA BANDING',
    'REG-003': 'ADMINISTRASI PERKARA PERDATA BANDING',
    'REG-004': 'ADMINISTRASI PERKARA PIDANA BANDING',
    'REG-005': 'ADMINISTRASI PERKARA KHUSUS/TIPIKOR',
    'REG-006': 'DATA, TRANSPARANSI, PENGADUAN DAN ARSIP',
    'REG-007': 'DUKUNGAN PERSIDANGAN DAN MINUTASI',
    'REG-008': 'PENGENDALIAN KEPANITERAAN',
    'REG-009': 'PENGENDALIAN KESEKRETARIATAN',
    'REG-010': 'PERENCANAAN, SDM, ORGANISASI DAN TI',
    'REG-011': 'UMUM, KEUANGAN DAN BMN',
    'REG-012': 'PELAYANAN TERPADU SATU PINTU',
  };

  let updatedCluster = 0;
  for (const [itemCode, cluster] of Object.entries(ITEM_DUTY_CLUSTER)) {
    const updated = await knex('monitoring_items').where('item_code', itemCode).update({ duty_cluster: cluster });
    if (updated) updatedCluster++;
  }
  // Update semua PZ ke REFORMASI BIROKRASI/ZONA INTEGRITAS
  const pzUpdated = await knex('monitoring_items').where('item_code', 'like', 'PZ-%').update({ duty_cluster: 'REFORMASI BIROKRASI/ZONA INTEGRITAS' });
  // Update semua AKIP ke AKUNTABILITAS KINERJA
  const akipUpdated = await knex('monitoring_items').where('item_code', 'like', 'AKIP-%').update({ duty_cluster: 'AKUNTABILITAS KINERJA' });

  console.log(`   ✅ Update duty_cluster: ${updatedCluster} AMP/REG, ${pzUpdated} PZ, ${akipUpdated} AKIP\n`);

  // ── Langkah 5: Verifikasi final ────────────────────────────────────────────
  console.log('   [5/5] Verifikasi hasil...');

  const assignmentByUnit = await knex('monitoring_item_assignments as mia')
    .join('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
    .select('iu.code', 'iu.name', knex.raw('COUNT(*) as total'))
    .groupBy('iu.id', 'iu.code', 'iu.name')
    .orderBy('iu.code');

  console.log('\n   📊 Distribusi item per unit (setelah rebuild):');
  for (const row of assignmentByUnit) {
    console.log(`      ${row.code.padEnd(22)} ${row.name.padEnd(45)} : ${row.total} item`);
  }

  const totalAssign = assignmentByUnit.reduce((s, r) => s + parseInt(r.total), 0);
  console.log(`\n   📋 Total assignment: ${totalAssign} (seharusnya 295)`);

  // Cek khusus SUBBAG_TURT
  const turtItems = await knex('monitoring_item_assignments as mia')
    .join('monitoring_items as mi', 'mia.monitoring_item_id', 'mi.id')
    .join('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
    .where('iu.code', 'SUBBAG_TURT')
    .select('mi.item_code')
    .orderBy('mi.item_code');

  console.log(`\n   🎯 SUBBAG_TURT (Kasubbag Tata Usaha & RT) — ${turtItems.length} item:`);
  console.log(`      ${turtItems.map(t => t.item_code).join(', ')}`);
  console.log(`\n   Expected: AMP-034, AMP-051, AMP-063, AMP-070, PZ-077`);

  console.log('\n✅ Rebuild assignment selesai!\n');
};
