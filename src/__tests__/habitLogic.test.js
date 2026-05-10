import {
  createHabit,
  createCheckIn,
  FrequencyType,
  normalizeDate,
  addDays,
  datesAreEqual
} from '../models.js';

import {
  isDailyGoalMet,
  isWeeklyGoalMet,
  isIntervalGoalMet,
  isDateGoalMet,
  getDailyCheckInCount,
  getWeeklyCheckInCount,
  canCheckInToday,
  calculateStreak,
  calculateLongestStreak,
  getNextDueDate,
  getCheckInDates
} from '../habitLogic.js';

function createMockCheckIn(habitId, date) {
  return {
    id: 'test-id',
    habitId,
    date: normalizeDate(date).toISOString(),
    createdAt: new Date().toISOString()
  };
}

describe('Frequency Type Tests', () => {
  test('should create daily habit with default config', () => {
    const habit = createHabit('Test Daily', FrequencyType.DAILY);
    expect(habit.frequencyType).toBe(FrequencyType.DAILY);
    expect(habit.frequencyConfig.timesPerDay).toBe(1);
  });

  test('should create weekly habit with custom config', () => {
    const habit = createHabit('Test Weekly', FrequencyType.WEEKLY, { timesPerWeek: 4 });
    expect(habit.frequencyType).toBe(FrequencyType.WEEKLY);
    expect(habit.frequencyConfig.timesPerWeek).toBe(4);
  });

  test('should create interval habit with custom config', () => {
    const habit = createHabit('Test Interval', FrequencyType.INTERVAL, { intervalDays: 3 });
    expect(habit.frequencyType).toBe(FrequencyType.INTERVAL);
    expect(habit.frequencyConfig.intervalDays).toBe(3);
  });
});

describe('Daily Habit Logic', () => {
  const habit = createHabit('Daily Exercise', FrequencyType.DAILY, { timesPerDay: 1 });

  test('should not meet daily goal with no check-ins', () => {
    const today = new Date();
    expect(isDailyGoalMet(habit, [], today)).toBe(false);
  });

  test('should meet daily goal after one check-in', () => {
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    expect(isDailyGoalMet(habit, checkIns, today)).toBe(true);
  });

  test('should count daily check-ins correctly', () => {
    const today = new Date();
    const yesterday = addDays(today, -1);
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, yesterday)
    ];
    expect(getDailyCheckInCount(checkIns, today)).toBe(2);
    expect(getDailyCheckInCount(checkIns, yesterday)).toBe(1);
  });

  test('should not allow check-in when daily goal met', () => {
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    expect(canCheckInToday(habit, checkIns, today)).toBe(false);
  });

  test('should allow check-in when daily goal not met', () => {
    const today = new Date();
    expect(canCheckInToday(habit, [], today)).toBe(true);
  });

  test('should calculate 3-day streak correctly', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -1)),
      createMockCheckIn(habit.id, addDays(today, -2))
    ];
    expect(calculateStreak(habit, checkIns, today)).toBe(3);
  });

  test('should calculate streak that ends yesterday', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -1)),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -3))
    ];
    expect(calculateStreak(habit, checkIns, today)).toBe(3);
  });

  test('should calculate broken streak as 0', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -3))
    ];
    expect(calculateStreak(habit, checkIns, today)).toBe(0);
  });

  test('should calculate longest streak correctly', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -10)),
      createMockCheckIn(habit.id, addDays(today, -9)),
      createMockCheckIn(habit.id, addDays(today, -8)),
      createMockCheckIn(habit.id, addDays(today, -5)),
      createMockCheckIn(habit.id, addDays(today, -4)),
      createMockCheckIn(habit.id, addDays(today, -3)),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -1))
    ];
    expect(calculateLongestStreak(habit, checkIns)).toBe(5);
  });
});

describe('Weekly Habit Logic', () => {
  const habit = createHabit('Weekly Exercise', FrequencyType.WEEKLY, { timesPerWeek: 3 });

  test('should not meet weekly goal with no check-ins', () => {
    const today = new Date();
    expect(isWeeklyGoalMet(habit, [], today)).toBe(false);
  });

  test('should count weekly check-ins correctly', () => {
    const today = new Date();
    const thisWeek1 = addDays(today, -2);
    const thisWeek2 = addDays(today, -1);
    const lastWeek = addDays(today, -10);
    
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, thisWeek1),
      createMockCheckIn(habit.id, thisWeek2),
      createMockCheckIn(habit.id, lastWeek)
    ];
    
    expect(getWeeklyCheckInCount(checkIns, today)).toBe(3);
  });

  test('should meet weekly goal after 3 check-ins this week', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -1)),
      createMockCheckIn(habit.id, addDays(today, -2))
    ];
    expect(isWeeklyGoalMet(habit, checkIns, today)).toBe(true);
  });

  test('should not meet weekly goal with only 2 check-ins this week', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -1))
    ];
    expect(isWeeklyGoalMet(habit, checkIns, today)).toBe(false);
  });

  test('should allow check-in when weekly goal not met', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today)
    ];
    expect(canCheckInToday(habit, checkIns, today)).toBe(true);
  });

  test('should not allow check-in when weekly goal met', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -1)),
      createMockCheckIn(habit.id, addDays(today, -2))
    ];
    expect(canCheckInToday(habit, checkIns, today)).toBe(false);
  });

  test('should calculate weekly streak correctly', () => {
    const today = new Date();
    const checkIns = [];
    
    for (let i = 0; i < 21; i++) {
      checkIns.push(createMockCheckIn(habit.id, addDays(today, -i)));
    }
    
    expect(calculateStreak(habit, checkIns, today)).toBe(21);
  });
});

describe('Interval Habit Logic', () => {
  const habit = createHabit('Every Other Day', FrequencyType.INTERVAL, { intervalDays: 2 });

  test('should allow check-in on day 0', () => {
    const today = new Date();
    expect(canCheckInToday(habit, [], today)).toBe(true);
  });

  test('should not allow check-in on day 1 after check-in', () => {
    const today = new Date();
    const yesterday = addDays(today, -1);
    const checkIns = [createMockCheckIn(habit.id, yesterday)];
    expect(canCheckInToday(habit, checkIns, today)).toBe(false);
  });

  test('should allow check-in on day 2 after check-in', () => {
    const today = new Date();
    const twoDaysAgo = addDays(today, -2);
    const checkIns = [createMockCheckIn(habit.id, twoDaysAgo)];
    expect(canCheckInToday(habit, checkIns, today)).toBe(true);
  });

  test('should get next due date correctly', () => {
    const today = new Date();
    const twoDaysAgo = addDays(today, -2);
    const checkIns = [createMockCheckIn(habit.id, twoDaysAgo)];
    const nextDue = getNextDueDate(habit, checkIns, today);
    expect(datesAreEqual(nextDue, today)).toBe(true);
  });

  test('should calculate interval streak correctly - today checked in', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -4)),
      createMockCheckIn(habit.id, addDays(today, -6))
    ];
    
    expect(calculateStreak(habit, checkIns, today)).toBe(4);
  });

  test('should calculate interval streak correctly - yesterday checked in, today not yet due', () => {
    const today = new Date();
    const yesterday = addDays(today, -1);
    const checkIns = [
      createMockCheckIn(habit.id, yesterday),
      createMockCheckIn(habit.id, addDays(today, -3)),
      createMockCheckIn(habit.id, addDays(today, -5))
    ];
    
    expect(calculateStreak(habit, checkIns, today)).toBe(3);
  });

  test('should not count days between interval check-ins as part of streak - looking back from check-in day', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -1)),
      createMockCheckIn(habit.id, addDays(today, -3)),
      createMockCheckIn(habit.id, addDays(today, -5))
    ];
    
    const dayBeforeToday = addDays(today, -1);
    expect(calculateStreak(habit, checkIns, dayBeforeToday)).toBe(3);
  });

  test('interval streak should break when missing a check-in cycle', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -6)),
      createMockCheckIn(habit.id, addDays(today, -8))
    ];
    
    expect(calculateStreak(habit, checkIns, today)).toBe(2);
  });

  test('interval streak should be 0 when last check-in is too old', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -5)),
      createMockCheckIn(habit.id, addDays(today, -7)),
      createMockCheckIn(habit.id, addDays(today, -9))
    ];
    
    expect(calculateStreak(habit, checkIns, today)).toBe(0);
  });

  test('should calculate longest interval streak correctly', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, addDays(today, -10)),
      createMockCheckIn(habit.id, addDays(today, -8)),
      createMockCheckIn(habit.id, addDays(today, -6)),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, today)
    ];
    
    expect(calculateLongestStreak(habit, checkIns)).toBe(3);
  });

  test('should handle single check-in for interval habit', () => {
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(calculateStreak(habit, checkIns, today)).toBe(1);
    expect(calculateLongestStreak(habit, checkIns)).toBe(1);
  });

  test('should handle 3-day interval habit correctly', () => {
    const habit3Day = createHabit('Every 3 Days', FrequencyType.INTERVAL, { intervalDays: 3 });
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit3Day.id, today),
      createMockCheckIn(habit3Day.id, addDays(today, -3)),
      createMockCheckIn(habit3Day.id, addDays(today, -6)),
      createMockCheckIn(habit3Day.id, addDays(today, -9))
    ];
    
    expect(calculateStreak(habit3Day, checkIns, today)).toBe(4);
  });
});

describe('isDateGoalMet - Unified Goal Check', () => {
  const dailyHabit = createHabit('Daily', FrequencyType.DAILY, { timesPerDay: 1 });
  const weeklyHabit = createHabit('Weekly', FrequencyType.WEEKLY, { timesPerWeek: 3 });
  const intervalHabit = createHabit('Interval', FrequencyType.INTERVAL, { intervalDays: 2 });

  test('should correctly check daily goal', () => {
    const today = new Date();
    const checkIns = [createMockCheckIn(dailyHabit.id, today)];
    expect(isDateGoalMet(dailyHabit, checkIns, today)).toBe(true);
  });

  test('should correctly check weekly goal', () => {
    const today = new Date();
    const checkIns = [
      createMockCheckIn(weeklyHabit.id, today),
      createMockCheckIn(weeklyHabit.id, addDays(today, -1)),
      createMockCheckIn(weeklyHabit.id, addDays(today, -2))
    ];
    expect(isDateGoalMet(weeklyHabit, checkIns, today)).toBe(true);
  });

  test('should correctly check interval goal', () => {
    const today = new Date();
    const checkIns = [createMockCheckIn(intervalHabit.id, today)];
    expect(isDateGoalMet(intervalHabit, checkIns, today)).toBe(true);
  });
});

describe('Edge Cases', () => {
  test('should handle empty check-ins array', () => {
    const habit = createHabit('Test', FrequencyType.DAILY);
    expect(calculateStreak(habit, [])).toBe(0);
    expect(calculateLongestStreak(habit, [])).toBe(0);
  });

  test('should normalize dates correctly', () => {
    const date1 = new Date('2024-01-15T10:00:00');
    const date2 = new Date('2024-01-15T23:59:59');
    expect(datesAreEqual(date1, date2)).toBe(true);
  });

  test('should handle check-in on today with multiple times for daily habit', () => {
    const habit = createHabit('Multi daily', FrequencyType.DAILY, { timesPerDay: 2 });
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBe(true);
    expect(isDailyGoalMet(habit, checkIns, today)).toBe(false);
    
    checkIns.push(createMockCheckIn(habit.id, today));
    expect(isDailyGoalMet(habit, checkIns, today)).toBe(true);
    expect(canCheckInToday(habit, checkIns, today)).toBe(false);
  });
});
