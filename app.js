'use strict';

const STORAGE_KEY = 'taskflow_tasks';

let allTasks        = [];     // full task array in memory
let activeFilter    = 'all';  // status filter: "all"|"pending"|"completed"
let activeView      = 'list'; // view mode: "list"|"history"
let historyDateFilter = null; // "YYYY-MM-DD" or null — filter for history view


const taskInput            = document.getElementById('taskInput');
const dueDateInput         = document.getElementById('dueDateInput');
const addTaskBtn           = document.getElementById('addTaskBtn');
const errorMessage         = document.getElementById('errorMessage');

const viewToggleButtons    = document.querySelectorAll('.view-toggle-btn');
const filterButtons        = document.querySelectorAll('.filter-btn');
const clearCompletedBtn    = document.getElementById('clearCompletedBtn');

const statusFilterSection  = document.getElementById('statusFilterSection');
const dateFilterSection    = document.getElementById('dateFilterSection');
const historyDatePicker    = document.getElementById('historyDatePicker');
const clearDateFilterBtn   = document.getElementById('clearDateFilterBtn');

const taskListSection      = document.getElementById('taskListSection');
const taskList             = document.getElementById('taskList');
const emptyState           = document.getElementById('emptyState');

const historySection       = document.getElementById('historySection');
const historyGroupContainer= document.getElementById('historyGroupContainer');
const historyEmptyState    = document.getElementById('historyEmptyState');

const totalCountEl         = document.getElementById('totalCount');
const pendingCountEl       = document.getElementById('pendingCount');
const completedCountEl     = document.getElementById('completedCount');

/*DATE UTILITY FUNCTIONS*/

/** Returns today's date as "YYYY-MM-DD" string in local time */
function getTodayDateString() {
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate user-entered due date.
 * Rule: due date must be today or a future date — past dates are rejected.
 * Returns true if valid (or empty), false if past date entered.
 */
function isDueDateValid(dateString) {
  if (!dateString) return true; // empty = optional, always valid
  const today = getTodayDateString();
  return dateString >= today;
}

/**
 * Format "YYYY-MM-DD" → readable "May 5, 2026".
 * Parsed manually to avoid timezone shift issues.
 */
function formatDateToReadable(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDueDateUrgency(task) {
  if (!task.dueDate || task.status === 'completed') return 'none';
  const today = getTodayDateString();
  if (task.dueDate < today)   return 'overdue';
  if (task.dueDate === today) return 'due-today';
  return 'upcoming';
}

/*STORAGE FUNCTIONS */

/** Load tasks array from localStorage */
function loadTasksFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/** Persist current allTasks array to localStorage */
function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
}

/*TASK CRUD OPERATIONS */

/** Build a new task object with auto-generated id and createdDate */
function buildNewTask(description, dueDate) {
  return {
    id:          crypto.randomUUID(),
    description: description.trim(),
    status:      'pending',
    dueDate:     dueDate || null,
    createdDate: getTodayDateString(),  // auto-captured creation date
    createdAt:   Date.now()
  };
}

/** Validate inputs and add a new task to the list */
function addTask() {
  const description = taskInput.value.trim();
  const dueDate     = dueDateInput.value;

  // Validate: description required
  if (!description) {
    showError('Please enter a task description.');
    taskInput.focus();
    return;
  }

  // Validate: due date must be today or future — reject past dates
  if (!isDueDateValid(dueDate)) {
    showError('Due date cannot be in the past. Please choose today or a future date.');
    dueDateInput.focus();
    return;
  }

  hideError();

  const newTask = buildNewTask(description, dueDate || null);
  allTasks.unshift(newTask);
  saveTasksToStorage();

  // Reset form
  taskInput.value    = '';
  dueDateInput.value = '';
  taskInput.focus();

  renderCurrentView();
  updateSummaryCounters();
}

/** Toggle a task between "pending" and "completed" */
function toggleTaskStatus(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'pending' ? 'completed' : 'pending';
  saveTasksToStorage();
  renderCurrentView();
  updateSummaryCounters();
}

/** Permanently remove a task by id */
function deleteTask(taskId) {
  allTasks = allTasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderCurrentView();
  updateSummaryCounters();
}

/** Remove all completed tasks at once */
function clearCompletedTasks() {
  allTasks = allTasks.filter(t => t.status !== 'completed');
  saveTasksToStorage();
  renderCurrentView();
  updateSummaryCounters();
}

/*FILTER FUNCTIONS */

/** Return tasks filtered by current status filter (all/pending/completed) */
function getStatusFilteredTasks() {
  if (activeFilter === 'pending')   return allTasks.filter(t => t.status === 'pending');
  if (activeFilter === 'completed') return allTasks.filter(t => t.status === 'completed');
  return allTasks;
}

/**
 * Return tasks filtered by a specific created date string "YYYY-MM-DD".
 * If no date selected, return all tasks.
 */
function getHistoryFilteredTasks() {
  if (!historyDateFilter) return allTasks;
  return allTasks.filter(t => t.createdDate === historyDateFilter);
}

/** Set status filter and re-render */
function setStatusFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTaskListView();
}

/*VIEW TOGGLE*/

/** Switch between "list" and "history" views */
function setActiveView(view) {
  activeView = view;

  viewToggleButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'list') {
    taskListSection.classList.remove('hidden');
    historySection.classList.add('hidden');
    statusFilterSection.classList.remove('hidden');
    dateFilterSection.classList.add('hidden');
    renderTaskListView();
  } else {
    taskListSection.classList.add('hidden');
    historySection.classList.remove('hidden');
    statusFilterSection.classList.add('hidden');
    dateFilterSection.classList.remove('hidden');
    renderHistoryView();
  }
}

/** Render whichever view is currently active */
function renderCurrentView() {
  if (activeView === 'list') renderTaskListView();
  else renderHistoryView();
}

/*TASK LIST VIEW RENDER*/

/** Render the flat task list (status-filtered) */
function renderTaskListView() {
  const visibleTasks = getStatusFilteredTasks();
  taskList.innerHTML = '';

  if (visibleTasks.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    visibleTasks.forEach(task => {
      taskList.appendChild(buildTaskListItem(task));
    });
  }

  // Show "Clear Completed" only when completed tasks exist
  const hasCompleted = allTasks.some(t => t.status === 'completed');
  clearCompletedBtn.classList.toggle('hidden', !hasCompleted);
}

/** Build a single <li> task element for the list view */
function buildTaskListItem(task) {
  const isCompleted  = task.status === 'completed';
  const urgency      = getDueDateUrgency(task);

  /* Due date badge */
  let dueDateBadgeHTML = '';
  if (task.dueDate) {
    const label     = formatDateToReadable(task.dueDate);
    const badgeClass = isCompleted ? 'due-badge-done' : `due-badge-${urgency}`;
    const icon = urgency === 'overdue'   ? '⚠️' :
                 urgency === 'due-today' ? '🔔' : '📅';
    dueDateBadgeHTML = `<span class="due-date-badge ${badgeClass}">Due: ${icon} ${label}</span>`;
  }

  /* Created date badge — always shown */
  const createdLabel = formatDateToReadable(task.createdDate);
  const createdBadgeHTML = `<span class="created-date-badge">🗓 Added: ${createdLabel}</span>`;

  const li = document.createElement('li');
  li.className = [
    'task-item',
    isCompleted ? 'is-completed' : '',
    urgency !== 'none' && !isCompleted ? `has-due-${urgency}` : ''
  ].filter(Boolean).join(' ');

  li.dataset.id = task.id;
  li.setAttribute('role', 'listitem');

  li.innerHTML = `
    <div class="task-checkbox" role="checkbox"
         aria-checked="${isCompleted}"
         title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}">
      <span class="task-checkbox-tick">✓</span>
    </div>

    <div class="task-body">
      <span class="task-text">${escapeHTML(task.description)}</span>
      <div class="task-meta-badges">
        ${createdBadgeHTML}
        ${dueDateBadgeHTML}
      </div>
    </div>

    <span class="task-status-badge ${isCompleted ? 'status-completed' : 'status-pending'}">
      ${isCompleted ? 'Done' : 'Pending'}
    </span>

    <button class="delete-btn" aria-label="Delete task" title="Delete task">✕</button>
  `;

  li.querySelector('.task-checkbox').addEventListener('click', () => toggleTaskStatus(task.id));
  li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

  return li;
}

/*HISTORY VIEW RENDER*/

function renderHistoryView() {
  const tasksToShow = getHistoryFilteredTasks();
  historyGroupContainer.innerHTML = '';

  if (tasksToShow.length === 0) {
    historyEmptyState.classList.remove('hidden');
    return;
  }

  historyEmptyState.classList.add('hidden');

  // Group tasks by createdDate
  const groupMap = groupTasksByCreatedDate(tasksToShow);

  // Sort groups newest date first
  const sortedDates = Object.keys(groupMap).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(dateString => {
    const group = groupMap[dateString];
    const groupEl = buildHistoryGroup(dateString, group);
    historyGroupContainer.appendChild(groupEl);
  });
}

/**
 * Group an array of tasks by their createdDate.
 * Returns an object: { "YYYY-MM-DD": [task, task, ...], ... }
 */
function groupTasksByCreatedDate(tasks) {
  return tasks.reduce((groups, task) => {
    const key = task.createdDate;
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
    return groups;
  }, {});
}

/** Build a date-group block for the history view */
function buildHistoryGroup(dateString, tasks) {
  const today     = getTodayDateString();
  const yesterday = getPreviousDateString(today);

  let dateLabel = formatDateToReadable(dateString);
  if (dateString === today)     dateLabel = `Today — ${dateLabel}`;
  if (dateString === yesterday) dateLabel = `Yesterday — ${dateLabel}`;

  const groupDiv = document.createElement('div');
  groupDiv.className = 'history-group';

  const heading = document.createElement('h2');
  heading.className = 'history-group-heading';
  heading.textContent = dateLabel;
  groupDiv.appendChild(heading);

  const ul = document.createElement('ul');
  ul.className = 'task-list history-task-list';
  ul.setAttribute('role', 'list');

  tasks.forEach(task => {
    ul.appendChild(buildTaskListItem(task));
  });

  groupDiv.appendChild(ul);
  return groupDiv;
}

/** Get the date string for the day before a given "YYYY-MM-DD" string */
function getPreviousDateString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

/** Update the 3 summary cards in the header */
function updateSummaryCounters() {
  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'completed').length;
  const pending   = total - completed;

  totalCountEl.textContent     = total;
  pendingCountEl.textContent   = pending;
  completedCountEl.textContent = completed;
}

/*UI HELPER FUNCTIONS*/

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

/** Escape HTML to prevent XSS */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/*EVENT LISTENERS*/

// Add task
addTaskBtn.addEventListener('click', addTask);

// Enter key to add task
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// Clear error on typing
taskInput.addEventListener('input', () => {
  if (taskInput.value.trim()) hideError();
});

// Validate due date live as user picks
dueDateInput.addEventListener('change', () => {
  if (!isDueDateValid(dueDateInput.value)) {
    showError('Due date cannot be in the past. Please choose today or a future date.');
  } else {
    hideError();
  }
});

// View toggle buttons
viewToggleButtons.forEach(btn => {
  btn.addEventListener('click', () => setActiveView(btn.dataset.view));
});

// Status filter buttons
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => setStatusFilter(btn.dataset.filter));
});

// Clear completed
clearCompletedBtn.addEventListener('click', clearCompletedTasks);

// History date filter picker
historyDatePicker.addEventListener('change', () => {
  historyDateFilter = historyDatePicker.value || null;
  clearDateFilterBtn.classList.toggle('hidden', !historyDateFilter);
  renderHistoryView();
});

// Clear date filter button
clearDateFilterBtn.addEventListener('click', () => {
  historyDateFilter      = null;
  historyDatePicker.value = '';
  clearDateFilterBtn.classList.add('hidden');
  renderHistoryView();
});

function initApp() {
  // Set minimum allowed due date to today (prevent past dates in picker)
  dueDateInput.min = getTodayDateString();

  allTasks = loadTasksFromStorage();
  renderTaskListView();
  updateSummaryCounters();
  taskInput.focus();
}

initApp();