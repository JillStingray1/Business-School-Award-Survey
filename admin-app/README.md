# Admin App - UWA Business School Award Survey

A desktop administration tool for automating the University of Western Australia Business School teaching award nomination workflow.

---

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Desktop shell | [Electron 41](https://electronjs.org) | Cross-platform desktop application |
| Build tooling | [Electron Forge 7](https://www.electronforge.io) + [Vite 5](https://vite.dev) | Development, packaging, and release builds |
| Frontend framework | [Vue 3](https://vuejs.org) + [TypeScript](https://www.typescriptlang.org) | Renderer process UI |
| UI components | [Naive UI](https://www.naiveui.com) | Application-wide UI component library |
| Routing | [Vue Router 4](https://router.vuejs.org) | Hash-based routing for Electron compatibility |
| State management | [Pinia](https://pinia.vuejs.org) | Renderer process state |
| Backend runtime | Node.js in the Electron main process | Database access and API proxying |

---

## Project Structure

```text
admin-app/
├── src/
│   ├── main/                       # Electron main process (Node.js)
│   │   ├── index.ts                # Main process entry point and BrowserWindow lifecycle
│   │   ├── preload.ts              # Preload script exposing safe IPC APIs to the renderer
│   │   ├── db/
│   │   │   └── index.ts            # Database connection singleton
│   │   ├── api/
│   │   │   └── index.ts            # External HTTP API client
│   │   └── ipc/
│   │       └── handlers.ts         # ipcMain.handle() registrations
│   │
│   ├── renderer/                   # Vue renderer process
│   │   ├── index.ts                # Vue application entry point
│   │   ├── App.vue                 # Root component with global layout and Naive UI setup
│   │   ├── env.d.ts                # Window.electronAPI type declarations
│   │   ├── router/
│   │   │   └── index.ts            # Router definitions using hash mode
│   │   ├── stores/
│   │   │   ├── index.ts            # Store exports
│   │   │   ├── app.ts              # Global state such as loading and errors
│   │   │   └── upload.ts           # CSV upload state
│   │   ├── views/
│   │   │   ├── HomeView.vue        # Home view
│   │   │   └── UploadView.vue      # File upload view
│   │   ├── components/
│   │   │   └── FileUploader.vue    # CSV drag-and-drop uploader and preview table
│   │   └── styles/
│   │       └── main.css            # Global style reset
│   │
│   └── shared/
│       └── types/
│           └── index.ts            # Shared TypeScript types and IPC channel constants
│
├── testing_data/                   # CSV files for local testing
│   ├── tutor_list.csv
│   └── uc_list.csv
│
├── forge.config.ts                 # Electron Forge configuration
├── vite.main.config.ts             # Main process Vite configuration
├── vite.preload.config.ts          # Preload script Vite configuration
├── vite.renderer.config.mts        # Renderer process Vite configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm 9 or later

### Install Dependencies

```bash
cd admin-app
npm install
```

### Run in Development Mode

```bash
npm start
```

Electron Forge starts the Vite development servers and opens the Electron window automatically. Renderer changes support hot module replacement during development.

### Build the App

```bash
# Package the application without creating an installer
npm run package

# Create platform-specific distributables
npm run make
```

Build outputs are written to the `out/` directory.

---

## Friendly Development Workflow

1. **Start with a clean local setup**

   Install dependencies with `npm install`, then run `npm start` to confirm the app opens successfully before making changes.

2. **Pick the right area to edit**

   Work in `src/renderer/` for UI screens, components, routing, and Pinia state. Work in `src/main/` for Electron main process behaviour, database access, API calls, and IPC handlers. Put shared types and constants in `src/shared/`.

3. **Use the testing CSV files**

   The sample files in `testing_data/` are intended for local upload testing. Use them to check CSV parsing, preview tables, and nomination workflow changes before trying new data.

4. **Keep IPC changes explicit**

   When adding a new main-process capability, define the channel in `src/shared/types/index.ts`, implement the handler in `src/main/ipc/handlers.ts`, expose the method from `src/main/preload.ts`, and call it through `window.electronAPI` from the renderer.

5. **Check quality before packaging**

   Run `npm run lint` after meaningful changes. Then run `npm start` once more and test the relevant screen in the Electron window.

6. **Package only after local verification**

   Use `npm run package` for a local application build. Use `npm run make` when you need a platform-specific installer or distributable.

---

## Architecture Notes

### Process Communication (IPC)

Electron uses two processes: the **main process** running Node.js and the **renderer process** running Vue. The security boundary is protected with `contextIsolation`, and the renderer only communicates with the main process through approved IPC channels.

```text
Renderer process (Vue)
  └─ window.electronAPI.xxx()        <- exposed by preload.ts
       └─ ipcRenderer.invoke(channel)
            └─ main process ipcMain.handle(channel)
                 ├─ db/index.ts      <- database operations
                 └─ api/index.ts     <- external API calls
```

All IPC channel names are defined in `src/shared/types/index.ts` and imported by both processes to avoid hard-coded channel strings.

### Supabase Database Connection

`src/main/db/index.ts` exports a shared Supabase client configured from local environment variables:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_local_admin_service_role_key
```

Create a local `.env` from `.env.example`. Do not commit `.env` because it contains database credentials.
The static GitHub Pages forms should only use the publishable key. The desktop admin app can use `SUPABASE_SERVICE_ROLE_KEY` locally so it can manage protected tables such as `award_periods`.

The client is initialised from the `onReady()` stage in `src/main/index.ts` by calling `db.connect()`. Other main-process modules can import and call the shared client directly:

```ts
import { supabase, getSupabaseClient, db } from './db';

const { data, error } = await supabase
  .from('table_name')
  .select('*');

const client = getSupabaseClient();
const { data: rpcData } = await client.rpc('function_name', { id: 1 });

const { data: viaDb } = await db
  .getClient()
  .from('table_name')
  .select('*');
```

Use Supabase table APIs such as `.from(...).select(...)`, `.insert(...)`, `.update(...)`, `.delete(...)`, and `.rpc(...)`. The public Supabase client does not execute arbitrary SQL strings, so the legacy `db.query()` and `db.run()` helpers now throw a clear error. If the renderer needs database access, add a dedicated IPC channel in `src/main/ipc/handlers.ts` and keep the Supabase key in the main process.

### External API Client

`src/main/api/index.ts` exports the `apiClient` singleton. Configure it at application start-up with `apiClient.configure({ baseUrl: '...' })`. The renderer calls external services through `window.electronAPI.apiRequest(payload)`, so API keys and other secrets are never exposed to the renderer process.

### Path Aliases

| Alias | Path |
| --- | --- |
| `@renderer/*` | `src/renderer/*` |
| `@shared/*` | `src/shared/*` |

---

## Adding a New Page

1. Create `XxxView.vue` in `src/renderer/views/`.
2. Add a route record in `src/renderer/router/index.ts`.
3. Add a navigation link in `App.vue` or the relevant component.

## Adding a New IPC Channel

1. Add the channel name constant to `IPC_CHANNELS` in `src/shared/types/index.ts`.
2. Add the `ipcMain.handle()` logic in `src/main/ipc/handlers.ts`.
3. Add the matching `contextBridge` method in `src/main/preload.ts`.
4. Update the `ElectronAPI` type in `src/renderer/env.d.ts` if it is not inferred automatically from the bridge.

---

## Code Style

- Use **PascalCase** for component files, such as `FileUploader.vue`.
- Keep shared TypeScript types in `src/shared/types/` or in a local type file next to the relevant module.
- Use Vue `<script setup lang="ts">` with the Composition API.
- Import Naive UI components where they are used so the build can tree-shake unused code.
