# Instrucciones de Instalación y Configuración

## Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Pasos de Configuración

### 1. Instalar dependencias
```powershell
npm install
```

### 2. Configurar base de datos
Crear una base de datos PostgreSQL:
```sql
CREATE DATABASE dif_tamaulipas;
```

Crear el archivo `server/.env` con el siguiente contenido (ajustar credenciales):
```
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/dif_tamaulipas"
JWT_SECRET="cambia-esto-en-produccion-usa-clave-larga"
PORT=3000
UPLOADS_DIR="uploads"
```

### 3. Generar cliente Prisma y ejecutar migraciones
```powershell
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Cargar datos iniciales (seed)
```powershell
npx ts-node prisma/seed.ts
```
Esto crea:
- Usuario administrador: `admin@diftamaulipas.gob.mx` / contraseña: `admin123`
- Catálogo de requisitos base para proveedores

### 5. Iniciar la aplicación (desde la raíz)
```powershell
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Roles del Sistema

| Rol | Acceso |
|-----|--------|
| ADMIN | Acceso completo: dashboard, gestión de todos los módulos |
| PROMOTOR | Comunidades asignadas, visitas, eventos, reportes |
| INSTRUCTOR | Capacitaciones asignadas, reportes de avance |

## Estructura de Archivos Importantes
```
server/prisma/schema.prisma   - Modelo de datos
server/src/routes/            - Endpoints REST
client/src/pages/             - Vistas React
client/src/lib/               - Utilidades, API, Auth
uploads/                      - Archivos subidos (se crea automáticamente)
```
