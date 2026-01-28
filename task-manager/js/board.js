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

    // Form de edición de proyecto
    document.getElementById('editProjectForm').addEventListener('submit', handleProjectUpdate);
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

        // Mostrar Repo URL
        const repoContainer = document.getElementById('repoContainer');
        if (currentProject?.repo_url) {
            repoContainer.style.display = 'flex';
            document.getElementById('repoUrlText').textContent = currentProject.repo_url;
        } else {
            repoContainer.style.display = 'none';
        }

        renderTasks();
    } catch (error) {
        console.error('Error loading project:', error);
        document.getElementById('projectTitle').textContent = 'Error al cargar';
    }
}

function copyCloneCommand() {
    if (!currentProject || !currentProject.repo_url) return;
    const command = `git clone ${currentProject.repo_url}`;
    navigator.clipboard.writeText(command).then(() => {
        const btn = document.querySelector('.btn-copy-repo');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copiado';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
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
    const searchQuery = document.getElementById('taskSearch')?.value.toLowerCase() || '';

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
    );

    const pending = filteredTasks.filter(t => t.status === 'pending');
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress');
    const testing = filteredTasks.filter(t => t.status === 'testing');
    const production = filteredTasks.filter(t => t.status === 'production');
    const completed = filteredTasks.filter(t => t.status === 'completed');

    const renderColumn = (tasks, containerId) => {
        const container = document.getElementById(containerId);
        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-column-text">No hay tareas</div>';
        } else {
            container.innerHTML = tasks.map(renderTaskCard).join('');
        }
    };

    renderColumn(pending, 'columnPending');
    renderColumn(inProgress, 'columnProgress');
    renderColumn(testing, 'columnTesting');
    renderColumn(production, 'columnProduction');
    renderColumn(completed, 'columnCompleted');

    // Actualizar contadores
    document.getElementById('countPending').textContent = pending.length;
    document.getElementById('countProgress').textContent = inProgress.length;
    document.getElementById('countTesting').textContent = testing.length;
    document.getElementById('countProduction').textContent = production.length;
    document.getElementById('countCompleted').textContent = completed.length;

    // Re-aplicar listeners de drag
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleSearch() {
    renderTasks();
}

function renderTaskCard(task) {
    const priorityClass = `priority-${task.priority}`;
    const tags = (task.tags || []).map(t => `<span class="task-tag">${escapeHtml(t)}</span>`).join('');
    const assignees = (task.assigned_to || []).map(a => `<span class="assignee-badge">${escapeHtml(a)}</span>`).join('');

    // Calcular clase de fecha
    let dueDateHtml = '';
    if (task.due_date) {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.due_date < today && task.status !== 'completed';
        const isUrgent = task.due_date === today && task.status !== 'completed';
        const dateClass = isOverdue ? 'overdue' : (isUrgent ? 'urgent' : '');
        dueDateHtml = `<div class="due-date-badge ${dateClass}">📅 ${task.due_date}</div>`;
    }

    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" ondblclick="editTask(${task.id})">
            <h4>${escapeHtml(task.title)}</h4>
            <div class="task-meta">
                <span class="task-priority ${priorityClass}">${task.priority}</span>
                <div class="task-assignees">${assignees}</div>
            </div>
            ${dueDateHtml}
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

            // Log activity
            logActivity(currentProject.id, taskId, 'cambio_estado', { de: oldStatus, a: newStatus });
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

// ===== Advanced Features Helpers =====

function switchTaskDetailTab(tab) {
    document.querySelectorAll('.task-advanced-sections .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.task-advanced-sections .tab-content').forEach(content => content.classList.remove('active'));

    if (tab === 'comments') {
        document.querySelector('.task-advanced-sections .tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('taskCommentsSection').classList.add('active');
    } else {
        document.querySelector('.task-advanced-sections .tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('taskHistorySection').classList.add('active');
    }
}

async function loadComments(taskId) {
    const list = document.getElementById('commentsList');
    list.innerHTML = 'Cargando...';

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('task_comments')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                list.innerHTML = '<p class="empty-text small">Sin comentarios aún.</p>';
                return;
            }

            list.innerHTML = data.map(c => `
                <div class="comment-item">
                    <div class="comment-meta">${escapeHtml(c.username)} • ${new Date(c.created_at).toLocaleString()}</div>
                    <div class="comment-content">${escapeHtml(c.content)}</div>
                </div>
            `).join('');
            list.scrollTop = list.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

async function handleAddComment() {
    const input = document.getElementById('newCommentInput');
    const content = input.value.trim();
    const taskId = document.getElementById('taskId').value;
    const user = getCurrentUser();

    if (!content || !taskId) return;

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('task_comments')
                .insert([{
                    task_id: parseInt(taskId),
                    username: user.username,
                    content: content
                }]);

            if (error) throw error;
            input.value = '';
            loadComments(taskId);
            logActivity(currentProject.id, taskId, 'comentario', { extracto: content.substring(0, 30) });
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

async function loadHistory(taskId) {
    const list = document.getElementById('historyList');
    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('activity_log')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            list.innerHTML = data.map(log => `
                <div class="history-item">
                    <span class="history-meta">${new Date(log.created_at).toLocaleString()} - ${escapeHtml(log.username)}</span>
                    <div>${formatAction(log.action, log.details)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function formatAction(action, details) {
    switch (action) {
        case 'creacion': return `Creó la tarea: "<strong>${escapeHtml(details.titulo)}</strong>"`;
        case 'cambio_estado': return `Movió de <i>${details.de}</i> a <i>${details.a}</i>`;
        case 'comentario': return `Comentó: "${escapeHtml(details.extracto)}..."`;
        default: return action;
    }
}

async function logActivity(projectId, taskId, action, details) {
    const user = getCurrentUser();
    try {
        if (isSupabaseConfigured() && supabaseClient) {
            await supabaseClient
                .from('activity_log')
                .insert([{
                    project_id: projectId,
                    task_id: taskId ? parseInt(taskId) : null,
                    username: user.username,
                    action: action,
                    details: details
                }]);
        }
    } catch (error) {
        console.warn('Error logging activity:', error);
    }
}

// ===== Task CRUD =====
async function openTaskModal(status = 'pending') {
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskStatus').value = status;
    document.getElementById('taskDueDate').value = '';

    // Ocultar secciones avanzadas para nuevas tareas
    document.querySelector('.task-advanced-sections').style.display = 'none';

    await loadProjectMembers();

    document.getElementById('taskModal').classList.add('show');
    document.getElementById('taskTitle').focus();
}

async function loadProjectMembers() {
    const listContainer = document.getElementById('assigneesList');
    listContainer.innerHTML = 'Cargando usuarios...';

    try {
        let members = [];
        if (isSupabaseConfigured() && supabaseClient) {
            // Obtener miembros del proyecto
            const { data, error } = await supabaseClient
                .from('project_members')
                .select('username')
                .eq('project_id', currentProject?.id);

            if (error) throw error;
            members = data.map(m => m.username);
        }

        listContainer.innerHTML = members.map(username => `
            <label class="checkbox-item">
                <input type="checkbox" name="assigned_to" value="${username}">
                <span>${username}</span>
            </label>
        `).join('');
    } catch (error) {
        console.error('Error loading members:', error);
        listContainer.innerHTML = 'Error al cargar miembros.';
    }
}

async function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = 'Editar Tarea';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskNotes').value = task.notes || '';
    document.getElementById('taskPriority').value = task.priority || 'media';
    document.getElementById('taskTags').value = (task.tags || []).join(', ');
    document.getElementById('taskDueDate').value = task.due_date || '';

    // Mostrar secciones avanzadas
    document.querySelector('.task-advanced-sections').style.display = 'block';
    switchTaskDetailTab('comments');
    loadComments(task.id);
    loadHistory(task.id);

    await loadProjectMembers();

    // Marcar los ya asignados
    const checkboxes = document.querySelectorAll('input[name="assigned_to"]');
    const assigned = task.assigned_to || [];
    checkboxes.forEach(cb => {
        if (assigned.includes(cb.value)) cb.checked = true;
    });

    document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;

    // Obtener asignados
    const assignedTo = Array.from(document.querySelectorAll('input[name="assigned_to"]:checked'))
        .map(cb => cb.value);

    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        status: document.getElementById('taskStatus').value,
        notes: document.getElementById('taskNotes').value.trim(),
        priority: document.getElementById('taskPriority').value,
        due_date: document.getElementById('taskDueDate').value || null,
        tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
        assigned_to: assignedTo
    };



    try {
        if (taskId) {
            // Editar tarea existente
            const index = tasks.findIndex(t => t.id === parseInt(taskId));
            if (index !== -1) {
                const oldTask = { ...tasks[index] };
                tasks[index] = { ...tasks[index], ...taskData };

                if (isSupabaseConfigured() && supabaseClient) {
                    await supabaseClient
                        .from('tasks')
                        .update({ ...taskData, updated_at: new Date().toISOString() })
                        .eq('id', parseInt(taskId));

                    // Loggeamos si hubo cambios importantes
                    if (oldTask.status !== taskData.status) {
                        logActivity(currentProject.id, taskId, 'cambio_estado', { de: oldTask.status, a: taskData.status });
                    }
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
                const { data, error } = await supabaseClient.from('tasks').insert([newTask]).select().single();
                if (!error && data) {
                    logActivity(currentProject.id, data.id, 'creacion', { titulo: data.title });
                }
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
        testing: tasks.filter(t => t.status === 'testing').length,
        production: tasks.filter(t => t.status === 'production').length,
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

// ===== Project Edit =====
function openEditProjectModal() {
    if (!currentProject) return;

    document.getElementById('editProjectName').value = currentProject.name;
    document.getElementById('editProjectDesc').value = currentProject.description || '';
    document.getElementById('editProjectRepo').value = currentProject.repo_url || '';

    document.getElementById('editProjectModal').classList.add('show');
}

function closeEditProjectModal() {
    document.getElementById('editProjectModal').classList.remove('show');
}

async function handleProjectUpdate(e) {
    e.preventDefault();
    if (!currentProject) return;

    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();
    const repoUrl = document.getElementById('editProjectRepo').value.trim();

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('projects')
                .update({
                    name: name,
                    description: description,
                    repo_url: repoUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentProject.id);

            if (error) throw error;
        }

        // Actualizar datos locales
        currentProject.name = name;
        currentProject.description = description;
        currentProject.repo_url = repoUrl;

        // Actualizar UI
        document.getElementById('projectTitle').textContent = name;

        const repoContainer = document.getElementById('repoContainer');
        if (repoUrl) {
            repoContainer.style.display = 'flex';
            document.getElementById('repoUrlText').textContent = repoUrl;
        } else {
            repoContainer.style.display = 'none';
        }

        closeEditProjectModal();
    } catch (error) {
        console.error('Error updating project:', error);
        alert('Error al actualizar el proyecto');
    }
}

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeEditProjectModal();
    }
});
