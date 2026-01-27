// ===== Dashboard Module =====

let projects = [];
let users = [];

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const user = requireAuth();
    if (!user) return;

    // Mostrar usuario actual
    document.getElementById('currentUserDisplay').textContent = user.username + (user.role === 'admin' ? ' (Admin)' : '');

    // Mostrar botón de gestión solo a admins
    const manageUsersBtn = document.querySelector('.btn-secondary');
    if (manageUsersBtn) {
        manageUsersBtn.style.display = user.role === 'admin' ? 'block' : 'none';
    }

    // El botón de nuevo proyecto también podría estar restringido, pero el usuario pidió que solo ellos designen qué se ve.
    // Asumiremos que todos pueden crear, pero solo admins gestionan accesos y usuarios.

    // Cargar proyectos
    loadProjects();

    // Event Listeners
    document.getElementById('newProjectForm').addEventListener('submit', handleNewProject);
    document.getElementById('newUserForm')?.addEventListener('submit', handleNewUser);
    document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
});

// --- Projects Logic ---

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    const user = getCurrentUser();

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            let userProjects = [];

            if (user.role === 'admin') {
                // Admins ven todo
                const { data, error } = await supabaseClient
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                userProjects = data || [];
            } else {
                // Usuarios ven solo sus proyectos asignados
                const { data, error } = await supabaseClient
                    .from('project_members')
                    .select('projects(*)')
                    .eq('username', user.username);

                if (error) throw error;
                userProjects = data.map(item => item.projects).filter(Boolean);
            }
            projects = userProjects;
        } else {
            const savedProjects = localStorage.getItem('taskManager_projects');
            projects = savedProjects ? JSON.parse(savedProjects) : [];
        }

        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        grid.innerHTML = `<div class="empty-state">Error al cargar proyectos.</div>`;
    }
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    const user = getCurrentUser();

    if (projects.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No tienes proyectos asignados</p>
                ${user.role === 'admin' ? '<button class="btn-primary" onclick="openNewProjectModal()">Crear Primer Proyecto</button>' : ''}
            </div>
        `;
        return;
    }

    let html = projects.map(project => `
        <div class="project-card">
            <div onclick="openProject('${project.id}')">
                <h3>${escapeHtml(project.name)}</h3>
                <p>${escapeHtml(project.description || 'Sin descripción')}</p>
                <div class="project-stats">
                    <span class="stat-pending"><strong>${project.tasks?.pending || 0}</strong></span>
                    <span class="stat-progress"><strong>${project.tasks?.inProgress || 0}</strong></span>
                    <span class="stat-done"><strong>${project.tasks?.completed || 0}</strong></span>
                </div>
            </div>
            ${user.role === 'admin' ? `
                <div class="project-actions">
                    <button class="btn-small-outline" onclick="openAccessModal('${project.id}', '${escapeHtml(project.name)}')">🔑 Accesos</button>
                    <button class="btn-small-danger" onclick="deleteProject('${project.id}')">🗑️</button>
                </div>
            ` : ''}
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
        created_by: user.username,
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
        tableBody.innerHTML = '<tr><td colspan="5">No hay otros usuarios.</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>${escapeHtml(user.name)}</td>
            <td><span class="role-badge role-${user.role || 'user'}">${user.role || 'user'}</span></td>
            <td>
                <span class="password-hidden" onclick="togglePassword(this, '${escapeHtml(user.password)}')">••••••••</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editUser('${user.username}')" title="Editar">✏️</button>
                    ${user.username !== 'EHR051' ? `<button class="btn-icon btn-icon-danger" onclick="deleteUser('${user.username}')" title="Eliminar">🗑️</button>` : ''}
                </div>
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

// --- User Management Actions ---

async function editUser(username) {
    const user = users.find(u => u.username === username);
    if (!user) return;

    const newName = prompt('Nuevo nombre real:', user.name);
    const newPass = prompt('Nueva contraseña:', user.password);
    const newRole = prompt('Nuevo rol (admin/user):', user.role || 'user');

    if (newName && newPass && newRole) {
        try {
            if (isSupabaseConfigured() && supabaseClient) {
                const { error } = await supabaseClient
                    .from('users')
                    .update({ name: newName, password: newPass, role: newRole })
                    .eq('username', username);

                if (error) throw error;
                alert('Usuario actualizado');
                loadUsers();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar usuario');
        }
    }
}

async function deleteUser(username) {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${username}?`)) return;

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('users')
                .delete()
                .eq('username', username);

            if (error) throw error;
            alert('Usuario eliminado');
            loadUsers();
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
    }
}

async function deleteProject(projectId) {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return;

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (error) throw error;
            loadProjects();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

// --- Access Management Logic ---

async function openAccessModal(projectId, projectName) {
    const modal = document.getElementById('accessModal');
    document.getElementById('accessProjectName').textContent = projectName;
    modal.dataset.projectId = projectId;
    modal.classList.add('show');

    const list = document.getElementById('usersAccessList');
    list.innerHTML = 'Cargando accesos...';

    try {
        // Cargar todos los usuarios y los miembros actuales del proyecto
        const [usersRes, membersRes] = await Promise.all([
            supabaseClient.from('users').select('username, name'),
            supabaseClient.from('project_members').select('username').eq('project_id', projectId)
        ]);

        if (usersRes.error) throw usersRes.error;

        const allUsers = usersRes.data;
        const currentMembers = new Set(membersRes.data?.map(m => m.username));

        list.innerHTML = allUsers.map(u => `
            <div class="checkbox-item">
                <input type="checkbox" id="check_${u.username}" value="${u.username}" ${currentMembers.has(u.username) ? 'checked' : ''}>
                <label for="check_${u.username}">${escapeHtml(u.name)} (${u.username})</label>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading project access:', error);
        list.innerHTML = 'Error al cargar accesos.';
    }
}

function closeAccessModal() {
    document.getElementById('accessModal').classList.remove('show');
}

async function saveProjectAccess() {
    const modal = document.getElementById('accessModal');
    const projectId = modal.dataset.projectId;
    const checkboxes = document.querySelectorAll('#usersAccessList input[type="checkbox"]');

    const selectedUsers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    try {
        // En una implementación real con Supabase ideal:
        // 1. Borrar todos los miembros anteriores
        // 2. Insertar los nuevos

        // Pero para simplificar y asegurar:
        await supabaseClient.from('project_members').delete().eq('project_id', projectId);

        if (selectedUsers.length > 0) {
            const inserts = selectedUsers.map(username => ({
                project_id: projectId,
                username: username
            }));
            const { error } = await supabaseClient.from('project_members').insert(inserts);
            if (error) throw error;
        }

        alert('Accesos actualizados');
        closeAccessModal();
    } catch (error) {
        console.error('Error saving access:', error);
        alert('Error al guardar accesos');
    }
}

// --- Profile Management ---

function openProfileModal() {
    const user = getCurrentUser();
    if (!user) return;

    document.getElementById('profileUsername').value = user.username;
    document.getElementById('profileName').value = user.name;
    document.getElementById('profilePassword').value = '';

    document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
    document.getElementById('profileForm').reset();
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const username = document.getElementById('profileUsername').value;
    const name = document.getElementById('profileName').value.trim();
    const password = document.getElementById('profilePassword').value.trim();

    if (!name || !password) {
        alert('Nombre y contraseña son obligatorios');
        return;
    }

    try {
        if (isSupabaseConfigured() && supabaseClient) {
            const { error } = await supabaseClient
                .from('users')
                .update({ name, password })
                .eq('username', username);

            if (error) throw error;

            // Actualizar sessionStorage
            const user = getCurrentUser();
            user.name = name;
            sessionStorage.setItem('currentUser', JSON.stringify(user));

            // Actualizar UI
            document.getElementById('currentUserDisplay').textContent = user.username + (user.role === 'admin' ? ' (Admin)' : '');

            alert('Perfil actualizado correctamente');
            closeProfileModal();
        } else {
            alert('Supabase no configurado.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error al actualizar el perfil');
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
        closeAccessModal();
        closeProfileModal();
    }
});



