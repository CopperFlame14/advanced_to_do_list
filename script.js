// Initialize variables
let currentDate = new Date();
let tasks = JSON.parse(localStorage.getItem('tasks')) || {};

// DOM Elements
const calendarEl = document.getElementById('calendar');
const currentMonthEl = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

// Helper function to check if a date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
}

// Format date as YYYY-MM-DD for consistent keys
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Format date for input[type="date"]
function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Event Listeners
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Render the calendar
function renderCalendar() {
    // Clear previous calendar
    calendarEl.innerHTML = '';
    
    // Set current month/year in header
    currentMonthEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
    
    // Create day headers (Sun, Mon, Tue, etc.)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarEl.appendChild(dayHeader);
    });
    
    // Get first day of month and total days in month
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    // Get day of week for first day of month (0-6)
    const startingDayOfWeek = firstDayOfMonth.getDay();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day other-month';
        calendarEl.appendChild(emptyDay);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = formatDate(date);
        const dayTasks = tasks[dateStr] || [];
        
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        
        // Add current-day class if this is today's date
        if (isToday(date)) {
            dayEl.classList.add('current-day');
        }
        
        dayEl.innerHTML = `
            <div class="day-number">${day}</div>
            ${dayTasks.filter(task => !task.completed).slice(0, 3).map(task => `<div class="task-preview">${task.title}</div>`).join('')}
            ${dayTasks.filter(task => !task.completed).length > 3 ? `<div class="more-tasks">+${dayTasks.filter(task => !task.completed).length - 3} more</div>` : ''}
            <div class="tasks-count">${dayTasks.filter(task => !task.completed).length}</div>
        `;
        
        // Add click event to open day's tasks
        dayEl.addEventListener('click', () => openDayTasks(dateStr));
        
        calendarEl.appendChild(dayEl);
    }
}

// Open tasks for a specific day
function openDayTasks(dateStr) {
    // Create modal for tasks
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
    
    // Set default end date (7 days from now)
    const endDateInput = modal.querySelector(`#repeat-end-date-${dateStr}`);
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 7);
    endDateInput.value = formatDateForInput(defaultEndDate);
    
    // Close modal
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    // Get repeat elements
    const repeatCheckbox = modal.querySelector(`#repeat-task-${dateStr}`);
    const repeatType = modal.querySelector(`#repeat-type-${dateStr}`);
    const repeatDuration = modal.querySelector(`#repeat-duration-${dateStr}`);
    
    // Toggle repeat options
    repeatCheckbox.addEventListener('change', () => {
        const repeatEnabled = repeatCheckbox.checked;
        repeatType.disabled = !repeatEnabled;
        repeatDuration.disabled = !repeatEnabled;
        document.querySelector(`#repeat-end-date-${dateStr}`).disabled = !repeatEnabled;
    });
    
    // Update unit text when repeat type changes
    repeatType.addEventListener('change', () => {
        const unit = repeatType.value === 'monthly' ? 'months' : 
                     repeatType.value === 'weekly' ? 'weeks' : 'days';
        document.querySelector(`#repeat-unit-${dateStr}`).textContent = unit;
    });
    
    // Handle repeat end option changes
    const repeatEndRadios = document.querySelectorAll(`input[name="repeat-end-${dateStr}"]`);
    repeatEndRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelector(`#repeat-duration-${dateStr}`).disabled = radio.value !== 'count';
            document.querySelector(`#repeat-end-date-${dateStr}`).disabled = radio.value !== 'date';
        });
    });
    
    // Load existing tasks
    renderDayTasks(dateStr);
    
    // Add task event listener
    modal.querySelector('.add-task').addEventListener('click', () => {
        const input = modal.querySelector(`#new-task-${dateStr}`);
        const title = input.value.trim();
        if (title) {
            const repeatTypeValue = repeatCheckbox.checked ? repeatType.value : null;
            let repeatEndValue = null;
            
            if (repeatCheckbox.checked) {
                const repeatEndOption = document.querySelector(`input[name="repeat-end-${dateStr}"]:checked`).value;
                if (repeatEndOption === 'count') {
                    repeatEndValue = parseInt(document.querySelector(`#repeat-duration-${dateStr}`).value);
                } else {
                    const endDate = new Date(document.querySelector(`#repeat-end-date-${dateStr}`).value);
                    repeatEndValue = endDate;
                }
            }
            
            addTask(dateStr, title, repeatTypeValue, repeatEndValue);
            input.value = '';
        }
    });
}

// Render tasks for a specific day
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
        
        // Toggle completion
        taskEl.querySelector('input').addEventListener('change', (e) => {
            toggleTaskCompletion(dateStr, index, e.target.checked);
        });
        
        // Delete task
        taskEl.querySelector('.delete-task').addEventListener('click', () => {
            deleteTask(dateStr, index);
        });
        
        taskListEl.appendChild(taskEl);
    });
}

// Add a new task
function addTask(dateStr, title, repeatType, repeatEndValue) {
    if (!tasks[dateStr]) {
        tasks[dateStr] = [];
    }
    
    const newTask = {
        title,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks[dateStr].push(newTask);
    saveTasks();
    
    if (repeatType && repeatEndValue) {
        scheduleRepeatedTasks(dateStr, title, repeatType, repeatEndValue);
    }
    
    renderCalendar();
    renderDayTasks(dateStr);
}

// Schedule repeated tasks
function scheduleRepeatedTasks(startDateStr, title, repeatType, repeatEndValue) {
    const startDate = new Date(startDateStr);
    let endDate;
    
    if (repeatEndValue instanceof Date) {
        // Repeat until specific date
        endDate = new Date(repeatEndValue);
    } else {
        // Repeat for specific count
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
    
    saveTasks();
}

// Toggle task completion
function toggleTaskCompletion(dateStr, index, completed) {
    tasks[dateStr][index].completed = completed;
    tasks[dateStr][index].completedAt = completed ? new Date().toISOString() : undefined;
    saveTasks();
    
    // Update both the day view and calendar tile immediately
    renderDayTasks(dateStr);
    
    // Find and update the calendar tile for this date
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
                
                // Reattach click event
                dayEl.addEventListener('click', () => openDayTasks(dateStr));
            }
        }
    });
}

// Delete task
function deleteTask(dateStr, index) {
    tasks[dateStr].splice(index, 1);
    if (tasks[dateStr].length === 0) {
        delete tasks[dateStr];
    }
    saveTasks();
    renderDayTasks(dateStr);
    renderCalendar();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme preference or use preferred color scheme
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

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Auth functions
async function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error("Sign-in error:", error);
    return null;
  }
}

function signOut() {
  return auth.signOut();
}

// Initialize calendar
renderCalendar();
