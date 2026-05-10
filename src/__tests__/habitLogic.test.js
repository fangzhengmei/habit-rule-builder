import {
  createHabit,
  createCheckIn,
  FrequencyType,
  normalizeDate,
  addDays,
  datesAreEqual,
  validatePositiveInteger,
  validateIntervalDays,
  validateTimesPerDay,
  validateTimesPerWeek,
  normalizeHabitConfig
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

describe('Validation Functions - Boundary Cases', () => {
  describe('validatePositiveInteger', () => {
    test('should return null for null', () => {
      expect(validatePositiveInteger(null)).toBeNull();
    });

    test('should return null for undefined', () => {
      expect(validatePositiveInteger(undefined)).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(validatePositiveInteger('')).toBeNull();
    });

    test('should return null for non-numeric string', () => {
      expect(validatePositiveInteger('abc')).toBeNull();
    });

    test('should return null for NaN', () => {
      expect(validatePositiveInteger(NaN)).toBeNull();
    });

    test('should return null for negative number', () => {
      expect(validatePositiveInteger(-1)).toBeNull();
      expect(validatePositiveInteger(-100)).toBeNull();
    });

    test('should return null for zero', () => {
      expect(validatePositiveInteger(0)).toBeNull();
    });

    test('should return null for non-integer numbers', () => {
      expect(validatePositiveInteger(1.5)).toBeNull();
      expect(validatePositiveInteger(2.99)).toBeNull();
      expect(validatePositiveInteger(3.0001)).toBeNull();
    });

    test('should return valid positive integer', () => {
      expect(validatePositiveInteger(1)).toBe(1);
      expect(validatePositiveInteger(2)).toBe(2);
      expect(validatePositiveInteger(100)).toBe(100);
    });

    test('should return null for numbers below min', () => {
      expect(validatePositiveInteger(0, 1)).toBeNull();
      expect(validatePositiveInteger(4, 5)).toBeNull();
    });

    test('should return null for numbers above max', () => {
      expect(validatePositiveInteger(10, 1, 5)).toBeNull();
    });

    test('should return value within valid range', () => {
      expect(validatePositiveInteger(5, 1, 10)).toBe(5);
      expect(validatePositiveInteger(1, 1, 10)).toBe(1);
      expect(validatePositiveInteger(10, 1, 10)).toBe(10);
    });
  });

  describe('validateIntervalDays', () => {
    test('should return null for 0', () => {
      expect(validateIntervalDays(0)).toBeNull();
    });

    test('should return null for negative numbers', () => {
      expect(validateIntervalDays(-1)).toBeNull();
      expect(validateIntervalDays(-5)).toBeNull();
    });

    test('should return null for non-integer', () => {
      expect(validateIntervalDays(1.5)).toBeNull();
      expect(validateIntervalDays(2.3)).toBeNull();
    });

    test('should return null for values > 365', () => {
      expect(validateIntervalDays(366)).toBeNull();
      expect(validateIntervalDays(1000)).toBeNull();
    });

    test('should return valid interval days (1-365)', () => {
      expect(validateIntervalDays(1)).toBe(1);
      expect(validateIntervalDays(2)).toBe(2);
      expect(validateIntervalDays(30)).toBe(30);
      expect(validateIntervalDays(365)).toBe(365);
    });
  });

  describe('validateTimesPerDay', () => {
    test('should return null for 0', () => {
      expect(validateTimesPerDay(0)).toBeNull();
    });

    test('should return null for negative numbers', () => {
      expect(validateTimesPerDay(-1)).toBeNull();
    });

    test('should return null for non-integer', () => {
      expect(validateTimesPerDay(1.5)).toBeNull();
    });

    test('should return valid times per day (>= 1)', () => {
      expect(validateTimesPerDay(1)).toBe(1);
      expect(validateTimesPerDay(3)).toBe(3);
      expect(validateTimesPerDay(10)).toBe(10);
    });
  });

  describe('validateTimesPerWeek', () => {
    test('should return null for 0', () => {
      expect(validateTimesPerWeek(0)).toBeNull();
    });

    test('should return null for negative numbers', () => {
      expect(validateTimesPerWeek(-1)).toBeNull();
    });

    test('should return null for non-integer', () => {
      expect(validateTimesPerWeek(1.5)).toBeNull();
    });

    test('should return null for values > 7', () => {
      expect(validateTimesPerWeek(8)).toBeNull();
      expect(validateTimesPerWeek(10)).toBeNull();
    });

    test('should return valid times per week (1-7)', () => {
      expect(validateTimesPerWeek(1)).toBe(1);
      expect(validateTimesPerWeek(3)).toBe(3);
      expect(validateTimesPerWeek(7)).toBe(7);
    });
  });
});

describe('createHabit - Boundary Cases for Frequency Config', () => {
  test('should use default intervalDays (2) when config is empty', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, {});
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is 0', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 0 });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is negative', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: -5 });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is non-integer', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 2.5 });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is > 365', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 500 });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is invalid string', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 'abc' });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is empty string', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: '' });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should use default intervalDays (2) when intervalDays is null', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: null });
    expect(habit.frequencyConfig.intervalDays).toBe(2);
  });

  test('should accept valid intervalDays (1)', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 1 });
    expect(habit.frequencyConfig.intervalDays).toBe(1);
  });

  test('should accept valid intervalDays (365)', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 365 });
    expect(habit.frequencyConfig.intervalDays).toBe(365);
  });

  test('should use default timesPerDay (1) when timesPerDay is 0', () => {
    const habit = createHabit('Test', FrequencyType.DAILY, { timesPerDay: 0 });
    expect(habit.frequencyConfig.timesPerDay).toBe(1);
  });

  test('should use default timesPerWeek (3) when timesPerWeek is 0', () => {
    const habit = createHabit('Test', FrequencyType.WEEKLY, { timesPerWeek: 0 });
    expect(habit.frequencyConfig.timesPerWeek).toBe(3);
  });

  test('should use default timesPerWeek (3) when timesPerWeek is 8', () => {
    const habit = createHabit('Test', FrequencyType.WEEKLY, { timesPerWeek: 8 });
    expect(habit.frequencyConfig.timesPerWeek).toBe(3);
  });

  test('should throw error for empty habit name', () => {
    expect(() => {
      createHabit('', FrequencyType.DAILY);
    }).toThrow('Habit name is required');
  });

  test('should throw error for whitespace-only habit name', () => {
    expect(() => {
      createHabit('   ', FrequencyType.DAILY);
    }).toThrow('Habit name is required');
  });

  test('should throw error for invalid frequency type', () => {
    expect(() => {
      createHabit('Test', 'invalid-type');
    }).toThrow('Invalid frequency type');
  });
});

describe('Habit Logic - Defensive Programming with Invalid Config', () => {
  test('should behave correctly when intervalDays is directly set to 0', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 2 });
    habit.frequencyConfig.intervalDays = 0;
    
    const today = new Date();
    const checkIns = [
      createMockCheckIn(habit.id, today),
      createMockCheckIn(habit.id, addDays(today, -2)),
      createMockCheckIn(habit.id, addDays(today, -4))
    ];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(calculateStreak(habit, checkIns, today)).toBeDefined();
    expect(typeof calculateStreak(habit, checkIns, today)).toBe('number');
  });

  test('should behave correctly when intervalDays is directly set to negative', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 2 });
    habit.frequencyConfig.intervalDays = -5;
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(calculateStreak(habit, checkIns, today)).toBeDefined();
    expect(typeof calculateStreak(habit, checkIns, today)).toBe('number');
  });

  test('should behave correctly when timesPerDay is directly set to 0', () => {
    const habit = createHabit('Test', FrequencyType.DAILY, { timesPerDay: 2 });
    habit.frequencyConfig.timesPerDay = 0;
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(isDailyGoalMet(habit, checkIns, today)).toBeDefined();
    expect(typeof isDailyGoalMet(habit, checkIns, today)).toBe('boolean');
  });

  test('should behave correctly when timesPerWeek is directly set to 0', () => {
    const habit = createHabit('Test', FrequencyType.WEEKLY, { timesPerWeek: 3 });
    habit.frequencyConfig.timesPerWeek = 0;
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(isWeeklyGoalMet(habit, checkIns, today)).toBeDefined();
    expect(typeof isWeeklyGoalMet(habit, checkIns, today)).toBe('boolean');
  });

  test('should behave correctly when frequencyConfig is missing', () => {
    const habit = {
      id: 'test',
      name: 'Test',
      frequencyType: FrequencyType.INTERVAL,
      frequencyConfig: undefined
    };
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(() => {
      canCheckInToday(habit, checkIns, today);
    }).not.toThrow();
    
    expect(() => {
      calculateStreak(habit, checkIns, today);
    }).not.toThrow();
  });

  test('should behave correctly when habit is null', () => {
    const today = new Date();
    const checkIns = [];
    
    expect(() => {
      canCheckInToday(null, checkIns, today);
    }).not.toThrow();
  });

  test('should handle string intervalDays gracefully', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 2 });
    habit.frequencyConfig.intervalDays = 'abc';
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(calculateStreak(habit, checkIns, today)).toBeGreaterThanOrEqual(0);
  });

  test('should handle float intervalDays gracefully', () => {
    const habit = createHabit('Test', FrequencyType.INTERVAL, { intervalDays: 2 });
    habit.frequencyConfig.intervalDays = 2.5;
    
    const today = new Date();
    const checkIns = [createMockCheckIn(habit.id, today)];
    
    expect(canCheckInToday(habit, checkIns, today)).toBeDefined();
    expect(calculateStreak(habit, checkIns, today)).toBeGreaterThanOrEqual(0);
  });
});

describe('normalizeHabitConfig - Config Normalization', () => {
  test('should return null for null habit', () => {
    expect(normalizeHabitConfig(null)).toBeNull();
  });

  test('should return null for undefined habit', () => {
    expect(normalizeHabitConfig(undefined)).toBeNull();
  });

  test('should normalize invalid frequencyType to DAILY', () => {
    const habit = {
      id: 'test',
      name: 'Test',
      frequencyType: 'invalid',
      frequencyConfig: { intervalDays: 3 }
    };
    
    const normalized = normalizeHabitConfig(habit);
    expect(normalized.frequencyType).toBe(FrequencyType.DAILY);
    expect(normalized.frequencyConfig.timesPerDay).toBe(1);
  });

  describe('Interval Habit Normalization', () => {
    test('should normalize intervalDays 0 to 2', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 0 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize negative intervalDays to 2', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: -5 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize non-integer intervalDays to 2', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 2.5 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize intervalDays > 365 to 2', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 500 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize string intervalDays to 2', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 'abc' }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize empty frequencyConfig to default', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: {}
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should normalize undefined frequencyConfig to default', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(2);
    });

    test('should keep valid intervalDays (1)', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 1 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(1);
    });

    test('should keep valid intervalDays (365)', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: { intervalDays: 365 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.intervalDays).toBe(365);
    });
  });

  describe('Daily Habit Normalization', () => {
    test('should normalize timesPerDay 0 to 1', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.DAILY,
        frequencyConfig: { timesPerDay: 0 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.timesPerDay).toBe(1);
    });

    test('should keep valid timesPerDay', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.DAILY,
        frequencyConfig: { timesPerDay: 5 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.timesPerDay).toBe(5);
    });
  });

  describe('Weekly Habit Normalization', () => {
    test('should normalize timesPerWeek 0 to 3', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.WEEKLY,
        frequencyConfig: { timesPerWeek: 0 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.timesPerWeek).toBe(3);
    });

    test('should normalize timesPerWeek 8 to 3', () => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.WEEKLY,
        frequencyConfig: { timesPerWeek: 8 }
      };
      
      const normalized = normalizeHabitConfig(habit);
      expect(normalized.frequencyConfig.timesPerWeek).toBe(3);
    });
  });
});

describe('Config Normalization Consistency - Edit/Save/Display/Calculate', () => {
  test('normalized intervalDays (2) should work correctly in streak calculation', () => {
    const rawHabit = {
      id: 'test-id',
      name: 'Test Interval',
      frequencyType: FrequencyType.INTERVAL,
      frequencyConfig: { intervalDays: 0 }
    };
    
    const normalized = normalizeHabitConfig(rawHabit);
    expect(normalized.frequencyConfig.intervalDays).toBe(2);
    
    const today = new Date();
    const checkIns = [
      createMockCheckIn('test-id', today),
      createMockCheckIn('test-id', addDays(today, -2)),
      createMockCheckIn('test-id', addDays(today, -4))
    ];
    
    const streak = calculateStreak(normalized, checkIns, today);
    expect(streak).toBe(3);
  });

  test('normalized config should make canCheckInToday behave predictably', () => {
    const rawHabit = {
      id: 'test-id',
      name: 'Test Interval',
      frequencyType: FrequencyType.INTERVAL,
      frequencyConfig: { intervalDays: -1 }
    };
    
    const normalized = normalizeHabitConfig(rawHabit);
    expect(normalized.frequencyConfig.intervalDays).toBe(2);
    
    const today = new Date();
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);
    
    let checkIns = [createMockCheckIn('test-id', yesterday)];
    expect(canCheckInToday(normalized, checkIns, today)).toBe(false);
    
    checkIns = [createMockCheckIn('test-id', twoDaysAgo)];
    expect(canCheckInToday(normalized, checkIns, today)).toBe(true);
  });

  test('displayed value should match calculation value after normalization', () => {
    const rawHabit = {
      id: 'test-id',
      name: 'Test',
      frequencyType: FrequencyType.INTERVAL,
      frequencyConfig: { intervalDays: 500 }
    };
    
    const normalized = normalizeHabitConfig(rawHabit);
    const displayedValue = normalized.frequencyConfig.intervalDays;
    
    const today = new Date();
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);
    
    const checkIns = [createMockCheckIn('test-id', twoDaysAgo)];
    const canCheckIn = canCheckInToday(normalized, checkIns, today);
    
    expect(displayedValue).toBe(2);
    expect(canCheckIn).toBe(true);
  });

  test('multiple invalid configs should all normalize to same default behavior', () => {
    const invalidConfigs = [
      { intervalDays: 0 },
      { intervalDays: -5 },
      { intervalDays: 2.5 },
      { intervalDays: 500 },
      { intervalDays: 'abc' },
      {},
      null
    ];
    
    const normalizedValues = invalidConfigs.map(config => {
      const habit = {
        id: 'test',
        name: 'Test',
        frequencyType: FrequencyType.INTERVAL,
        frequencyConfig: config
      };
      return normalizeHabitConfig(habit)?.frequencyConfig?.intervalDays;
    });
    
    normalizedValues.forEach(value => {
      expect(value).toBe(2);
    });
    
    normalizedValues.forEach((value, index) => {
      for (let i = index + 1; i < normalizedValues.length; i++) {
        expect(value).toBe(normalizedValues[i]);
      }
    });
  });

  test('normalization should not modify valid configs', () => {
    const habit = {
      id: 'test',
      name: 'Test',
      frequencyType: FrequencyType.INTERVAL,
      frequencyConfig: { intervalDays: 3 }
    };
    
    const normalized = normalizeHabitConfig(habit);
    expect(normalized.frequencyConfig.intervalDays).toBe(3);
    
    const today = new Date();
    const threeDaysAgo = addDays(today, -3);
    const checkIns = [createMockCheckIn('test', threeDaysAgo)];
    
    expect(canCheckInToday(normalized, checkIns, today)).toBe(true);
  });

  test('normalized daily habit should work correctly', () => {
    const rawHabit = {
      id: 'test-id',
      name: 'Test Daily',
      frequencyType: FrequencyType.DAILY,
      frequencyConfig: { timesPerDay: 0 }
    };
    
    const normalized = normalizeHabitConfig(rawHabit);
    expect(normalized.frequencyConfig.timesPerDay).toBe(1);
    
    const today = new Date();
    const checkIns = [createMockCheckIn('test-id', today)];
    
    expect(isDailyGoalMet(normalized, checkIns, today)).toBe(true);
    expect(canCheckInToday(normalized, checkIns, today)).toBe(false);
  });

  test('normalized weekly habit should work correctly', () => {
    const rawHabit = {
      id: 'test-id',
      name: 'Test Weekly',
      frequencyType: FrequencyType.WEEKLY,
      frequencyConfig: { timesPerWeek: 0 }
    };
    
    const normalized = normalizeHabitConfig(rawHabit);
    expect(normalized.frequencyConfig.timesPerWeek).toBe(3);
    
    const today = new Date();
    const checkIns = [
      createMockCheckIn('test-id', today),
      createMockCheckIn('test-id', today),
      createMockCheckIn('test-id', today)
    ];
    
    expect(isWeeklyGoalMet(normalized, checkIns, today)).toBe(true);
    expect(canCheckInToday(normalized, checkIns, today)).toBe(false);
  });
});
