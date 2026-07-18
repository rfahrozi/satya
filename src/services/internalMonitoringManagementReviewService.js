const knex = require('../config/knex');

class InternalMonitoringManagementReviewService {

  async createReview(reviewData, actorId) {
    const review = {
      review_code: `MR-${Date.now()}`,
      title: reviewData.title || 'Management Review',
      period_id: reviewData.period_id,
      scope_type: reviewData.scope_type,
      scope_json: JSON.stringify(reviewData.scope_json || {}),
      review_date: reviewData.review_date,
      chair_user_id: reviewData.chair_user_id,
      status: 'DRAFT',
      created_by: actorId
    };
    const [newReview] = await knex('monitoring_management_reviews').insert(review).returning('*');
    return newReview;
  }

  async buildReviewPack(reviewId, actorId) {
    const trx = await knex.transaction();
    try {
      const review = await trx('monitoring_management_reviews').where('id', reviewId).forUpdate().first();
      if (!review) throw new Error('Management Review not found');
      if (review.status !== 'DRAFT') throw new Error('Cannot build pack for non-DRAFT review');

      // Clear existing items
      await trx('monitoring_management_review_items').where('management_review_id', reviewId).delete();

      const itemsToInsert = [];

      // Find HIGH and CRITICAL risks
      const highRisks = await trx('monitoring_risks')
        .whereIn('risk_level', ['HIGH', 'CRITICAL'])
        .where('status', 'OPEN');
        
      for (const risk of highRisks) {
        itemsToInsert.push({
          management_review_id: reviewId,
          item_type: 'RISK',
          item_id: risk.id,
          decision: 'PENDING',
          decision_note: '',
          snapshot_json: JSON.stringify(risk)
        });
      }

      // Overdue Action Plans
      const overdueActions = await trx('monitoring_action_plans')
        .whereIn('status', ['DRAFT', 'IN_PROGRESS', 'INEFFECTIVE'])
        .where('due_at', '<', new Date());

      for (const action of overdueActions) {
        itemsToInsert.push({
          management_review_id: reviewId,
          item_type: 'ACTION_PLAN',
          item_id: action.id,
          decision: 'PENDING',
          decision_note: '',
          snapshot_json: JSON.stringify(action)
        });
      }

      if (itemsToInsert.length > 0) {
        await trx('monitoring_management_review_items').insert(itemsToInsert);
      }

      await trx.commit();
      return { message: 'Review pack built successfully', itemCount: itemsToInsert.length };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async addItem(reviewId, itemData) {
    const review = await knex('monitoring_management_reviews').where('id', reviewId).first();
    if (review.status === 'FINALIZED' || review.status === 'CANCELLED') {
      throw new Error('Cannot add item to a finalized or cancelled review');
    }

    const item = {
      management_review_id: reviewId,
      item_type: itemData.item_type,
      item_id: itemData.item_id,
      decision: itemData.decision || 'PENDING',
      decision_note: itemData.decision_note || '',
      assigned_to: itemData.assigned_to || null,
      due_at: itemData.due_at || null,
      snapshot_json: itemData.snapshot_json ? JSON.stringify(itemData.snapshot_json) : null
    };

    const [newItem] = await knex('monitoring_management_review_items').insert(item).returning('*');
    return newItem;
  }

  async updateReviewItemDecision(reviewId, itemId, payload, actorId) {
    const trx = await knex.transaction();
    try {
      const review = await trx('monitoring_management_reviews').where('id', reviewId).forUpdate().first();
      if (!review) throw new Error('Management Review not found');
      if (review.status === 'FINALIZED') throw new Error('Management Review is already finalized');

      const item = await trx('monitoring_management_review_items')
        .where({ id: itemId, management_review_id: reviewId }).first();
      if (!item) throw new Error('Item not found in this review');

      const [updated] = await trx('monitoring_management_review_items')
        .where('id', itemId)
        .update({
          decision: payload.decision,
          decision_note: payload.decision_note,
          assigned_to: payload.assigned_to || item.assigned_to,
          due_at: payload.due_at || item.due_at,
          updated_at: new Date()
        }).returning('*');

      await trx.commit();
      return updated;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async submitReview(reviewId, actorId, lockVersion) {
    const trx = await knex.transaction();
    try {
      const review = await trx('monitoring_management_reviews').where('id', reviewId).forUpdate().first();
      if (!review) throw new Error('Management Review not found');
      if (review.status !== 'DRAFT') throw new Error('Can only submit DRAFT review');
      if (review.lock_version !== lockVersion) throw new Error('Concurrent modification detected');

      const [submitted] = await trx('monitoring_management_reviews')
        .where('id', reviewId)
        .update({
          status: 'IN_REVIEW',
          lock_version: review.lock_version + 1,
          updated_at: new Date()
        }).returning('*');

      await trx.commit();
      return submitted;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async finalizeReview(reviewId, actorId, userRole, lockVersion) {
    const trx = await knex.transaction();
    try {
      const review = await trx('monitoring_management_reviews').where('id', reviewId).forUpdate().first();
      
      if (!review) throw new Error('Management Review not found');
      if (review.status === 'FINALIZED') throw new Error('Management Review is already finalized');
      // Ignore lock version check if not provided for backward compatibility
      if (lockVersion && review.lock_version !== lockVersion) throw new Error('Concurrent modification detected');

      // Authorization Check
      if (userRole !== 'PIMPINAN' && userRole !== 'ADMIN_PT') {
        throw new Error('Only PIMPINAN can finalize a Management Review');
      }

      // Execute decisions
      const items = await trx('monitoring_management_review_items').where('management_review_id', reviewId);
      for (const item of items) {
        await this.executeDecision(trx, item, actorId);
      }

      const [finalized] = await trx('monitoring_management_reviews')
        .where('id', reviewId)
        .update({
          status: 'FINALIZED',
          finalized_at: new Date(),
          finalized_by: actorId,
          lock_version: review.lock_version + 1,
          updated_at: new Date()
        }).returning('*');

      await trx.commit();
      return finalized;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async executeDecision(trx, item, actorId) {
    if (item.decision === 'PENDING') return;

    if (item.decision === 'REQUIRE_ACTION') {
      // Just mark item as completed, the actual action plan might be created separately or via an event
      await trx('monitoring_management_review_items').where('id', item.id).update({ status: 'COMPLETED' });
    } else if (item.decision === 'REQUEST_REASSESSMENT' && item.item_type === 'RISK') {
      await trx('monitoring_risks').where('id', item.item_id).update({ status: 'PENDING_REVIEW' });
      await trx('monitoring_management_review_items').where('id', item.id).update({ status: 'COMPLETED' });
    } else if (item.decision === 'REOPEN') {
      if (item.item_type === 'FINDING') {
        await trx('monitoring_findings').where('id', item.item_id).update({ status: 'OPEN', closed_at: null });
      } else if (item.item_type === 'ACTION_PLAN') {
        await trx('monitoring_action_plans').where('id', item.item_id).update({ status: 'IN_PROGRESS', completed_at: null });
      }
      await trx('monitoring_management_review_items').where('id', item.id).update({ status: 'COMPLETED' });
    } else if (item.decision === 'ACCEPT' && item.item_type === 'RISK') {
      // Create risk acceptance record if not already created
      // Normally, risk acceptance logic is handled in RiskService, but for MR decisions we can orchestrate it or just mark completed
      await trx('monitoring_management_review_items').where('id', item.id).update({ status: 'COMPLETED' });
    }
  }

  async amendReview(reviewId, reason, actorId) {
    const trx = await knex.transaction();
    try {
      const review = await trx('monitoring_management_reviews').where('id', reviewId).forUpdate().first();
      if (!review) throw new Error('Management Review not found');
      if (review.status !== 'FINALIZED') throw new Error('Only FINALIZED reviews can be amended');

      // Supersede the old review
      await trx('monitoring_management_reviews')
        .where('id', reviewId)
        .update({ status: 'SUPERSEDED' });

      // Create new amended review version
      const newReviewData = { ...review };
      delete newReviewData.id;
      newReviewData.status = 'DRAFT';
      newReviewData.version_no = review.version_no + 1;
      newReviewData.review_code = `${review.review_code}-V${newReviewData.version_no}`;
      newReviewData.supersedes_review_id = review.id;
      newReviewData.finalized_at = null;
      newReviewData.finalized_by = null;
      newReviewData.created_by = actorId;
      newReviewData.created_at = new Date();
      newReviewData.updated_at = new Date();
      
      const [newReview] = await trx('monitoring_management_reviews').insert(newReviewData).returning('*');

      // Copy items
      const items = await trx('monitoring_management_review_items').where('management_review_id', reviewId);
      for (const item of items) {
        const newItemData = { ...item };
        delete newItemData.id;
        newItemData.management_review_id = newReview.id;
        newItemData.status = 'OPEN';
        newItemData.created_at = new Date();
        newItemData.updated_at = new Date();
        await trx('monitoring_management_review_items').insert(newItemData);
      }

      await trx.commit();
      return newReview;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
}

module.exports = InternalMonitoringManagementReviewService;
