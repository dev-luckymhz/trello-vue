# Kanban Board — Frontend

A modern Trello-style Kanban UI built with **Vue 3**, **TypeScript**, **Pinia**, **Vue Router**, and **Tailwind CSS v4**. It talks to the companion [trello-back](../trello-back) Express + TypeORM + MySQL API over HTTP.

## Features

- Authentication (register / login / logout) with JWT
- Multiple projects per user (personal or owned by an organization)
- Organizations (list, create, delete)
- Dynamic task statuses (columns) per project — add, rename, reorder, delete
- Task CRUD with **title, description, due date, importance** (`URGENT / HIGH / MEDIUM / LOW`)
- Drag & drop for tasks (between/within columns) and columns themselves, with server-side persistence
- Typed HTTP client (axios) with auth token interceptor + auto-logout on 401

## Tech stack

| Layer         | Choice                                    |
| ------------- | ----------------------------------------- |
| Framework     | Vue 3.5 (`<script setup>` + Composition)  |
| Bundler       | Vite 6                                    |
| Language      | TypeScript 5 (strict)                     |
| State         | Pinia 2                                   |
| Routing       | Vue Router 4 (with auth guard)            |
| Styling       | Tailwind CSS 4 (CSS-first `@theme`)       |
| HTTP          | axios                                     |
| Drag & drop   | `vue-draggable-plus`                      |
| Icons         | FontAwesome                               |

## Getting started

Make sure the [backend](../trello-back) is running first (default: `http://localhost:4000/api`).

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Register a new account, create an organization (optional), then create projects and tasks.

### Environment variables

| Variable        | Default                          |
| --------------- | -------------------------------- |
| `VITE_API_URL`  | `http://localhost:4000/api`      |

### Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build
- `npm run type-check` — run `vue-tsc`

## Project structure

```
src/
├── components/       AppHeader, Modal, ConfirmDialog, BoardColumn, TaskCard, TaskModal
├── router/           Vue Router with auth guard
├── services/         api.ts (axios + token), auth, projects, organizations
├── stores/           auth, projects, organizations (Pinia)
├── types/            Shared TS types + enums (mirrors backend)
├── views/
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── ProjectsListView.vue
│   ├── ProjectView.vue
│   └── OrganizationsView.vue
├── App.vue           Shell with AppHeader + `<router-view>`
├── main.ts           Pinia + Router + FontAwesome bootstrap
└── style.css         Tailwind v4 entry + brand theme tokens
```

## Architecture notes

- **Auth flow.** On login/register, the JWT is stored in `localStorage` and installed as the default `Authorization` header on the axios instance. The router's `beforeEach` guard calls `auth.restore()` (idempotent) — which fetches `/auth/me` to verify the token and populate `user`. Any 401 anywhere in the app triggers an auto-logout + redirect to `/login`.
- **Data model.** Types mirror the backend one-to-one (`Project`, `TaskStatus`, `Task`, `Organization`, `User`, `Importance` enum). The "columns" shown in the UI are `TaskStatus` records on the server.
- **Optimistic mutations.** Updates go through Pinia actions that call the service, then update local state with the server response. Drag reorders fire `/tasks/reorder` and `/statuses/reorder` and reconcile from the response.

## Not yet implemented on the frontend (backend ready)

- Categories CRUD UI (per project)
- Project members UI (invite / role change)
- Organization members UI
- Task assignment (`assignedUserId`) picker

The backend exposes all of these — they can be added without further API work.
