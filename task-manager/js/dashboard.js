// ===== Dashboard Module =====

let projects = [];
let users = [];

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const user = requireAuth();
    if (!user) return;

    // Mostrar usuario actual
    document.getElementById('currentUserDisplay').textContent = user.username;

    // Cargar proyectos
    loadProjects();

    // Event Listeners
    document.getElementById('newProjectForm').addEventListener('submit', handleNewProject);
    document.getElementById('newUserForm').addEventListener('submit', handleNewUser);
});

// --- Projects Logic ---

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');

    try {
        // Intentar cargar de Supabase
        if (isSupabaseConfigured() && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            projects = data || [];
        } else {
            // Fallback a localStorage
            const savedProjects = localStorage.getItem('taskManager_projects');
            projects = savedProjects ? JSON.parse(savedProjects) : [];
        }

        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        // Mostrar error en el grid
        grid.innerHTML = `<div class="empty-state">Error al cargar proyectos.</div>`;
    }
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');

    if (projects.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No hay proyectos activos</p>
                <button class="btn-primary" onclick="openNewProjectModal()">Crea tu primer proyecto</button>
            </div>
        `;
        return;
    }

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

    grid.innerHTML = html;
}

function openProject(projectId) {
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
        if (isSupabaseConfigured() && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('projects')
                .insert([newProject])
                .select()
                .single();

            if (error) throw error;
            projects.unshift(data);
        } else {
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

// --- User Management Logic ---

async function openUserModal() {
    document.getElementById('userModal').classList.add('show');
    loadUsers();
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
}

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="3">Cargando usuarios...</td></tr>';

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .order('username');

            if (error) throw error;
            users = data || [];
        } else {
            // Fallback a TEMP_USERS
            users = Object.entries(TEMP_USERS).map(([username, data]) => ({
                username,
                name: data.name,
                password: data.password
            }));
        }
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="3">Error al cargar usuarios.</td></tr>';
    }
}

function renderUsers() {
    const tableBody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No hay otros usuarios.</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>${escapeHtml(user.name)}</td>
            <td>
                <span class="password-hidden" onclick="togglePassword(this, '${escapeHtml(user.password)}')">••••••••</span>
            </td>
        </tr>
    `).join('');
}

async function handleNewUser(e) {
    e.preventDefault();

    const username = document.getElementById('newUsername').value.trim().toUpperCase();
    const name = document.getElementById('newUserNameReal').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();

    const newUser = {
        username: username,
        name: name,
        password: password
    };

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('users')
                .insert([newUser]);

            if (error) throw error;
        } else {
            alert('Supabase no configurado. Solo se puede agregar en modo real.');
            return;
        }

        document.getElementById('newUserForm').reset();
        loadUsers();
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error al crear el usuario. Probablemente ya existe.');
    }
}

function togglePassword(element, password) {
    if (element.textContent === '••••••••') {
        element.textContent = password;
        element.classList.add('password-visible');
    } else {
        element.textContent = '••••••••';
        element.classList.remove('password-visible');
    }
}

// --- Utilities ---

function generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// UI Helpers
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeNewProjectModal();
        closeUserModal();
    }
});

