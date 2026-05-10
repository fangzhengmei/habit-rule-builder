export const FrequencyType = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  INTERVAL: 'interval'
};

export const DEFAULT_CONFIG = {
  [FrequencyType.DAILY]: { timesPerDay: 1 },
  [FrequencyType.WEEKLY]: { timesPerWeek: 3 },
  [FrequencyType.INTERVAL]: { intervalDays: 2 }
};

export const VALIDATION_RULES = {
  [FrequencyType.DAILY]: {
    timesPerDay: {
      min: 1,
      max: Infinity,
      integer: true,
      required: true,
      defaultValue: 1
    }
  },
  [FrequencyType.WEEKLY]: {
    timesPerWeek: {
      min: 1,
      max: 7,
      integer: true,
      required: true,
      defaultValue: 3
    }
  },
  [FrequencyType.INTERVAL]: {
    intervalDays: {
      min: 1,
      max: 365,
      integer: true,
      required: true,
      defaultValue: 2
    }
  }
};

export function validatePositiveInteger(value, min = 1, max = Infinity) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return null;
  }
  
  if (!Number.isInteger(num)) {
    return null;
  }
  
  if (num < min || num > max) {
    return null;
  }
  
  return num;
}

export function validateIntervalDays(value) {
  return validatePositiveInteger(value, 1, 365);
}

export function validateTimesPerDay(value) {
  return validatePositiveInteger(value, 1);
}

export function validateTimesPerWeek(value) {
  return validatePositiveInteger(value, 1, 7);
}

export function createHabit(name, frequencyType, frequencyConfig = {}) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Habit name is required');
  }
  
  if (!Object.values(FrequencyType).includes(frequencyType)) {
    throw new Error(`Invalid frequency type: ${frequencyType}`);
  }
  
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
  const rules = VALIDATION_RULES[frequencyType];
  if (!rules) {
    throw new Error(`Unknown frequency type: ${frequencyType}`);
  }
  
  const validatedConfig = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const rawValue = config?.[field];
    let validatedValue = null;
    
    switch (frequencyType) {
      case FrequencyType.DAILY:
        validatedValue = validateTimesPerDay(rawValue);
        break;
      case FrequencyType.WEEKLY:
        validatedValue = validateTimesPerWeek(rawValue);
        break;
      case FrequencyType.INTERVAL:
        validatedValue = validateIntervalDays(rawValue);
        break;
    }
    
    validatedConfig[field] = validatedValue !== null 
      ? validatedValue 
      : fieldRules.defaultValue;
  }
  
  return validatedConfig;
}

export function normalizeHabitConfig(habit) {
  if (!habit) return null;
  
  const normalizedHabit = { ...habit };
  
  if (!Object.values(FrequencyType).includes(normalizedHabit.frequencyType)) {
    normalizedHabit.frequencyType = FrequencyType.DAILY;
  }
  
  normalizedHabit.frequencyConfig = validateFrequencyConfig(
    normalizedHabit.frequencyType, 
    normalizedHabit.frequencyConfig
  );
  
  return normalizedHabit;
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
