// ===== Board Module =====

let currentProject = null;
let tasks = [];

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const user = requireAuth();
    if (!user) return;

    document.getElementById('currentUserDisplay').textContent = user.username;

    // Obtener proyecto actual
    const projectId = sessionStorage.getItem('currentProject');
    if (!projectId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Cargar proyecto y tareas
    loadProjectAndTasks(projectId);

    // Configurar drag & drop
    setupDragAndDrop();

    // Form de tareas
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
});

async function loadProjectAndTasks(projectId) {
    try {
        if (isSupabaseConfigured() && supabaseClient) {
            // Cargar proyecto
            const { data: projectData } = await supabaseClient
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectData) {
                currentProject = projectData;
            }

            // Cargar tareas
            const { data: tasksData } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });

            if (tasksData) {
                tasks = tasksData;
            }
        } else {
            // Cargar de localStorage
            const savedProjects = localStorage.getItem('taskManager_projects');
            if (savedProjects) {
                const projects = JSON.parse(savedProjects);
                currentProject = projects.find(p => p.id === projectId);
            }

            const savedTasks = localStorage.getItem(`taskManager_tasks_${projectId}`);
            if (savedTasks) {
                tasks = JSON.parse(savedTasks);
            } else {
                // Cargar tareas de ejemplo para el proyecto "task-manager"
                if (projectId === 'task-manager') {
                    tasks = getDefaultTasks();
                    saveTasks();
                }
            }
        }

        // Actualizar UI
        document.getElementById('projectTitle').textContent = currentProject?.name || 'Proyecto';
        renderTasks();

    } catch (error) {
        console.error('Error loading project:', error);
        document.getElementById('projectTitle').textContent = 'Error al cargar';
    }
}

function getDefaultTasks() {
    return [
        { id: 1, title: "Definir visión y objetivos del proyecto", status: "pending", priority: "alta", tags: ["planificación"], notes: "", assigned_to: [] },
        { id: 2, title: "Documentar requerimientos funcionales", status: "pending", priority: "alta", tags: ["requerimientos"], notes: "", assigned_to: [] },
        { id: 3, title: "Documentar requerimientos no funcionales", status: "pending", priority: "alta", tags: ["requerimientos"], notes: "", assigned_to: [] },
        { id: 4, title: "Crear hoja de ruta (Roadmap)", status: "pending", priority: "alta", tags: ["planificación"], notes: "", assigned_to: [] },
        { id: 5, title: "Definir stack tecnológico", status: "pending", priority: "alta", tags: ["técnico"], notes: "", assigned_to: [] },
        { id: 6, title: "Diseñar arquitectura del sistema", status: "pending", priority: "media", tags: ["arquitectura"], notes: "", assigned_to: [] },
        { id: 7, title: "Crear wireframes/prototipos UI", status: "pending", priority: "media", tags: ["diseño"], notes: "", assigned_to: [] },
        { id: 8, title: "Configurar entorno de desarrollo", status: "pending", priority: "media", tags: ["setup"], notes: "", assigned_to: [] },
        { id: 9, title: "Diseñar modelo de base de datos", status: "pending", priority: "media", tags: ["base de datos"], notes: "", assigned_to: [] },
        { id: 10, title: "Planificar primer sprint", status: "pending", priority: "media", tags: ["sprint"], notes: "", assigned_to: [] },
        { id: 11, title: "Definir MVP", status: "pending", priority: "alta", tags: ["MVP"], notes: "", assigned_to: [] },
        { id: 12, title: "Crear documentación inicial", status: "pending", priority: "baja", tags: ["documentación"], notes: "", assigned_to: [] }
    ];
}

function renderTasks() {
    const pending = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const completed = tasks.filter(t => t.status === 'completed');

    document.getElementById('columnPending').innerHTML = pending.map(renderTaskCard).join('');
    document.getElementById('columnProgress').innerHTML = inProgress.map(renderTaskCard).join('');
    document.getElementById('columnCompleted').innerHTML = completed.map(renderTaskCard).join('');

    // Actualizar contadores
    document.getElementById('countPending').textContent = pending.length;
    document.getElementById('countProgress').textContent = inProgress.length;
    document.getElementById('countCompleted').textContent = completed.length;

    // Re-aplicar listeners de drag
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function renderTaskCard(task) {
    const priorityClass = `priority-${task.priority}`;
    const tags = (task.tags || []).map(t => `<span class="task-tag">${escapeHtml(t)}</span>`).join('');
    const assignees = (task.assigned_to || []).map(a => `<span class="assignee-badge">${escapeHtml(a)}</span>`).join('');

    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" ondblclick="editTask(${task.id})">
            <h4>${escapeHtml(task.title)}</h4>
            <div class="task-meta">
                <span class="task-priority ${priorityClass}">${task.priority}</span>
                <div class="task-assignees">${assignees}</div>
            </div>
            ${tags ? `<div class="task-tags">${tags}</div>` : ''}
        </div>
    `;
}

// ===== Drag & Drop =====
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column-tasks');

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedTaskId = null;

function handleDragStart(e) {
    draggedTaskId = parseInt(e.target.dataset.taskId);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column-tasks').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const newStatus = e.currentTarget.dataset.status;

    if (draggedTaskId && newStatus) {
        await updateTaskStatus(draggedTaskId, newStatus);
    }
}

async function updateTaskStatus(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    task.status = newStatus;

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('tasks')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;
        } else {
            saveTasks();
        }

        renderTasks();
        updateProjectStats();

    } catch (error) {
        console.error('Error updating task:', error);
        task.status = oldStatus; // Revertir
        renderTasks();
    }
}

// ===== Task CRUD =====
function openTaskModal(status = 'pending') {
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskStatus').value = status;
    document.getElementById('taskModal').classList.add('show');
    document.getElementById('taskTitle').focus();
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = 'Editar Tarea';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskNotes').value = task.notes || '';
    document.getElementById('taskPriority').value = task.priority || 'media';
    document.getElementById('taskTags').value = (task.tags || []).join(', ');
    document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        status: document.getElementById('taskStatus').value,
        notes: document.getElementById('taskNotes').value.trim(),
        priority: document.getElementById('taskPriority').value,
        tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
        assigned_to: []
    };

    try {
        if (taskId) {
            // Editar tarea existente
            const index = tasks.findIndex(t => t.id === parseInt(taskId));
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...taskData };

                if (isSupabaseConfigured() && supabaseClient) {
                    await supabaseClient
                        .from('tasks')
                        .update({ ...taskData, updated_at: new Date().toISOString() })
                        .eq('id', parseInt(taskId));
                }
            }
        } else {
            // Nueva tarea
            const newTask = {
                id: Date.now(),
                ...taskData,
                project_id: currentProject?.id,
                created_at: new Date().toISOString()
            };

            tasks.push(newTask);

            if (isSupabaseConfigured() && supabaseClient) {
                await supabaseClient.from('tasks').insert([newTask]);
            }
        }

        saveTasks();
        renderTasks();
        updateProjectStats();
        closeTaskModal();

    } catch (error) {
        console.error('Error saving task:', error);
        alert('Error al guardar la tarea');
    }
}

function saveTasks() {
    if (!isSupabaseConfigured()) {
        const projectId = sessionStorage.getItem('currentProject');
        localStorage.setItem(`taskManager_tasks_${projectId}`, JSON.stringify(tasks));
    }
}

function updateProjectStats() {
    const stats = {
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length
    };

    // Actualizar en localStorage si no hay Supabase
    if (!isSupabaseConfigured() && currentProject) {
        const savedProjects = localStorage.getItem('taskManager_projects');
        if (savedProjects) {
            const projects = JSON.parse(savedProjects);
            const index = projects.findIndex(p => p.id === currentProject.id);
            if (index !== -1) {
                projects[index].tasks = stats;
                localStorage.setItem('taskManager_projects', JSON.stringify(projects));
            }
        }
    }
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// ===== Utilities =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
});
