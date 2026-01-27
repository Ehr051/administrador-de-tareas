// ===== Authentication Module =====

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Verificar si ya hay sesión activa (solo en la página de login)
    const currentUser = sessionStorage.getItem('currentUser');
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    
    if (currentUser && isLoginPage) {
        window.location.href = 'dashboard.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
    
        e.preventDefault();

        const username = document.getElementById('username').value.trim().toUpperCase();
        const password = document.getElementById('password').value;

        // Ocultar mensaje de error previo
        errorMessage.classList.remove('show');

        try {
            const result = await authenticateUser(username, password);

            if (result.success) {
                // Guardar sesión
                sessionStorage.setItem('currentUser', JSON.stringify({
                    username: result.user.username,
                    name: result.user.name
                }));

                // Redirigir al dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError('Error de conexión. Intenta de nuevo.');
            console.error('Auth error:', error);
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
});

// Función de autenticación
async function authenticateUser(username, password) {
    // Si Supabase está configurado, usar autenticación real
    if (isSupabaseConfigured() && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }

            return {
                success: true,
                user: { username: data.username, name: data.name }
            };
        } catch (err) {
            console.error('Supabase auth error:', err);
            return { success: false, message: 'Error de autenticación' };
        }
    }

    // Autenticación temporal (sin Supabase)
    const user = TEMP_USERS[username];

    if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
    }

    if (user.password !== password) {
        return { success: false, message: 'Contraseña incorrecta' };
    }

    return {
        success: true,
        user: { username: username, name: user.name }
    };
}

// Función para cerrar sesión
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Función para obtener usuario actual
function getCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

// Función para verificar autenticación (usar en páginas protegidas)
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}
