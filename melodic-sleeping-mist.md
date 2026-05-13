# Personal Task Management App — Implementation Plan

## Context
Build a personal task management app usable on both phone and computer. The app should work offline, be installable (PWA), and require zero backend infrastructure. All data stored locally in the browser via IndexedDB. Future extensibility to cloud sync via Supabase.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 + React 19 + TypeScript | App Router, easy Vercel deploy, PWA support, future backend option |
| Styling | Tailwind CSS v4 | Utility-first, responsive design out of the box, dark mode built-in |
| Database | Dexie.js (IndexedDB wrapper) | Local-first, reactive queries, zero server cost, offline by default |
| PWA | Manual service worker + Web Manifest | Lighter than next-pwa/serwist, full control |
| Deployment | Vercel (free tier) | Auto-deploy from git, HTTPS, custom domain support |

## Data Model

```typescript
interface Task {
  id: string;           // crypto.randomUUID()
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  order: number;        // for drag-to-reorder (future)
}
```

## Component Tree

```
RootLayout (src/app/layout.tsx)
└── HomePage (src/app/page.tsx) — "use client"
    ├── AppHeader
    │   ├── Logo / App title
    │   ├── DarkModeToggle
    │   └── AddTaskButton (opens TaskDrawer)
    ├── FilterBar
    │   ├── SearchInput (text search on title/description)
    │   ├── StatusFilter (todo / in-progress / done tabs)
    │   └── PriorityFilter (dropdown: all / high / medium / low)
    ├── TaskList
    │   ├── TaskItem[]
    │   │   ├── Checkbox (toggle status)
    │   │   ├── Title + description preview
    │   │   ├── PriorityBadge (colored dot)
    │   │   ├── DueDate (with relative time label)
    │   │   ├── Tags (small chips)
    │   │   └── Actions (edit, delete)
    │   └── EmptyState (icon + message when no tasks)
    └── TaskDrawer (slide-in panel for add/edit)
        ├── TitleInput
        ├── DescriptionTextarea
        ├── DueDatePicker
        ├── PrioritySelector
        ├── TagsInput (comma-separated, chip display)
        └── Save / Cancel / Delete buttons
```

## File Structure

```
/Users/lukas/task-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout: metadata, PWA link tags
│   │   ├── page.tsx             # Main page: composes all components
│   │   └── globals.css          # Tailwind v4 import + custom base styles
│   ├── components/
│   │   ├── AppHeader.tsx        # Top bar
│   │   ├── DarkModeToggle.tsx   # Theme switcher
│   │   ├── FilterBar.tsx        # Search + filters
│   │   ├── TaskList.tsx         # Renders filtered/sorted task groups
│   │   ├── TaskItem.tsx         # Single task row
│   │   ├── TaskDrawer.tsx       # Slide-in form for add/edit
│   │   ├── PriorityBadge.tsx    # Colored priority indicator
│   │   ├── EmptyState.tsx       # Empty state illustration
│   │   └── ConfirmDialog.tsx    # Delete confirmation
│   ├── lib/
│   │   ├── db.ts                # Dexie database definition + helpers
│   │   └── types.ts             # TypeScript interfaces
│   └── hooks/
│       └── useTasks.ts          # Custom hook: CRUD + filtering + sorting
├── public/
│   ├── sw.js                    # Service worker (cache-first for assets)
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # PWA icons (192x192, 512x512)
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Implementation Steps

### Step 1: Scaffold project
- `npx create-next-app@latest task-app --typescript --tailwind --eslint --app --src-dir --no-turbopack`
- Install extra deps: `dexie`, `react-hot-toast` (lightweight toasts)

### Step 2: Types + Database layer
- Define `Task` interface in `src/lib/types.ts`
- Set up Dexie database with schema in `src/lib/db.ts`
- Add helper functions: `getAllTasks`, `getTaskById`, `addTask`, `updateTask`, `deleteTask`

### Step 3: Custom hook
- `useTasks(filters)` — returns filtered/sorted task list
- Uses Dexie's `useLiveQuery` for real-time reactivity
- Handles search, status filter, priority filter, sorting

### Step 4: Layout + PWA
- Root layout with metadata, viewport meta, manifest link
- `manifest.json` in public/
- `sw.js` in public/ (cache static assets)
- Register service worker in layout

### Step 5: UI Components (build top-down)
- `AppHeader` with title and add button
- `DarkModeToggle` using Tailwind's `dark:` classes + localStorage
- `FilterBar` with search input, status tabs, priority dropdown
- `TaskItem` — the core card component
- `TaskList` — groups tasks by status/due date
- `EmptyState` — when list is empty
- `TaskDrawer` — slide-in panel for creating/editing tasks
- `ConfirmDialog` — for delete confirmation

### Step 6: Polish
- Responsive: mobile drawer full-screen, desktop drawer side panel
- Animations: drawer slide-in, task add/remove transitions
- Toast notifications on actions
- Keyboard shortcuts: `Cmd+K` to search, `N` to add task, `Esc` to close drawer

## Design Principles
- **Mobile-first**: all components designed for 375px width first, then scale up
- **Zero dependencies on external services**: the app works fully offline
- **Instant UI**: IndexedDB queries are synchronous-feeling, no loading spinners
- **System dark mode**: follows `prefers-color-scheme` by default, with manual override stored in localStorage

## Verification
1. `npm run dev` — app starts, shows empty state
2. Click "+" — drawer opens, fill form, save — task appears in list
3. Toggle checkbox — task moves to done
4. Search bar — type keyword, list filters
5. Filter tabs — switch between todo/in-progress/done
6. Dark mode toggle — switch theme
7. Kill dev server — app still works (PWA/IndexedDB offline)
8. Open on phone (same WiFi, access `http://<local-ip>:3000`) — responsive UI works
9. Audit: `npx next build && npx next start` — production build succeeds
