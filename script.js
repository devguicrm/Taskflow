const STORAGE_KEY = 'taskflow_tasks_v1';
const THEME_KEY = 'taskflow_theme_v1';

let tasks = loadTasks();
let statusFilter = 'all';

const elements = {
  themeToggle: document.getElementById('themeToggle'),
  openTaskModal: document.getElementById('openTaskModal'),
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  priorityFilter: document.getElementById('priorityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  totalTasks: document.getElementById('totalTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  completedTasks: document.getElementById('completedTasks'),
  lateTasks: document.getElementById('lateTasks'),
  sidebarProgress: document.getElementById('sidebarProgress'),
  sidebarProgressBar: document.getElementById('sidebarProgressBar'),
  completeAll: document.getElementById('completeAll'),
  clearCompleted: document.getElementById('clearCompleted'),
  toast: document.getElementById('toast'),
  modalTitle: document.getElementById('modalTitle')
};

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function initTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = theme;
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  elements.themeToggle.innerHTML = theme === 'dark'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

function isToday(dateString) {
  if (!dateString) return false;

  const today = new Date().toISOString().slice(0, 10);
  return dateString === today;
}

function isLate(task) {
  if (!task.dueDate || task.completed) return false;

  const today = new Date().toISOString().slice(0, 10);
  return task.dueDate < today;
}

function getFilteredTasks() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const priority = elements.priorityFilter.value;
  const category = elements.categoryFilter.value;

  return tasks
    .filter(task => {
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (statusFilter === 'today' && !isToday(task.dueDate)) return false;
      if (statusFilter === 'late' && !isLate(task)) return false;
      if (priority !== 'all' && task.priority !== priority) return false;
      if (category !== 'all' && task.category !== category) return false;

      const searchable = `${task.title} ${task.description} ${task.category} ${task.tag}`.toLowerCase();
      return searchable.includes(search);
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt);
}

function renderTasks() {
  const filtered = getFilteredTasks();

  elements.taskList.innerHTML = '';
  elements.emptyState.classList.toggle('show', filtered.length === 0);

  filtered.forEach(task => {
    const item = document.createElement('article');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;

    const priorityClass = task.priority === 'Alta' ? 'high' : task.priority === 'Média' ? 'medium' : 'low';
    const dateLabel = task.dueDate ? formatDate(task.dueDate) : 'Sem prazo';
    const lateBadge = isLate(task)
      ? '<span class="badge high"><i class="fa-solid fa-triangle-exclamation"></i> Atrasada</span>'
      : '';

    item.innerHTML = `
      <input class="task-check" type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Concluir tarefa">

      <div class="task-content">
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description || 'Sem descrição adicionada.')}</p>

        <div class="task-meta">
          <span class="badge"><i class="fa-solid fa-folder"></i> ${escapeHtml(task.category)}</span>
          <span class="badge ${priorityClass}"><i class="fa-solid fa-flag"></i> ${task.priority}</span>
          <span class="badge"><i class="fa-solid fa-calendar-days"></i> ${dateLabel}</span>
          ${task.tag ? `<span class="badge"><i class="fa-solid fa-tag"></i> ${escapeHtml(task.tag)}</span>` : ''}
          ${lateBadge}
        </div>
      </div>

      <div class="task-actions">
        <button class="edit" aria-label="Editar tarefa">
          <i class="fa-solid fa-pen"></i>
        </button>

        <button class="delete" aria-label="Excluir tarefa">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    item.querySelector('.task-check').addEventListener('change', () => toggleTask(task.id));
    item.querySelector('.edit').addEventListener('click', () => openEditModal(task.id));
    item.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));

    elements.taskList.appendChild(item);
  });

  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const late = tasks.filter(isLate).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  elements.totalTasks.textContent = total;
  elements.pendingTasks.textContent = pending;
  elements.completedTasks.textContent = completed;
  elements.lateTasks.textContent = late;
  elements.sidebarProgress.textContent = `${progress}%`;
  elements.sidebarProgressBar.style.width = `${progress}%`;
}

function openModal() {
  elements.taskModal.classList.add('open');
  elements.taskModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.taskModal.classList.remove('open');
  elements.taskModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  elements.taskForm.reset();
  document.getElementById('taskId').value = '';
  elements.modalTitle.textContent = 'Nova tarefa';
}

function openCreateModal() {
  closeModal();
  elements.modalTitle.textContent = 'Nova tarefa';
  openModal();
}

function openEditModal(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDescription').value = task.description;
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDueDate').value = task.dueDate;
  document.getElementById('taskTag').value = task.tag;

  elements.modalTitle.textContent = 'Editar tarefa';
  openModal();
}

function handleSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('taskId').value;

  const payload = {
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value,
    tag: document.getElementById('taskTag').value.trim()
  };

  if (id) {
    tasks = tasks.map(task => task.id === id ? { ...task, ...payload } : task);
    showToast('Tarefa atualizada com sucesso!');
  } else {
    tasks.unshift({
      id: crypto.randomUUID(),
      ...payload,
      completed: false,
      createdAt: Date.now()
    });

    showToast('Tarefa criada com sucesso!');
  }

  saveTasks();
  renderTasks();
  closeModal();
}

function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);

  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const confirmed = confirm('Deseja excluir esta tarefa?');
  if (!confirmed) return;

  tasks = tasks.filter(task => task.id !== id);

  saveTasks();
  renderTasks();
  showToast('Tarefa excluída.');
}

function completeAllTasks() {
  if (!tasks.length) return;

  tasks = tasks.map(task => ({ ...task, completed: true }));

  saveTasks();
  renderTasks();
  showToast('Todas as tarefas foram concluídas.');
}

function clearCompletedTasks() {
  const completedCount = tasks.filter(task => task.completed).length;

  if (!completedCount) {
    showToast('Nenhuma tarefa concluída para limpar.');
    return;
  }

  const confirmed = confirm('Deseja remover todas as tarefas concluídas?');
  if (!confirmed) return;

  tasks = tasks.filter(task => !task.completed);

  saveTasks();
  renderTasks();
  showToast('Tarefas concluídas removidas.');
}

function formatDate(dateString) {
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2300);
}

function bindEvents() {
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.openTaskModal.addEventListener('click', openCreateModal);
  elements.taskForm.addEventListener('submit', handleSubmit);
  elements.searchInput.addEventListener('input', renderTasks);
  elements.priorityFilter.addEventListener('change', renderTasks);
  elements.categoryFilter.addEventListener('change', renderTasks);
  elements.completeAll.addEventListener('click', completeAllTasks);
  elements.clearCompleted.addEventListener('click', clearCompletedTasks);

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', closeModal);
  });

  document.querySelectorAll('[data-status-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-status-filter]').forEach(item => item.classList.remove('active'));

      button.classList.add('active');
      statusFilter = button.dataset.statusFilter;

      renderTasks();
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.taskModal.classList.contains('open')) {
      closeModal();
    }
  });
}

initTheme();
bindEvents();
renderTasks();
