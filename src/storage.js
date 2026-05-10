import { normalizeDate, normalizeHabitConfig } from './models.js';

const STORAGE_KEYS = {
  HABITS: 'habit_builder_habits',
  CHECKINS: 'habit_builder_checkins'
};

export function getStorage() {
  if (typeof localStorage === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };
  }
  return localStorage;
}

export function getHabits() {
  const storage = getStorage();
  const data = storage.getItem(STORAGE_KEYS.HABITS);
  const habits = data ? JSON.parse(data) : [];
  return habits.map(habit => normalizeHabitConfig(habit)).filter(Boolean);
}

export function saveHabits(habits) {
  const storage = getStorage();
  storage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export function getHabitById(id) {
  const habits = getHabits();
  return habits.find(h => h.id === id) || null;
}

export function addHabit(habit) {
  const habits = getHabits();
  const normalizedHabit = normalizeHabitConfig(habit);
  if (!normalizedHabit) return null;
  habits.push(normalizedHabit);
  saveHabits(habits);
  return normalizedHabit;
}

export function updateHabit(id, updates) {
  const habits = getHabits();
  const index = habits.findIndex(h => h.id === id);
  if (index === -1) return null;
  
  const currentHabit = habits[index];
  const updatedHabit = { ...currentHabit, ...updates, updatedAt: new Date().toISOString() };
  const normalizedHabit = normalizeHabitConfig(updatedHabit);
  
  if (!normalizedHabit) return null;
  
  habits[index] = normalizedHabit;
  saveHabits(habits);
  return normalizedHabit;
}

export function deleteHabit(id) {
  const habits = getHabits();
  const filtered = habits.filter(h => h.id !== id);
  saveHabits(filtered);
  deleteCheckInsByHabitId(id);
  return true;
}

export function getCheckIns() {
  const storage = getStorage();
  const data = storage.getItem(STORAGE_KEYS.CHECKINS);
  return data ? JSON.parse(data) : [];
}

export function saveCheckIns(checkIns) {
  const storage = getStorage();
  storage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(checkIns));
}

export function getCheckInsByHabitId(habitId) {
  const checkIns = getCheckIns();
  return checkIns.filter(c => c.habitId === habitId);
}

export function getCheckInsByDate(habitId, date) {
  const checkIns = getCheckInsByHabitId(habitId);
  const targetDate = normalizeDate(date);
  return checkIns.filter(c => normalizeDate(c.date).getTime() === targetDate.getTime());
}

export function addCheckIn(checkIn) {
  const checkIns = getCheckIns();
  checkIns.push(checkIn);
  saveCheckIns(checkIns);
  return checkIn;
}

export function deleteCheckIn(id) {
  const checkIns = getCheckIns();
  const filtered = checkIns.filter(c => c.id !== id);
  saveCheckIns(filtered);
  return true;
}

export function deleteCheckInsByHabitId(habitId) {
  const checkIns = getCheckIns();
  const filtered = checkIns.filter(c => c.habitId !== habitId);
  saveCheckIns(filtered);
  return true;
}

export function clearAllData() {
  const storage = getStorage();
  storage.removeItem(STORAGE_KEYS.HABITS);
  storage.removeItem(STORAGE_KEYS.CHECKINS);
}
