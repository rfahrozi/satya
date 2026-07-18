const knex = require('../../src/config/knex');
const deadlineService = require('../../src/services/internalMonitoringDeadlineService');

describe('Internal Monitoring - Deadline Engine', () => {
  let calendarId;

  beforeAll(async () => {
    // Migrate test DB if not already
    await knex.migrate.latest();

    // Clean up
    await knex('business_holidays').del();
    await knex('business_calendars').del();

    const [cal] = await knex('business_calendars').insert({
      code: 'ID_NATIONAL',
      name: 'Indonesia National Calendar',
      timezone: 'Asia/Jakarta'
    }).returning('id');
    calendarId = cal.id;

    // Add holidays (e.g. Christmas, New Year)
    await knex('business_holidays').insert([
      { calendar_id: calendarId, holiday_date: '2026-12-25', description: 'Christmas' },
      { calendar_id: calendarId, holiday_date: '2027-01-01', description: 'New Year' }
    ]);
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('1. addWorkingDays - Skips weekends properly', async () => {
    // 2026-12-04 is Friday. Adding 1 working day should yield 2026-12-07 (Monday)
    const startDate = new Date('2026-12-04T00:00:00Z');
    const result = await deadlineService.addWorkingDays(startDate, 1, calendarId);
    expect(result.toISOString().split('T')[0]).toBe('2026-12-07');
  });

  it('2. addWorkingDays - Skips holidays', async () => {
    // 2026-12-24 is Thursday. Adding 1 working day should skip Dec 25 (Friday/Holiday), Dec 26, 27 (Weekend). Returns Dec 28 (Monday)
    const startDate = new Date('2026-12-24T00:00:00Z');
    const result = await deadlineService.addWorkingDays(startDate, 1, calendarId);
    expect(result.toISOString().split('T')[0]).toBe('2026-12-28');
  });

  it('3. addWorkingDays - Skips holiday and weekend across Year Rollover', async () => {
    // 2026-12-31 is Thursday. Adding 1 working day should skip Jan 1 (Friday/Holiday), Jan 2, 3 (Weekend). Returns Jan 4 (Monday)
    const startDate = new Date('2026-12-31T00:00:00Z');
    const result = await deadlineService.addWorkingDays(startDate, 1, calendarId);
    expect(result.toISOString().split('T')[0]).toBe('2027-01-04');
  });
});
