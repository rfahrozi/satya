const cron = require('node-cron');
const knex = require('../config/knex');
const logger = require('../config/winston');
const emailService = require('../services/emailService');

async function sendWeeklyDigest() {
  logger.info('[Digest] Memulai pembuatan Weekly Digest Email...');
  try {
    const trx = await knex.transaction();
    try {
      // 1. Ambil semua target yang sedang IN_PROGRESS, NOT_STARTED, REVISION_REQUIRED
      const activeTargets = await trx('monitoring_targets as mt')
        .join('monitoring_items as mi', 'mi.id', 'mt.monitoring_item_id')
        .whereIn('mt.workflow_status', ['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED'])
        .select('mt.id', 'mt.workflow_status', 'mt.due_date', 'mi.item_code', 'mt.master_snapshot');

      if (activeTargets.length === 0) {
        logger.info('[Digest] Tidak ada target aktif, membatalkan digest.');
        await trx.commit();
        return;
      }

      // 2. Ambil user collector dari target-target aktif
      const assignees = await trx('monitoring_target_assignees as mta')
        .join('users as u', 'u.id', 'mta.user_id')
        .whereIn('mta.monitoring_target_id', activeTargets.map(t => t.id))
        .where('mta.capability', 'COLLECTOR')
        .where('u.is_active', true)
        .whereNotNull('u.email')
        .select('u.id', 'u.email', 'u.username', 'u.full_name', 'mta.monitoring_target_id');

      // 3. Kelompokkan target per user
      const userDigests = {};
      
      for (const a of assignees) {
        if (!userDigests[a.id]) {
          userDigests[a.id] = {
            email: a.email,
            name: a.full_name || a.username,
            overdue: [],
            upcoming: [],
            revision: []
          };
        }
        
        const t = activeTargets.find(x => x.id === a.monitoring_target_id);
        if (!t) continue;

        let title = t.item_code;
        try {
           const snap = typeof t.master_snapshot === 'string' ? JSON.parse(t.master_snapshot) : t.master_snapshot;
           if (snap && snap.title) title = \`\${t.item_code} - \${snap.title.substring(0, 50)}...\`;
        } catch(e) {}

        const now = new Date();
        const due = new Date(t.due_date);
        const isOverdue = due < now;
        
        // Klasifikasi
        if (t.workflow_status === 'REVISION_REQUIRED') {
           userDigests[a.id].revision.push({ title, due: t.due_date });
        } else if (isOverdue) {
           const daysLate = Math.floor((now - due) / (1000 * 60 * 60 * 24));
           userDigests[a.id].overdue.push({ title, daysLate });
        } else {
           const daysLeft = Math.floor((due - now) / (1000 * 60 * 60 * 24));
           // Hanya yang akan jatuh tempo dalam 14 hari
           if (daysLeft <= 14) {
              userDigests[a.id].upcoming.push({ title, daysLeft });
           }
        }
      }

      // 4. Kirim email untuk user yang punya item perlu di-notice
      let sentCount = 0;
      for (const userId in userDigests) {
         const digest = userDigests[userId];
         if (digest.overdue.length > 0 || digest.upcoming.length > 0 || digest.revision.length > 0) {
            await emailService.sendReminderEmail(digest.email, {
              nama: digest.name,
              periode: 'Laporan Rangkuman Status',
              namaLaporan: 'Rangkuman Weekly Checklist Internal',
              deadline: '-',
              pesanTambahan: \`Halo \${digest.name}, berikut adalah rangkuman tugas checklist SATYA Anda:\n
                - Membutuhkan Revisi: \${digest.revision.length} dokumen.
                - Terlambat (Overdue): \${digest.overdue.length} dokumen.
                - Mendekati Deadline (<14 hari): \${digest.upcoming.length} dokumen.
                
                Mohon segera kunjungi portal SATYA untuk menindaklanjutinya. Abaikan email individu sebelumnya jika Anda merasa terganggu.\`
            });
            sentCount++;
         }
      }

      await trx.commit();
      logger.info(\`[Digest] Selesai mengirim \${sentCount} Weekly Digest Email.\`);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    logger.error('[Digest] Gagal mengeksekusi Weekly Digest Scheduler:', err);
  }
}

function startWeeklyDigestScheduler() {
  if (process.env.PT_INTERNAL_MONITORING_ENABLED !== 'true') return;

  // Run setiap Senin jam 08:00 pagi
  cron.schedule('0 8 * * 1', () => {
    sendWeeklyDigest();
  });
}

module.exports = { startWeeklyDigestScheduler, sendWeeklyDigest };
