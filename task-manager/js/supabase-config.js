// ===== Supabase Configuration =====
const SUPABASE_URL = 'https://buiwexyvwiizaumhouuw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d6WhsXaRCDCm_6Uc0iseKg_NyAZ7JQZ';

// Usuarios temporales (fallback si Supabase falla)
const TEMP_USERS = {
    'EHR051': { password: 'R4T4G4T4', name: 'EHR051' },
    'FGR134': { password: 'R4T4G4T4', name: 'FGR134' }
};

// Inicializar cliente Supabase
let supabase = null;

function initSupabase() {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase inicializado correctamente');
            return true;
        } catch (e) {
            console.error('Error inicializando Supabase:', e);
            return false;
        }
    }
    console.warn('Supabase no disponible, usando localStorage');
    return false;
}

// Verificar si Supabase está configurado
function isSupabaseConfigured() {
    return supabase !== null;
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
