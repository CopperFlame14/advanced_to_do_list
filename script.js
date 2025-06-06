// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// App variables
let currentDate = new Date();
let tasks = {};
let isOnline = navigator.onLine;

// DOM Elements
const calendarEl = document.getElementById('calendar');
const currentMonthEl = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const signInBtn = document.getElementById('sign-in');
const signOutBtn = document.getElementById('sign-out');
const userEmailSpan = document.getElementById('user-email');
const authContainer = document.getElementById('auth-container');
const offlineIndicator = document.getElementById('offline-indicator');

// Initialize the app
init();

async function init() {
  setupEventListeners();
  checkAuthState();
  setupOnlineStatusListener();
  await loadInitialData();
  renderCalendar();
}

function setupEventListeners() {
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  signInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);

  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
}

function setupOnlineStatusListener() {
  isOnline = navigator.onLine;
  updateOnlineStatusUI();
}

function handleOnlineStatusChange() {
  isOnline = navigator.onLine;
  updateOnlineStatusUI();
  if (isOnline) {
    syncTasks();
  }
}

function updateOnlineStatusUI() {
  if (offlineIndicator) {
    offlineIndicator.style.display = isOnline ? 'none' : 'block';
  }
}

// Authentication functions
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Sign-in failed. Please try again.");
  }
}

async function signOut() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Sign-out error:", error);
  }
}

function checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      userEmailSpan.textContent = user.email;
      authContainer.style.display = 'flex';
      signInBtn.style.display = 'none';
      await syncTasks();
    } else {
      authContainer.style.display = 'none';
      signInBtn.style.display = 'block';
      await loadLocalTasks();
    }
    renderCalendar();
  });
}

// Data synchronization functions
async function loadInitialData() {
  if (auth.currentUser) {
    await syncTasks();
  } else {
    await loadLocalTasks();
  }
}

async function syncTasks() {
  if (!isOnline) return;

  try {
    if (auth.currentUser) {
      // Load from cloud
      const snapshot = await database.ref(`users/${auth.currentUser.uid}/tasks`).once('value');
      const cloudTasks = snapshot.val() || {};
      
      // Merge with local tasks (cloud wins conflicts)
      const localTasks = JSON.parse(localStorage.getItem('tasks')) || {};
      tasks = {...localTasks, ...cloudTasks};
      
      // Save merged data to both cloud and local
      await saveTasks();
    }
  } catch (error) {
    console.error("Sync error:", error);
    await loadLocalTasks();
  }
}

async function saveTasks() {
  try {
    // Always save to localStorage
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Save to cloud if authenticated and online
    if (auth.currentUser && isOnline) {
      await database.ref(`users/${auth.currentUser.uid}/tasks`).set(tasks);
    }
  } catch (error) {
    console.error("Save error:", error);
  }
}

async function loadLocalTasks() {
  tasks = JSON.parse(localStorage.getItem('tasks')) || {};
}

// Calendar rendering functions
function renderCalendar() {
  calendarEl.innerHTML = '';
  
  currentMonthEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  daysOfWeek.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    calendarEl.appendChild(dayHeader);
  });
  
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'day other-month';
    calendarEl.appendChild(emptyDay);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(date);
    const dayTasks = tasks[dateStr] || [];
    
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    
    if (isToday(date)) {
      dayEl.classList.add('current-day');
    }
    
    dayEl.innerHTML = `
      <div class="day-number">${day}</div>
      ${dayTasks.filter(task => !task.completed).slice(0, 3).map(task => `<div class="task-preview">${task.title}</div>`).join('')}
      ${dayTasks.filter(task => !task.completed).length > 3 ? `<div class="more-tasks">+${dayTasks.filter(task => !task.completed).length - 3} more</div>` : ''}
      <div class="tasks-count">${dayTasks.filter(task => !task.completed).length}</div>
    `;
    
    dayEl.addEventListener('click', () => openDayTasks(dateStr));
    calendarEl.appendChild(dayEl);
  }
}

// Task management functions
async function openDayTasks(dateStr) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Tasks for ${formatDisplayDate(dateStr)}</h3>
        <span class="close">&times;</span>
      </div>
      <div class="task-list" id="task-list-${dateStr}"></div>
      <div class="task-form">
        <input type="text" id="new-task-${dateStr}" placeholder="New task">
        <button class="add-task" data-date="${dateStr}">Add Task</button>
        <div class="repeat-options">
          <label><input type="checkbox" id="repeat-task-${dateStr}"> Repeat</label>
          <select id="repeat-type-${dateStr}" disabled>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <div class="repeat-end-option">
            <label><input type="radio" name="repeat-end-${dateStr}" value="count" checked> For</label>
            <input type="number" id="repeat-duration-${dateStr}" min="1" value="1" placeholder="Number">
            <span id="repeat-unit-${dateStr}">days</span>
            <label><input type="radio" name="repeat-end-${dateStr}" value="date"> Until</label>
            <input type="date" id="repeat-end-date-${dateStr}" disabled>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const endDateInput = modal.querySelector(`#repeat-end-date-${dateStr}`);
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  endDateInput.value = formatDateForInput(defaultEndDate);
  
  modal.querySelector('.close').addEventListener('click', () => {
    modal.remove();
  });
  
  const repeatCheckbox = modal.querySelector(`#repeat-task-${dateStr}`);
  const repeatType = modal.querySelector(`#repeat-type-${dateStr}`);
  const repeatDuration = modal.querySelector(`#repeat-duration-${dateStr}`);
  
  repeatCheckbox.addEventListener('change', () => {
    const repeatEnabled = repeatCheckbox.checked;
    repeatType.disabled = !repeatEnabled;
    repeatDuration.disabled = !repeatEnabled;
    modal.querySelector(`#repeat-end-date-${dateStr}`).disabled = !repeatEnabled;
  });
  
  repeatType.addEventListener('change', () => {
    const unit = repeatType.value === 'monthly' ? 'months' : 
                 repeatType.value === 'weekly' ? 'weeks' : 'days';
    modal.querySelector(`#repeat-unit-${dateStr}`).textContent = unit;
  });
  
  const repeatEndRadios = modal.querySelectorAll(`input[name="repeat-end-${dateStr}"]`);
  repeatEndRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      modal.querySelector(`#repeat-duration-${dateStr}`).disabled = radio.value !== 'count';
      modal.querySelector(`#repeat-end-date-${dateStr}`).disabled = radio.value !== 'date';
    });
  });
  
  renderDayTasks(dateStr);
  
  modal.querySelector('.add-task').addEventListener('click', async () => {
    const input = modal.querySelector(`#new-task-${dateStr}`);
    const title = input.value.trim();
    if (title) {
      const repeatTypeValue = repeatCheckbox.checked ? repeatType.value : null;
      let repeatEndValue = null;
      
      if (repeatCheckbox.checked) {
        const repeatEndOption = modal.querySelector(`input[name="repeat-end-${dateStr}"]:checked`).value;
        if (repeatEndOption === 'count') {
          repeatEndValue = parseInt(modal.querySelector(`#repeat-duration-${dateStr}`).value);
        } else {
          const endDate = new Date(modal.querySelector(`#repeat-end-date-${dateStr}`).value);
          repeatEndValue = endDate;
        }
      }
      
      await addTask(dateStr, title, repeatTypeValue, repeatEndValue);
      input.value = '';
    }
  });
}

function renderDayTasks(dateStr) {
  const taskListEl = document.querySelector(`#task-list-${dateStr}`);
  if (!taskListEl) return;
  
  taskListEl.innerHTML = '';
  const dayTasks = tasks[dateStr] || [];
  
  dayTasks.forEach((task, index) => {
    const taskEl = document.createElement('div');
    taskEl.className = `task ${task.completed ? 'completed-task' : ''}`;
    taskEl.innerHTML = `
      <input type="checkbox" ${task.completed ? 'checked' : ''} data-index="${index}" data-date="${dateStr}">
      <span class="${task.completed ? 'completed' : ''}">${task.title}</span>
      <button class="delete-task" data-index="${index}" data-date="${dateStr}">×</button>
    `;
    
    taskEl.querySelector('input').addEventListener('change', async (e) => {
      await toggleTaskCompletion(dateStr, index, e.target.checked);
    });
    
    taskEl.querySelector('.delete-task').addEventListener('click', async () => {
      await deleteTask(dateStr, index);
    });
    
    taskListEl.appendChild(taskEl);
  });
}

async function addTask(dateStr, title, repeatType, repeatEndValue) {
  if (!tasks[dateStr]) {
    tasks[dateStr] = [];
  }
  
  const newTask = {
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  tasks[dateStr].push(newTask);
  await saveTasks();
  
  if (repeatType && repeatEndValue) {
    await scheduleRepeatedTasks(dateStr, title, repeatType, repeatEndValue);
  }
  
  renderCalendar();
  renderDayTasks(dateStr);
}

async function scheduleRepeatedTasks(startDateStr, title, repeatType, repeatEndValue) {
  const startDate = new Date(startDateStr);
  let endDate;
  
  if (repeatEndValue instanceof Date) {
    endDate = new Date(repeatEndValue);
  } else {
    const count = parseInt(repeatEndValue);
    endDate = new Date(startDate);
    
    switch (repeatType) {
      case 'daily':
        endDate.setDate(startDate.getDate() + count);
        break;
      case 'weekly':
        endDate.setDate(startDate.getDate() + (count * 7));
        break;
      case 'monthly':
        endDate.setMonth(startDate.getMonth() + count);
        break;
    }
  }
  
  let currentDate = new Date(startDate);
  let i = 1;
  
  while (currentDate <= endDate) {
    const nextDate = new Date(startDate);
    
    switch (repeatType) {
      case 'daily':
        nextDate.setDate(startDate.getDate() + i);
        break;
      case 'weekly':
        nextDate.setDate(startDate.getDate() + (i * 7));
        break;
      case 'monthly':
        nextDate.setMonth(startDate.getMonth() + i);
        break;
    }
    
    if (nextDate > endDate) break;
    
    const nextDateStr = formatDate(nextDate);
    
    if (!tasks[nextDateStr]) {
      tasks[nextDateStr] = [];
    }
    
    tasks[nextDateStr].push({
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      isRepeated: true
    });
    
    i++;
    currentDate = new Date(nextDate);
  }
  
  await saveTasks();
}

async function toggleTaskCompletion(dateStr, index, completed) {
  tasks[dateStr][index].completed = completed;
  tasks[dateStr][index].completedAt = completed ? new Date().toISOString() : undefined;
  await saveTasks();
  
  renderDayTasks(dateStr);
  
  const allDayElements = document.querySelectorAll('.day');
  allDayElements.forEach(dayEl => {
    if (dayEl.textContent.includes(dateStr.split('-')[2])) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(dateStr.split('-')[2]));
      if (formatDate(date) === dateStr) {
        const dayTasks = tasks[dateStr] || [];
        dayEl.innerHTML = `
          <div class="day-number">${date.getDate()}</div>
          ${dayTasks.filter(task => !task.completed).slice(0, 3).map(task => `<div class="task-preview">${task.title}</div>`).join('')}
          ${dayTasks.filter(task => !task.completed).length > 3 ? `<div class="more-tasks">+${dayTasks.filter(task => !task.completed).length - 3} more</div>` : ''}
          <div class="tasks-count">${dayTasks.filter(task => !task.completed).length}</div>
        `;
        dayEl.addEventListener('click', () => openDayTasks(dateStr));
      }
    }
  });
}

async function deleteTask(dateStr, index) {
  tasks[dateStr].splice(index, 1);
  if (tasks[dateStr].length === 0) {
    delete tasks[dateStr];
  }
  await saveTasks();
  renderDayTasks(dateStr);
  renderCalendar();
}

// Utility functions
function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const savedTheme = localStorage.getItem('theme') || 
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
body.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '🌞' : '🌓';

themeToggle.addEventListener('click', () => {
  const currentTheme = body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '🌞' : '🌓';
  localStorage.setItem('theme', newTheme);
});
