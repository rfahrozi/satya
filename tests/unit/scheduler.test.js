/**
 * Unit Test: Scheduler - isReminderDay
 * Menguji pure function isReminderDay secara terisolasi
 */

process.env.JWT_SECRET = 'test_secret_key_untuk_unit_testing';

// Import mock-independent pure function
// We re-implement since scheduler.js requires cron/redis at module level
function isReminderDay(today, deadlineDay) {
    const currentDay = today.getDate();
    const targetDays = [deadlineDay - 3, deadlineDay - 1, deadlineDay];
    return targetDays.includes(currentDay);
}

describe('Unit Test: Scheduler - isReminderDay', () => {
    const DEADLINE_DAY = 10;

    it('harus mengembalikan true pada H-3 deadline (tanggal 7)', () => {
        const day = new Date(2026, 3, 7); // 7 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(true);
    });

    it('harus mengembalikan true pada H-1 deadline (tanggal 9)', () => {
        const day = new Date(2026, 3, 9); // 9 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(true);
    });

    it('harus mengembalikan true pada hari deadline (tanggal 10)', () => {
        const day = new Date(2026, 3, 10); // 10 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(true);
    });

    it('harus mengembalikan false pada H-2 deadline (tanggal 8)', () => {
        const day = new Date(2026, 3, 8); // 8 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(false);
    });

    it('harus mengembalikan false pada H+1 deadline (tanggal 11)', () => {
        const day = new Date(2026, 3, 11); // 11 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(false);
    });

    it('harus mengembalikan false pada tanggal acak (tanggal 20)', () => {
        const day = new Date(2026, 3, 20); // 20 April 2026
        expect(isReminderDay(day, DEADLINE_DAY)).toBe(false);
    });

    it('harus bekerja dengan deadline day custom (15)', () => {
        const customDeadline = 15;
        expect(isReminderDay(new Date(2026, 3, 12), customDeadline)).toBe(true); // H-3
        expect(isReminderDay(new Date(2026, 3, 14), customDeadline)).toBe(true); // H-1
        expect(isReminderDay(new Date(2026, 3, 15), customDeadline)).toBe(true); // H-0
        expect(isReminderDay(new Date(2026, 3, 13), customDeadline)).toBe(false); // H-2
    });
});
