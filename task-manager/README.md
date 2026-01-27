# Task Manager

Administrador de tareas colaborativo con tablero Kanban.

## Usuarios

| Usuario | Contraseña |
|---------|------------|
| EHR051  | R4T4G4T4   |
| FGR134  | R4T4G4T4   |

## Probar en Local

Sin necesidad de servidor - solo abre `index.html` en el navegador.

Los datos se guardan en `localStorage` mientras no configures Supabase.

## Deploy en Netlify

1. Sube la carpeta `task-manager` a un repositorio de GitHub
2. Ve a [Netlify](https://app.netlify.com)
3. "Add new site" > "Import an existing project"
4. Selecciona tu repositorio
5. Deploy!

## Configurar Supabase (Opcional)

Para sincronizar datos entre usuarios:

1. Crea cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a SQL Editor y ejecuta el contenido de `supabase-schema.sql`
4. Ve a Settings > API y copia:
   - Project URL
   - anon public key
5. Edita `js/supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
```

6. Agrega el CDN de Supabase en los HTML (antes de supabase-config.js):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

## Estructura

```
task-manager/
├── index.html          # Login
├── dashboard.html      # Selector de proyectos
├── board.html          # Tablero Kanban
├── css/
│   └── style.css       # Estilos
├── js/
│   ├── supabase-config.js  # Configuración
│   ├── auth.js             # Autenticación
│   ├── dashboard.js        # Lógica dashboard
│   └── board.js            # Lógica tablero
├── netlify.toml        # Config Netlify
└── supabase-schema.sql # SQL para Supabase
```

## Funcionalidades

- Login con usuarios predefinidos
- Selector de proyectos
- Tablero Kanban con drag & drop
- Crear/editar tareas
- Prioridades y tags
- Funciona offline (localStorage)
- Sincronización con Supabase (opcional)
