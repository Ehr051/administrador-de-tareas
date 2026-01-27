-- ============================================
-- SUPABASE SCHEMA - Task Manager
-- ============================================
-- Ejecuta este SQL en tu proyecto Supabase:
-- Dashboard > SQL Editor > New Query

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user', -- 'admin' o 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de miembros del proyecto (quién ve qué)
CREATE TABLE IF NOT EXISTS project_members (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, username)
);


-- Tabla de tareas
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'media',
    notes TEXT,
    tags TEXT[],
    assigned_to TEXT[],
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar usuarios
INSERT INTO users (username, password, name) VALUES
    ('EHR051', 'R4T4G4T4', 'EHR051'),
    ('FGR134', 'R4T4G4T4', 'FGR134')
ON CONFLICT (username) DO NOTHING;

-- Insertar proyecto de ejemplo
INSERT INTO projects (id, name, description, created_by) VALUES
    ('task-manager', 'Task Manager', 'Administrador de tareas colaborativo', 'EHR051'),
    ('bendito-cafe', 'Bendito Café', 'Sistema de gestión para cafetería', 'EHR051')
ON CONFLICT (id) DO NOTHING;

-- Insertar tareas de ejemplo
INSERT INTO tasks (project_id, title, status, priority, tags) VALUES
    ('task-manager', 'Definir visión y objetivos del proyecto', 'pending', 'alta', ARRAY['planificación']),
    ('task-manager', 'Documentar requerimientos funcionales', 'pending', 'alta', ARRAY['requerimientos']),
    ('task-manager', 'Documentar requerimientos no funcionales', 'pending', 'alta', ARRAY['requerimientos']),
    ('task-manager', 'Crear hoja de ruta (Roadmap)', 'pending', 'alta', ARRAY['planificación']),
    ('task-manager', 'Definir stack tecnológico', 'pending', 'alta', ARRAY['técnico']),
    ('task-manager', 'Diseñar arquitectura del sistema', 'pending', 'media', ARRAY['arquitectura']),
    ('task-manager', 'Crear wireframes/prototipos UI', 'pending', 'media', ARRAY['diseño']),
    ('task-manager', 'Configurar entorno de desarrollo', 'pending', 'media', ARRAY['setup']),
    ('task-manager', 'Diseñar modelo de base de datos', 'pending', 'media', ARRAY['base de datos']),
    ('task-manager', 'Planificar primer sprint', 'pending', 'media', ARRAY['sprint']),
    ('task-manager', 'Definir MVP', 'pending', 'alta', ARRAY['MVP']),
    ('task-manager', 'Crear documentación inicial', 'pending', 'baja', ARRAY['documentación']);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para desarrollo - ajustar en producción)
CREATE POLICY "Allow all users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true);

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
