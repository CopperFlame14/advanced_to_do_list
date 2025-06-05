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
            ${dayTasks.slice(0, 3).map(task => `<div class="task-preview">${task.title}</div>`).join('')}
            ${dayTasks.length > 3 ? `<div class="more-tasks">+${dayTasks.length - 3} more</div>` : ''}
            <div class="tasks-count">${dayTasks.length}</div>
        `;
        
        // Add click event to open day's tasks
        dayEl.addEventListener('click', () => openDayTasks(dateStr));
        
        calendarEl.appendChild(dayEl);
    }
}

// Format date as YYYY-MM-DD for consistent keys
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
                    <input type="number" id="repeat-duration-${dateStr}" disabled min="1" value="1" placeholder="For how many days?">
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    // Toggle repeat options
    const repeatCheckbox = modal.querySelector(`#repeat-task-${dateStr}`);
    const repeatType = modal.querySelector(`#repeat-type-${dateStr}`);
    const repeatDuration = modal.querySelector(`#repeat-duration-${dateStr}`);
    
    repeatCheckbox.addEventListener('change', () => {
        repeatType.disabled = !repeatCheckbox.checked;
        repeatDuration.disabled = !repeatCheckbox.checked;
    });
    
    // Load existing tasks
    renderDayTasks(dateStr);
    
    // Add task event listener
    modal.querySelector('.add-task').addEventListener('click', () => {
        const input = modal.querySelector(`#new-task-${dateStr}`);
        const title = input.value.trim();
        if (title) {
            addTask(dateStr, title, 
                   repeatCheckbox.checked ? repeatType.value : null,
                   repeatCheckbox.checked ? repeatDuration.value : null);
            input.value = '';
        }
    });
}

// Format date for display
function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Render tasks for a specific day
function renderDayTasks(dateStr) {
    const taskListEl = document.querySelector(`#task-list-${dateStr}`);
    if (!taskListEl) return;
    
    taskListEl.innerHTML = '';
    const dayTasks = tasks[dateStr] || [];
    
    dayTasks.forEach((task, index) => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task';
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
function addTask(dateStr, title, repeatType, repeatDuration) {
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
    
    if (repeatType && repeatDuration) {
        scheduleRepeatedTasks(dateStr, title, repeatType, parseInt(repeatDuration));
    }
    
    renderCalendar();
    renderDayTasks(dateStr);
}

// Schedule repeated tasks
function scheduleRepeatedTasks(startDateStr, title, repeatType, duration) {
    const startDate = new Date(startDateStr);
    
    for (let i = 1; i <= duration; i++) {
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
    }
    
    saveTasks();
}

// Toggle task completion
function toggleTaskCompletion(dateStr, index, completed) {
    tasks[dateStr][index].completed = completed;
    tasks[dateStr][index].completedAt = completed ? new Date().toISOString() : undefined;
    saveTasks();
    renderDayTasks(dateStr);
    renderCalendar();
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

// Initialize calendar
renderCalendar();
