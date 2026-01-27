// ===== Dashboard Module =====

// Proyectos de ejemplo (se reemplazará con Supabase)
let projects = [
    {
        id: 'bendito-cafe',
        name: 'Bendito Café',
        description: 'Sistema de gestión para cafetería',
        tasks: { pending: 8, inProgress: 3, completed: 1 },
        createdBy: 'EHR051'
    },
    {
        id: 'task-manager',
        name: 'Task Manager',
        description: 'Administrador de tareas colaborativo',
        tasks: { pending: 12, inProgress: 0, completed: 0 },
        createdBy: 'EHR051'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const user = requireAuth();
    if (!user) return;

    // Mostrar usuario actual
    document.getElementById('currentUserDisplay').textContent = user.username;

    // Cargar proyectos
    loadProjects();

    // Form de nuevo proyecto
    document.getElementById('newProjectForm').addEventListener('submit', handleNewProject);
});

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');

    try {
        // Si Supabase está configurado, cargar de la DB
        if (isSupabaseConfigured() && supabase) {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                projects = data;
            }
        } else {
            // Cargar de localStorage si existe
            const savedProjects = localStorage.getItem('taskManager_projects');
            if (savedProjects) {
                projects = JSON.parse(savedProjects);
            }
        }

        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        renderProjects();
    }
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');

    let html = projects.map(project => `
        <div class="project-card" onclick="openProject('${project.id}')">
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.description || 'Sin descripción')}</p>
            <div class="project-stats">
                <span class="stat-pending">
                    <strong>${project.tasks?.pending || 0}</strong> pendientes
                </span>
                <span class="stat-progress">
                    <strong>${project.tasks?.inProgress || 0}</strong> en progreso
                </span>
                <span class="stat-done">
                    <strong>${project.tasks?.completed || 0}</strong> completadas
                </span>
            </div>
        </div>
    `).join('');

    // Botón de nuevo proyecto
    html += `
        <div class="project-card btn-new-project" onclick="openNewProjectModal()">
            <span class="icon">+</span>
            <span>Nuevo Proyecto</span>
        </div>
    `;

    grid.innerHTML = html;
}

function openProject(projectId) {
    // Guardar proyecto seleccionado
    sessionStorage.setItem('currentProject', projectId);
    window.location.href = 'board.html';
}

function openNewProjectModal() {
    document.getElementById('newProjectModal').classList.add('show');
    document.getElementById('projectName').focus();
}

function closeNewProjectModal() {
    document.getElementById('newProjectModal').classList.remove('show');
    document.getElementById('newProjectForm').reset();
}

async function handleNewProject(e) {
    e.preventDefault();

    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    const user = getCurrentUser();

    const newProject = {
        id: generateId(),
        name: name,
        description: description,
        tasks: { pending: 0, inProgress: 0, completed: 0 },
        createdBy: user.username,
        created_at: new Date().toISOString()
    };

    try {
        if (isSupabaseConfigured() && supabase) {
            const { data, error } = await supabase
                .from('projects')
                .insert([newProject])
                .select()
                .single();

            if (error) throw error;
            projects.unshift(data);
        } else {
            // Guardar en localStorage
            projects.unshift(newProject);
            localStorage.setItem('taskManager_projects', JSON.stringify(projects));
        }

        closeNewProjectModal();
        renderProjects();
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Error al crear el proyecto');
    }
}

// ===== Utilities =====
function generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeNewProjectModal();
    }
});
