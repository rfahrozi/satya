const knex = require('../src/config/knex');
const generatorService = require('../src/services/internalMonitoringGeneratorService');

async function run() {
  console.log('🔄 Memulai proses Generate Target...');

  try {
    // 0. Reset targets untuk UAT regeneration
    await knex('monitoring_target_activities').del();
    await knex('monitoring_target_assignees').del();
    await knex('monitoring_evidences').del();
    await knex('monitoring_targets').del();

    const admin = await knex('users').where('role', 'ADMIN_PT').first();
    if (!admin) throw new Error('Admin user tidak ditemukan!');

    let period = await knex('monitoring_periods').where('status', 'ACTIVE').first();

    console.log(`⚙️ Meng-generate ulang target untuk periode ID: ${period.id}...`);
    const result = await generatorService.generateTargets(period.id, admin);

    console.log(`✅ Generate Selesai!`);
    console.log(`   - Target Dibuat: ${result.created}`);

  } catch (err) {
    console.error('❌ Gagal menggenerate target:', err);
  } finally {
    knex.destroy();
  }
}

run();
