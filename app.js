/* =========================================
   TaskFlow – app.js
   Core JS Todo with Task Manager
   =========================================
   Data Shape (localStorage key: "taskflow_tasks"):
   tasks = [
     { id: string, description: string, status: "pending"|"completed", createdAt: number }
   ]
   ========================================= */

'use strict';

/* ---- Storage Key ---- */
const STORAGE_KEY = 'taskflow_tasks';

/* ---- State ---- */
let allTasks        = [];   // Full task array
let activeFilter    = 'all'; // Current filter

/* ---- DOM References ---- */
const taskInput          = document.getElementById('taskInput');
const addTaskBtn         = document.getElementById('addTaskBtn');
const taskList           = document.getElementById('taskList');
const emptyState         = document.getElementById('emptyState');
const errorMessage       = document.getElementById('errorMessage');
const clearCompletedBtn  = document.getElementById('clearCompletedBtn');
const filterButtons      = document.querySelectorAll('.filter-btn');
const totalCountEl       = document.getElementById('totalCount');
const pendingCountEl     = document.getElementById('pendingCount');
const completedCountEl   = document.getElementById('completedCount');

/* =========================================
   STORAGE HELPERS
   ========================================= */

/** Load tasks from localStorage */
function loadTasksFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/** Save current tasks array to localStorage */
function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
}

/* =========================================
   TASK CRUD OPERATIONS
   ========================================= */

/** Create a new task object */
function createTask(description) {
  return {
    id:          crypto.randomUUID(),
    description: description.trim(),
    status:      'pending',
    createdAt:   Date.now()
  };
}

/** Add a new task */
function addTask() {
  const description = taskInput.value.trim();

  if (!description) {
    showError('Please enter a task description.');
    taskInput.focus();
    return;
  }

  hideError();

  const newTask = createTask(description);
  allTasks.unshift(newTask); // Add to beginning of list
  saveTasksToStorage();

  taskInput.value = '';
  taskInput.focus();

  renderTaskList();
  updateSummary();
}

/** Toggle a task's status between pending and completed */
function toggleTaskStatus(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = task.status === 'pending' ? 'completed' : 'pending';
  saveTasksToStorage();
  renderTaskList();
  updateSummary();
}

/** Delete a task permanently */
function deleteTask(taskId) {
  allTasks = allTasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderTaskList();
  updateSummary();
}

/** Delete all completed tasks */
function clearCompletedTasks() {
  allTasks = allTasks.filter(t => t.status !== 'completed');
  saveTasksToStorage();
  renderTaskList();
  updateSummary();
}

/* =========================================
   FILTER
   ========================================= */

/** Get the filtered task list based on activeFilter */
function getFilteredTasks() {
  if (activeFilter === 'pending')   return allTasks.filter(t => t.status === 'pending');
  if (activeFilter === 'completed') return allTasks.filter(t => t.status === 'completed');
  return allTasks;
}

/** Change the active filter */
function setFilter(filter) {
  activeFilter = filter;

  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTaskList();
}

/* =========================================
   RENDER
   ========================================= */

/** Build a single task list item element */
function buildTaskElement(task) {
  const isCompleted = task.status === 'completed';

  const li = document.createElement('li');
  li.className = `task-item${isCompleted ? ' is-completed' : ''}`;
  li.dataset.id = task.id;
  li.setAttribute('role', 'listitem');

  li.innerHTML = `
    <div class="task-checkbox" role="checkbox"
         aria-checked="${isCompleted}"
         aria-label="Mark as ${isCompleted ? 'pending' : 'completed'}"
         title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}">
      <span class="task-checkbox-tick">✓</span>
    </div>

    <span class="task-text">${escapeHTML(task.description)}</span>

    <span class="task-status-badge ${isCompleted ? 'status-completed' : 'status-pending'}">
      ${isCompleted ? 'Done' : 'Pending'}
    </span>

    <button class="delete-btn" aria-label="Delete task" title="Delete task">✕</button>
  `;

  /* Checkbox click → toggle status */
  li.querySelector('.task-checkbox').addEventListener('click', () => {
    toggleTaskStatus(task.id);
  });

  /* Delete button click → delete task */
  li.querySelector('.delete-btn').addEventListener('click', () => {
    deleteTask(task.id);
  });

  return li;
}

/** Render the visible task list */
function renderTaskList() {
  const visibleTasks = getFilteredTasks();

  taskList.innerHTML = '';

  if (visibleTasks.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    visibleTasks.forEach(task => {
      taskList.appendChild(buildTaskElement(task));
    });
  }

  /* Show "Clear Completed" only if completed tasks exist */
  const hasCompleted = allTasks.some(t => t.status === 'completed');
  clearCompletedBtn.classList.toggle('hidden', !hasCompleted);
}

/** Update the three summary counters */
function updateSummary() {
  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'completed').length;
  const pending   = total - completed;

  totalCountEl.textContent     = total;
  pendingCountEl.textContent   = pending;
  completedCountEl.textContent = completed;
}

/* =========================================
   UI HELPERS
   ========================================= */

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

/** Prevent XSS by escaping HTML characters */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =========================================
   EVENT LISTENERS
   ========================================= */

/** Add task on button click */
addTaskBtn.addEventListener('click', addTask);

/** Add task on Enter key press */
taskInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') addTask();
});

/** Hide error when user starts typing */
taskInput.addEventListener('input', () => {
  if (taskInput.value.trim()) hideError();
});

/** Filter buttons */
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

/** Clear completed tasks */
clearCompletedBtn.addEventListener('click', clearCompletedTasks);

/* =========================================
   INITIALISE APP
   ========================================= */

function initApp() {
  allTasks = loadTasksFromStorage();
  renderTaskList();
  updateSummary();
  taskInput.focus();
}

initApp();
