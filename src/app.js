import {
  createHabit,
  createCheckIn,
  FrequencyType,
  normalizeDate,
  datesAreEqual
} from './models.js';

import {
  getHabits,
  addHabit,
  updateHabit,
  deleteHabit,
  getCheckInsByHabitId,
  addCheckIn
} from './storage.js';

import {
  canCheckInToday,
  calculateStreak,
  calculateLongestStreak,
  getStatistics,
  getCalendarData,
  getDailyCheckInCount,
  isDateGoalMet
} from './habitLogic.js';

const appState = {
  currentHabit: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  editingHabitId: null,
  deletingHabitId: null
};

const frequencyTypeLabels = {
  [FrequencyType.DAILY]: '每日',
  [FrequencyType.WEEKLY]: '每周',
  [FrequencyType.INTERVAL]: '间隔'
};

function getFrequencyDescription(habit) {
  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      return `每天 ${habit.frequencyConfig.timesPerDay} 次`;
    case FrequencyType.WEEKLY:
      return `每周 ${habit.frequencyConfig.timesPerWeek} 次`;
    case FrequencyType.INTERVAL:
      return `每 ${habit.frequencyConfig.intervalDays} 天`;
    default:
      return '';
  }
}

function renderHabitsList() {
  const habitsListEl = document.getElementById('habitsList');
  const habits = getHabits();
  
  if (habits.length === 0) {
    habitsListEl.innerHTML = `
      <div class="empty-state">
        <p>还没有习惯，点击上方按钮开始创建！</p>
      </div>
    `;
    return;
  }
  
  habitsListEl.innerHTML = habits.map(habit => {
    const checkIns = getCheckInsByHabitId(habit.id);
    const currentStreak = calculateStreak(habit, checkIns);
    const freqDesc = getFrequencyDescription(habit);
    
    return `
      <div class="habit-card" data-id="${habit.id}">
        <div class="habit-card-header">
          <span class="habit-card-name">${escapeHtml(habit.name)}</span>
          <span class="habit-card-badge">${frequencyTypeLabels[habit.frequencyType]}</span>
        </div>
        <div class="habit-card-meta">
          <div class="habit-card-streak">
            <span>🔥</span>
            <span>连续 ${currentStreak} 天</span>
          </div>
          <div>
            <span>📅</span>
            <span>${freqDesc}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  habitsListEl.querySelectorAll('.habit-card').forEach(card => {
    card.addEventListener('click', () => {
      const habitId = card.dataset.id;
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        showHabitDetail(habit);
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showHabitDetail(habit) {
  appState.currentHabit = habit;
  
  const habitsSection = document.querySelector('.habits-section');
  const detailSection = document.getElementById('habitDetailSection');
  
  habitsSection.classList.add('hidden');
  detailSection.classList.remove('hidden');
  
  renderHabitDetail();
}

function renderHabitDetail() {
  if (!appState.currentHabit) return;
  
  const habit = appState.currentHabit;
  const checkIns = getCheckInsByHabitId(habit.id);
  const stats = getStatistics(habit, checkIns);
  
  document.getElementById('detailTitle').textContent = habit.name;
  
  document.getElementById('statCurrentStreak').textContent = stats.currentStreak;
  document.getElementById('statLongestStreak').textContent = stats.longestStreak;
  document.getElementById('statTotalDays').textContent = stats.totalDays;
  document.getElementById('statTotalCheckIns').textContent = stats.totalCheckIns;
  
  updateCheckInButton();
  
  renderCalendar();
}

function updateCheckInButton() {
  if (!appState.currentHabit) return;
  
  const habit = appState.currentHabit;
  const checkIns = getCheckInsByHabitId(habit.id);
  const today = new Date();
  const canCheckIn = canCheckInToday(habit, checkIns, today);
  const todayCount = getDailyCheckInCount(checkIns, today);
  const todayGoalMet = isDateGoalMet(habit, checkIns, today);
  
  const checkInBtn = document.getElementById('checkInBtn');
  const checkInStatus = document.getElementById('checkInStatus');
  
  checkInBtn.disabled = !canCheckIn;
  checkInBtn.textContent = canCheckIn ? '今日打卡' : '今日已完成';
  checkInBtn.className = `btn btn-large ${canCheckIn ? 'btn-success' : 'btn-secondary'}`;
  
  let statusText = '';
  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      const requiredDaily = habit.frequencyConfig.timesPerDay;
      statusText = `今日进度: ${todayCount}/${requiredDaily} 次`;
      break;
    case FrequencyType.WEEKLY:
      const requiredWeekly = habit.frequencyConfig.timesPerWeek;
      const weeklyCount = getWeeklyCheckInCountFixed(habit, checkIns, today);
      statusText = `本周进度: ${weeklyCount}/${requiredWeekly} 天`;
      break;
    case FrequencyType.INTERVAL:
      const intervalDays = habit.frequencyConfig.intervalDays;
      statusText = todayGoalMet 
        ? '今日已打卡' 
        : `每 ${intervalDays} 天打卡一次`;
      break;
  }
  
  checkInStatus.textContent = statusText;
}

function getWeeklyCheckInCountFixed(habit, checkIns, date) {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(d);
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const uniqueDates = new Set();
  
  checkIns.forEach(c => {
    const checkDate = normalizeDate(c.date);
    if (checkDate >= weekStart && checkDate <= weekEnd) {
      uniqueDates.add(checkDate.toISOString());
    }
  });
  
  return uniqueDates.size;
}

function handleCheckIn() {
  if (!appState.currentHabit) return;
  
  const habit = appState.currentHabit;
  const checkIn = createCheckIn(habit.id, new Date());
  addCheckIn(checkIn);
  
  updateCheckInButton();
  renderHabitDetail();
  renderHabitsList();
}

function renderCalendar() {
  if (!appState.currentHabit) return;
  
  const habit = appState.currentHabit;
  const checkIns = getCheckInsByHabitId(habit.id);
  
  const calendarData = getCalendarData(habit, checkIns, appState.currentYear, appState.currentMonth);
  
  const calendarTitle = document.getElementById('calendarTitle');
  calendarTitle.textContent = `${appState.currentYear}年${appState.currentMonth + 1}月`;
  
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = calendarData.map(day => {
    const dayNum = day.date.getDate();
    let classes = 'calendar-day';
    
    if (!day.isCurrentMonth) {
      classes += ' other-month';
    }
    
    if (day.isToday) {
      classes += ' today';
    }
    
    if (day.hasCheckIn) {
      classes += ' checked';
    }
    
    const title = day.hasCheckIn 
      ? `已完成 (${day.checkInCount}次)` 
      : day.isCurrentMonth ? '未完成' : '';
    
    return `
      <div class="${classes}" title="${escapeHtml(title)}">
        ${dayNum}
      </div>
    `;
  }).join('');
}

function prevMonth() {
  appState.currentMonth--;
  if (appState.currentMonth < 0) {
    appState.currentMonth = 11;
    appState.currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  appState.currentMonth++;
  if (appState.currentMonth > 11) {
    appState.currentMonth = 0;
    appState.currentYear++;
  }
  renderCalendar();
}

function goBackToList() {
  appState.currentHabit = null;
  const habitsSection = document.querySelector('.habits-section');
  const detailSection = document.getElementById('habitDetailSection');
  
  habitsSection.classList.remove('hidden');
  detailSection.classList.add('hidden');
  
  renderHabitsList();
}

function openAddHabitModal() {
  appState.editingHabitId = null;
  document.getElementById('modalTitle').textContent = '添加新习惯';
  document.getElementById('habitForm').reset();
  resetFrequencyConfig();
  showModal('habitModal');
}

function openEditHabitModal() {
  if (!appState.currentHabit) return;
  
  const habit = appState.currentHabit;
  appState.editingHabitId = habit.id;
  
  document.getElementById('modalTitle').textContent = '编辑习惯';
  document.getElementById('habitName').value = habit.name;
  
  const radioInputs = document.querySelectorAll('input[name="frequencyType"]');
  radioInputs.forEach(input => {
    input.checked = input.value === habit.frequencyType;
  });
  
  resetFrequencyConfig();
  
  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      document.getElementById('timesPerDay').value = habit.frequencyConfig.timesPerDay;
      showConfig('daily');
      break;
    case FrequencyType.WEEKLY:
      document.getElementById('timesPerWeek').value = habit.frequencyConfig.timesPerWeek;
      showConfig('weekly');
      break;
    case FrequencyType.INTERVAL:
      document.getElementById('intervalDays').value = habit.frequencyConfig.intervalDays;
      showConfig('interval');
      break;
  }
  
  showModal('habitModal');
}

function resetFrequencyConfig() {
  document.getElementById('dailyConfig').classList.add('hidden');
  document.getElementById('weeklyConfig').classList.add('hidden');
  document.getElementById('intervalConfig').classList.add('hidden');
}

function showConfig(type) {
  resetFrequencyConfig();
  switch (type) {
    case 'daily':
      document.getElementById('dailyConfig').classList.remove('hidden');
      break;
    case 'weekly':
      document.getElementById('weeklyConfig').classList.remove('hidden');
      break;
    case 'interval':
      document.getElementById('intervalConfig').classList.remove('hidden');
      break;
  }
}

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function handleHabitFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('habitName').value.trim();
  if (!name) return;
  
  const frequencyType = document.querySelector('input[name="frequencyType"]:checked').value;
  
  let frequencyConfig = {};
  switch (frequencyType) {
    case FrequencyType.DAILY:
      frequencyConfig = {
        timesPerDay: parseInt(document.getElementById('timesPerDay').value) || 1
      };
      break;
    case FrequencyType.WEEKLY:
      frequencyConfig = {
        timesPerWeek: parseInt(document.getElementById('timesPerWeek').value) || 3
      };
      break;
    case FrequencyType.INTERVAL:
      frequencyConfig = {
        intervalDays: parseInt(document.getElementById('intervalDays').value) || 2
      };
      break;
  }
  
  if (appState.editingHabitId) {
    const updates = {
      name,
      frequencyType,
      frequencyConfig
    };
    const updatedHabit = updateHabit(appState.editingHabitId, updates);
    if (updatedHabit && appState.currentHabit && appState.currentHabit.id === updatedHabit.id) {
      appState.currentHabit = updatedHabit;
      renderHabitDetail();
    }
  } else {
    const habit = createHabit(name, frequencyType, frequencyConfig);
    addHabit(habit);
  }
  
  closeModal('habitModal');
  renderHabitsList();
}

function openDeleteModal() {
  if (!appState.currentHabit) return;
  appState.deletingHabitId = appState.currentHabit.id;
  showModal('deleteModal');
}

function confirmDelete() {
  if (!appState.deletingHabitId) return;
  
  deleteHabit(appState.deletingHabitId);
  appState.deletingHabitId = null;
  appState.currentHabit = null;
  
  closeModal('deleteModal');
  goBackToList();
}

function bindEvents() {
  document.getElementById('addHabitBtn').addEventListener('click', openAddHabitModal);
  document.getElementById('backToListBtn').addEventListener('click', goBackToList);
  
  document.getElementById('checkInBtn').addEventListener('click', handleCheckIn);
  
  document.getElementById('editHabitBtn').addEventListener('click', openEditHabitModal);
  document.getElementById('deleteHabitBtn').addEventListener('click', openDeleteModal);
  
  document.getElementById('prevMonthBtn').addEventListener('click', prevMonth);
  document.getElementById('nextMonthBtn').addEventListener('click', nextMonth);
  
  document.getElementById('habitForm').addEventListener('submit', handleHabitFormSubmit);
  
  document.querySelectorAll('input[name="frequencyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      showConfig(e.target.value);
    });
  });
  
  document.getElementById('closeModalBtn').addEventListener('click', () => closeModal('habitModal'));
  document.getElementById('cancelModalBtn').addEventListener('click', () => closeModal('habitModal'));
  
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => closeModal('deleteModal'));
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
}

function init() {
  bindEvents();
  renderHabitsList();
}

document.addEventListener('DOMContentLoaded', init);
