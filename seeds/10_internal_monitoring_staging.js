const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Prevent running in production or altering non-test data unless explicit
  // We'll proceed safely by ignoring duplicates on users.

  // 1. Setup UAT Users
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const uatUsers = [
    { username: 'uat_admin', email: 'uat_admin@satya.id', password_hash: passwordHash, role: 'ADMIN_PT', is_active: true },
    { username: 'uat_collector', email: 'uat_collector@satya.id', password_hash: passwordHash, role: 'PIC_UNIT', is_active: true },
    { username: 'uat_approver', email: 'uat_approver@satya.id', password_hash: passwordHash, role: 'PIMPINAN_PT', is_active: true },
    { username: 'uat_verifier', email: 'uat_verifier@satya.id', password_hash: passwordHash, role: 'ADMIN_PT', is_active: true },
    { username: 'uat_pimpinan', email: 'uat_pimpinan@satya.id', password_hash: passwordHash, role: 'PIMPINAN_PT', is_active: true }
  ];

  for (const u of uatUsers) {
    const existing = await knex('users').where('username', u.username).first();
    if (!existing) {
      await knex('users').insert(u);
    }
  }

  const getUserId = async (uname) => (await knex('users').where('username', uname).first()).id;
  
  const collectorId = await getUserId('uat_collector');
  const approverId = await getUserId('uat_approver');
  const verifierId = await getUserId('uat_verifier');
  const adminId = await getUserId('uat_admin');

  // 2. Setup Unit and Assignment
  let unit = await knex('internal_units').where('code', 'UAT_UNIT').first();
  if (!unit) {
    [unit] = await knex('internal_units').insert({
      code: 'UAT_UNIT',
      name: 'UAT Test Unit',
      unit_type: 'OTHER',
      is_active: true
    }).returning('*');
  }

  const existingAssign = await knex('internal_assignments').where('user_id', collectorId).andWhere('internal_unit_id', unit.id).first();
  if (!existingAssign) {
    await knex('internal_assignments').insert({
      user_id: collectorId,
      internal_unit_id: unit.id,
      role_scope: 'UNIT_PIC',
      is_primary: true
    });
  }

  // 3. Setup UAT Period & Target Baseline
  let period = await knex('monitoring_periods').where('name', 'Tahunan 2026').first();
  if (!period) {
    // Cek juga nama lama agar tidak duplikat jika seed dijalankan ulang
    period = await knex('monitoring_periods').where('name', 'UAT Period').first();
  }
  if (!period) {
    [period] = await knex('monitoring_periods').insert({
      name: 'Tahunan 2026',
      year: 2026,
      month: 12,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'OPEN',
      created_by: adminId,
      opened_at: new Date()
    }).returning('*');
  } else if (period.name === 'UAT Period') {
    // Rename periode lama jika masih pakai nama UAT
    await knex('monitoring_periods').where('id', period.id).update({
      name: 'Tahunan 2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31'
    });
    period.name = 'Tahunan 2026';
  }

  // Find some monitoring items
  let items = await knex('monitoring_items').limit(7);
  if (items.length < 7) {
    let pkg = await knex('monitoring_packages').first();
    if (!pkg) {
      [pkg] = await knex('monitoring_packages').insert({ code: 'PKG_UAT', name: 'UAT Package' }).returning('*');
    }
    const needed = 7 - items.length;
    for (let i=0; i<needed; i++) {
      await knex('monitoring_items').insert({
        package_id: pkg.id,
        item_code: `CHK-UAT-${Date.now()}-${i}`,
        title: `UAT Item ${i}`,
        frequency_type: 'MONTHLY'
      });
    }
    items = await knex('monitoring_items').limit(7);
  }

  // Ensure items are assigned to UAT_UNIT
  for (const item of items) {
    const existItemAssign = await knex('monitoring_item_assignments').where('monitoring_item_id', item.id).andWhere('internal_unit_id', unit.id).first();
    if (!existItemAssign) {
      await knex('monitoring_item_assignments').insert({
        monitoring_item_id: item.id,
        internal_unit_id: unit.id,
        responsibility_type: 'PRIMARY'
      });
    }
  }

  // 4. Create Targets (Simulating Generator Output)
  const scenarios = [
    { status: 'NOT_STARTED', offset: 5 }, // 1. On time
    { status: 'NOT_STARTED', offset: -5 }, // 2. Overdue
    { status: 'AWAITING_APPROVAL', offset: 5 }, // 3. Awaiting Approval
    { status: 'REVISION_REQUIRED', offset: 5 }, // 4. Revision Required
    { status: 'AWAITING_VERIFICATION', offset: 5 }, // 5. Awaiting Verification
    { status: 'VERIFIED', offset: 5 }, // 6. Verified
    { status: 'VERIFIED', offset: 5, openFollowUp: true } // 7. Open Follow Up
  ];

  for (let i = 0; i < 7; i++) {
    const scenario = scenarios[i];
    const item = items[i];
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + scenario.offset);
    
    const nk = `PT_INTERNAL:UAT:${item.id}:${period.id}:${i}`;
    
    const existingTarget = await knex('monitoring_targets').where('natural_key', nk).first();
    if (existingTarget) continue; // skip if already seeded

    const [target] = await knex('monitoring_targets').insert({
      period_id: period.id,
      monitoring_item_id: item.id,
      internal_unit_id: unit.id,
      due_date: dueDate.toISOString().split('T')[0],
      due_at: dueDate,
      status: scenario.status,
      natural_key: nk,
      revision_count: scenario.status === 'REVISION_REQUIRED' ? 1 : 0
    }).returning('*');

    // Assign actors
    await knex('monitoring_target_assignees').insert([
      { monitoring_target_id: target.id, user_id: collectorId, capability: 'COLLECTOR', is_primary: true },
      { monitoring_target_id: target.id, user_id: approverId, capability: 'APPROVER', is_primary: true },
      { monitoring_target_id: target.id, user_id: verifierId, capability: 'VERIFIER', is_primary: true }
    ]);

    if (scenario.openFollowUp) {
      await knex('monitoring_follow_ups').insert({
        monitoring_target_id: target.id,
        title: 'UAT Test Follow Up',
        description: 'Need to revise the submitted evidence format.',
        owner_user_id: collectorId,
        due_at: dueDate,
        status: 'OPEN',
        created_by: verifierId
      });
    }
  }

  console.log('UAT Staging Seed Completed Successfully.');
};
