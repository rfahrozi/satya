const knex = require('../config/knex');

class InternalMonitoringDeadlineService {
  /**
   * Calculate due date based on frequency config, period, and calendar.
   */
  async calculateDueAt(frequencyType, config, periodId, itemId = null, trx = knex) {
    const period = await trx('monitoring_periods').where('id', periodId).first();
    if (!period) throw new Error('Period not found');

    const year = period.year;
    let dueDate = new Date(period.end_date);

    if (frequencyType === 'MONTHLY' || frequencyType === 'CONTINUOUS_WITH_MONTHLY_REVIEW' || frequencyType === 'EVENT_WITH_MONTHLY_RECAP') {
      const dueDay = config.dueDay || 5;
      dueDate = new Date(year, period.month, dueDay, 23, 59, 59); // Next month because period.month is 1-12
    } else if (frequencyType === 'QUARTERLY') {
      const dueDay = config.dueDay || 10;
      dueDate = new Date(year, period.month, dueDay, 23, 59, 59);
    } else if (frequencyType === 'SEMIANNUAL') {
      if (period.month === 6) {
        dueDate = new Date(year, 6, 15, 23, 59, 59); // July 15
      } else {
        dueDate = new Date(year + 1, 0, 15, 23, 59, 59); // Jan 15 next year
      }
    } else if (frequencyType === 'ANNUAL_WITH_CHANGE_EVENTS') {
      const dueMonth = config.annualDueMonth || 1;
      const dueDay = config.annualDueDay || 31;
      dueDate = new Date(year, dueMonth - 1, dueDay, 23, 59, 59);
    } else if (frequencyType === 'ANNUAL_REGULATOR_CALENDAR') {
      dueDate = await this.resolveRegulatorDeadline(itemId, year, trx);
      if (!dueDate) {
        // Fallback untuk UAT: Gunakan 31 Januari tahun berikutnya jika belum diset
        dueDate = new Date(year + 1, 0, 31, 23, 59, 59);
        console.warn(`[WARNING] Regulator deadline not configured for item ${itemId} in year ${year}. Using fallback: ${dueDate.toISOString()}`);
      }
    }

    return await this.resolveStricterDeadline(dueDate, itemId, year, trx);
  }

  async addWorkingDays(startDate, daysToAdd, calendarId = 1, trx = knex) {
    if (daysToAdd === 0) return startDate;
    
    const year = startDate.getFullYear();
    const holidaysQuery = await trx('business_holidays')
      .join('business_calendars', 'business_calendars.id', 'business_holidays.calendar_id')
      .where('business_calendars.year', year)
      .orWhere('business_calendars.id', calendarId)
      .pluck('holiday_date');

    const holidayDates = new Set(holidaysQuery.map(h => {
      if (typeof h === 'string') return h.split('T')[0];
      const d = new Date(h);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));

    let current = new Date(startDate.getTime());
    let added = 0;
    current.setUTCHours(0, 0, 0, 0);

    while (added < daysToAdd) {
      current.setUTCDate(current.getUTCDate() + 1);
      const dayOfWeek = current.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dateString = current.toISOString().split('T')[0];
      const isHoliday = holidayDates.has(dateString);

      if (!isWeekend && !isHoliday) {
        added++;
      }
    }
    
    // Preserve original time if needed, but usually we just want EOD 23:59:59
    current.setUTCHours(23, 59, 59, 999);
    return current;
  }

  async resolveRegulatorDeadline(itemId, year, trx = knex) {
    if (!itemId) return null;
    const regulator = await trx('regulator_deadline_calendars').where({ monitoring_item_id: itemId, year }).first();
    if (!regulator) return null;
    return new Date(regulator.deadline_date);
  }

  async resolveStricterDeadline(calculatedDate, itemId, year, trx = knex) {
    if (!itemId) return calculatedDate;
    
    const override = await trx('monitoring_deadline_overrides')
      .where({ entity_type: 'ITEM', entity_id: itemId })
      .andWhere('override_due_at', '>=', new Date())
      .orderBy('override_due_at', 'asc')
      .first();

    let finalDate = calculatedDate;

    if (override && new Date(override.override_due_at) < calculatedDate) {
      finalDate = new Date(override.override_due_at);
    }

    const regulatorDate = await this.resolveRegulatorDeadline(itemId, year, trx);
    if (regulatorDate && regulatorDate < finalDate) {
      finalDate = regulatorDate;
    }

    return finalDate;
  }
}

module.exports = new InternalMonitoringDeadlineService();
