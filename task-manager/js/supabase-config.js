// ===== Supabase Configuration =====
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';

// Usuarios temporales (mientras no esté Supabase configurado)
const TEMP_USERS = {
    'EHR051': { password: 'R4T4G4T4', name: 'EHR051' },
    'FGR134': { password: 'R4T4G4T4', name: 'FGR134' }
};

// Inicializar cliente Supabase (cuando esté configurado)
let supabase = null;

function initSupabase() {
    if (SUPABASE_URL !== 'https://TU-PROYECTO.supabase.co' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

// Verificar si Supabase está configurado
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'https://TU-PROYECTO.supabase.co';
}
