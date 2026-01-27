// ===== Supabase Configuration =====
const SUPABASE_URL = 'https://buiwexyvwiizaumhouuw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d6WhsXaRCDCm_6Uc0iseKg_NyAZ7JQZ';

// Usuarios temporales (fallback si Supabase falla)
const TEMP_USERS = {
    'EHR051': { password: 'R4T4G4T4', name: 'EHR051' },
    'FGR134': { password: 'R4T4G4T4', name: 'FGR134' }
};

// Cliente Supabase (renombrado para evitar conflicto con el CDN)
let supabaseClient = null;

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    return supabaseClient !== null;
}

// Getter para el cliente
function getSupabase() {
    return supabaseClient;
}

// Inicializar al cargar
initSupabase();
