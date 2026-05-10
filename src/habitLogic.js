import {
  FrequencyType,
  normalizeDate,
  datesAreEqual,
  isDateBefore,
  addDays,
  getWeekRange,
  isSameWeek
} from './models.js';

export function getCheckInDates(checkIns) {
  const dates = new Set();
  checkIns.forEach(c => {
    dates.add(normalizeDate(c.date).toISOString());
  });
  return Array.from(dates).map(d => new Date(d)).sort((a, b) => a - b);
}

export function isDayChecked(checkIns, date) {
  const targetDate = normalizeDate(date);
  return checkIns.some(c => datesAreEqual(c.date, targetDate));
}

export function getDailyCheckInCount(checkIns, date) {
  const targetDate = normalizeDate(date);
  return checkIns.filter(c => datesAreEqual(c.date, targetDate)).length;
}

export function getWeeklyCheckInCount(checkIns, date) {
  const { weekStart, weekEnd } = getWeekRange(date);
  let count = 0;
  const uniqueDates = new Set();
  
  checkIns.forEach(c => {
    const d = normalizeDate(c.date);
    if (d >= weekStart && d <= weekEnd) {
      const dateStr = d.toISOString();
      if (!uniqueDates.has(dateStr)) {
        uniqueDates.add(dateStr);
        count++;
      }
    }
  });
  
  return count;
}

export function isDailyGoalMet(habit, checkIns, date) {
  const required = habit.frequencyConfig.timesPerDay;
  const actual = getDailyCheckInCount(checkIns, date);
  return actual >= required;
}

export function isWeeklyGoalMet(habit, checkIns, date) {
  const required = habit.frequencyConfig.timesPerWeek;
  const actual = getWeeklyCheckInCount(checkIns, date);
  return actual >= required;
}

export function isIntervalGoalMet(habit, checkIns, date) {
  const intervalDays = habit.frequencyConfig.intervalDays;
  const checkInDates = getCheckInDates(checkIns);
  
  if (checkInDates.length === 0) return false;
  
  const targetDate = normalizeDate(date);
  
  for (const checkDate of checkInDates) {
    if (datesAreEqual(checkDate, targetDate)) {
      return true;
    }
  }
  
  return false;
}

export function isDateGoalMet(habit, checkIns, date) {
  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      return isDailyGoalMet(habit, checkIns, date);
    case FrequencyType.WEEKLY:
      return isWeeklyGoalMet(habit, checkIns, date);
    case FrequencyType.INTERVAL:
      return isIntervalGoalMet(habit, checkIns, date);
    default:
      return false;
  }
}

export function getNextDueDate(habit, checkIns, fromDate = new Date()) {
  const startDate = normalizeDate(fromDate);
  const checkInDates = getCheckInDates(checkIns);
  
  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      return startDate;
      
    case FrequencyType.WEEKLY: {
      const { weekStart, weekEnd } = getWeekRange(startDate);
      const weeklyCount = getWeeklyCheckInCount(checkIns, startDate);
      const required = habit.frequencyConfig.timesPerWeek;
      
      if (weeklyCount < required) {
        return startDate;
      }
      
      let nextWeekStart = addDays(weekStart, 7);
      while (nextWeekStart < startDate) {
        nextWeekStart = addDays(nextWeekStart, 7);
      }
      return nextWeekStart;
    }
      
    case FrequencyType.INTERVAL: {
      const intervalDays = habit.frequencyConfig.intervalDays;
      
      if (checkInDates.length === 0) {
        return startDate;
      }
      
      const lastCheckIn = checkInDates[checkInDates.length - 1];
      const nextDue = addDays(lastCheckIn, intervalDays);
      
      if (nextDue <= startDate) {
        return startDate;
      }
      
      return nextDue;
    }
      
    default:
      return startDate;
  }
}

export function canCheckInToday(habit, checkIns, today = new Date()) {
  const targetDate = normalizeDate(today);
  
  switch (habit.frequencyType) {
    case FrequencyType.DAILY: {
      const required = habit.frequencyConfig.timesPerDay;
      const actual = getDailyCheckInCount(checkIns, targetDate);
      return actual < required;
    }
      
    case FrequencyType.WEEKLY: {
      const required = habit.frequencyConfig.timesPerWeek;
      const actual = getWeeklyCheckInCount(checkIns, targetDate);
      return actual < required;
    }
      
    case FrequencyType.INTERVAL: {
      const nextDue = getNextDueDate(habit, checkIns, targetDate);
      return datesAreEqual(nextDue, targetDate) || isDateBefore(nextDue, targetDate);
    }
      
    default:
      return false;
  }
}

export function calculateIntervalStreak(habit, checkIns, today = new Date()) {
  const intervalDays = habit.frequencyConfig.intervalDays;
  const checkInDates = getCheckInDates(checkIns);
  
  if (checkInDates.length === 0) return 0;
  
  const todayNormalized = normalizeDate(today);
  const checkInSet = new Set(checkInDates.map(d => d.getTime()));
  
  let lastCheckInIndex = -1;
  for (let i = checkInDates.length - 1; i >= 0; i--) {
    if (checkInDates[i] <= todayNormalized) {
      lastCheckInIndex = i;
      break;
    }
  }
  
  if (lastCheckInIndex === -1) return 0;
  
  const lastCheckIn = checkInDates[lastCheckInIndex];
  const nextDueFromLast = addDays(lastCheckIn, intervalDays);
  
  if (todayNormalized < nextDueFromLast || datesAreEqual(todayNormalized, lastCheckIn)) {
    let streak = 1;
    let expectedPrevDate = addDays(lastCheckIn, -intervalDays);
    
    while (true) {
      if (checkInSet.has(expectedPrevDate.getTime())) {
        streak++;
        expectedPrevDate = addDays(expectedPrevDate, -intervalDays);
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  return 0;
}

export function calculateIntervalLongestStreak(habit, checkIns) {
  const intervalDays = habit.frequencyConfig.intervalDays;
  const checkInDates = getCheckInDates(checkIns);
  
  if (checkInDates.length === 0) return 0;
  if (checkInDates.length === 1) return 1;
  
  const checkInSet = new Set(checkInDates.map(d => d.getTime()));
  let longestStreak = 1;
  
  for (let i = checkInDates.length - 1; i >= 0; i--) {
    let currentStreak = 1;
    let expectedPrevDate = addDays(checkInDates[i], -intervalDays);
    
    while (checkInSet.has(expectedPrevDate.getTime())) {
      currentStreak++;
      expectedPrevDate = addDays(expectedPrevDate, -intervalDays);
    }
    
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
    
    if (longestStreak >= i + 1) {
      break;
    }
  }
  
  return longestStreak;
}

export function calculateStreak(habit, checkIns, today = new Date()) {
  const checkInDates = getCheckInDates(checkIns);
  if (checkInDates.length === 0) return 0;
  
  if (habit.frequencyType === FrequencyType.INTERVAL) {
    return calculateIntervalStreak(habit, checkIns, today);
  }
  
  const todayNormalized = normalizeDate(today);
  let streak = 0;
  let currentDate = todayNormalized;
  
  while (true) {
    const hasGoalMet = isDateGoalMet(habit, checkIns, currentDate);
    
    if (hasGoalMet) {
      streak++;
      currentDate = addDays(currentDate, -1);
    } else if (datesAreEqual(currentDate, todayNormalized)) {
      currentDate = addDays(currentDate, -1);
    } else {
      break;
    }
  }
  
  return streak;
}

export function calculateLongestStreak(habit, checkIns) {
  const checkInDates = getCheckInDates(checkIns);
  if (checkInDates.length === 0) return 0;
  
  if (habit.frequencyType === FrequencyType.INTERVAL) {
    return calculateIntervalLongestStreak(habit, checkIns);
  }
  
  let longestStreak = 0;
  let currentStreak = 0;
  
  const startDate = checkInDates[0];
  const endDate = checkInDates[checkInDates.length - 1];
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const hasGoalMet = isDateGoalMet(habit, checkIns, currentDate);
    
    if (hasGoalMet) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return longestStreak;
}

export function getCalendarData(habit, checkIns, year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  
  const calendarDays = [];
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      hasCheckIn: isDateGoalMet(habit, checkIns, date),
      checkInCount: getDailyCheckInCount(checkIns, date)
    });
  }
  
  const today = normalizeDate(new Date());
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday: datesAreEqual(date, today),
      hasCheckIn: isDateGoalMet(habit, checkIns, date),
      checkInCount: getDailyCheckInCount(checkIns, date)
    });
  }
  
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      hasCheckIn: isDateGoalMet(habit, checkIns, date),
      checkInCount: getDailyCheckInCount(checkIns, date)
    });
  }
  
  return calendarDays;
}

export function getStatistics(habit, checkIns) {
  const checkInDates = getCheckInDates(checkIns);
  const totalCheckIns = checkIns.length;
  const totalDays = checkInDates.length;
  const currentStreak = calculateStreak(habit, checkIns);
  const longestStreak = calculateLongestStreak(habit, checkIns);
  
  return {
    totalCheckIns,
    totalDays,
    currentStreak,
    longestStreak
  };
}
