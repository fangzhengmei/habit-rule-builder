export const FrequencyType = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  INTERVAL: 'interval'
};

export function createHabit(name, frequencyType, frequencyConfig = {}) {
  const habit = {
    id: generateId(),
    name: name.trim(),
    frequencyType,
    frequencyConfig: validateFrequencyConfig(frequencyType, frequencyConfig),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return habit;
}

function validateFrequencyConfig(frequencyType, config) {
  switch (frequencyType) {
    case FrequencyType.DAILY:
      return { timesPerDay: config.timesPerDay || 1 };
    case FrequencyType.WEEKLY:
      return { timesPerWeek: config.timesPerWeek || 3 };
    case FrequencyType.INTERVAL:
      return { intervalDays: config.intervalDays || 2 };
    default:
      throw new Error(`Unknown frequency type: ${frequencyType}`);
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createCheckIn(habitId, date = new Date()) {
  return {
    id: generateId(),
    habitId,
    date: normalizeDate(date).toISOString(),
    createdAt: new Date().toISOString()
  };
}

export function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function datesAreEqual(date1, date2) {
  return normalizeDate(date1).getTime() === normalizeDate(date2).getTime();
}

export function isDateBefore(date1, date2) {
  return normalizeDate(date1).getTime() < normalizeDate(date2).getTime();
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekRange(date) {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = addDays(d, diffToMonday);
  const weekEnd = addDays(weekStart, 6);
  return { weekStart, weekEnd };
}

export function isSameWeek(date1, date2) {
  const range1 = getWeekRange(date1);
  const range2 = getWeekRange(date2);
  return datesAreEqual(range1.weekStart, range2.weekStart);
}
