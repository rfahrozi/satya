const knex = require('../src/config/knex');
const generatorService = require('../src/services/internalMonitoringGeneratorService');

async function run() {
  console.log('🔄 Memulai proses Generate Target UAT...');

  try {
    // 0. Reset targets untuk UAT regeneration
    await knex('monitoring_target_activities').del();
    await knex('monitoring_target_assignees').del();
    await knex('monitoring_evidences').del();
    await knex('monitoring_targets').del();

    const admin = await knex('users').where('role', 'ADMIN_PT').first();
    if (!admin) throw new Error('Admin user tidak ditemukan!');

    // Panggil periode yang berstatus OPEN karena pada pembaruan arsitektur,
    // status Enum yang digunakan sistem telah disinkronisasi ke 'OPEN'
    let period = await knex('monitoring_periods').where('status', 'OPEN').orderBy('created_at', 'desc').first();

    if (!period) {
        throw new Error('Tidak ada periode berstatus OPEN ditemukan!');
    }

    console.log(`⚙️ Meng-generate ulang target untuk periode ID: ${period.id} (${period.name})...`);
    const result = await generatorService.generateTargets(period.id, admin);

    console.log(`✅ Generate Selesai!`);
    console.log(`   - Target Dibuat: ${result.created || result.length || 'Selesai'}`);

  } catch (err) {
    console.error('❌ Gagal menggenerate target:', err);
  } finally {
    knex.destroy();
  }
}

run();
