# Centro de Rehabilitaci\u00f3n \u2014 Sistema Web (MVP)

Monorepo con:

- Backend: Node.js + Express + Prisma + PostgreSQL
- Frontend: React + Vite

## Requisitos

- Node.js 18+
- Docker (recomendado para PostgreSQL)

## Levantar base de datos (Docker)

```bash
docker compose up -d
```

## Variables de entorno

Backend:

1) Copiar `backend/.env.example` a `backend/.env`
2) Ajustar `DATABASE_URL` si cambi\u00e1s las credenciales del `docker-compose.yml`

Frontend:

1) Copiar `frontend/.env.example` a `frontend/.env`

## Instalar dependencias

Desde la ra\u00edz:

```bash
npm install
```

## Migraciones + seed

```bash
npm run prisma:migrate --workspace backend
npm run prisma:seed --workspace backend
```

## Ejecutar en modo desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Usuario admin (seed)

- Email: `admin@centro.com`
- Password: `Admin123!`

## Notas v1 (asunciones)

- No hay restricci\u00f3n de horarios (se pueden crear turnos en cualquier horario).
- La duraci\u00f3n por defecto para especialidades iniciales es 30 minutos.
- El env\u00edo de email est\u00e1 integrado y **si falla no bloquea** la creaci\u00f3n del turno (se loguea el error).
