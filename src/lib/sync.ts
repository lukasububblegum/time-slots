"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, db } from "@/lib/db";
import type { AppSettings, PlannerState, ScheduleBlock, Task } from "@/lib/types";

export type SyncProvider = "local-only" | "supabase";

export interface SyncStatus {
  provider: SyncProvider;
  label: string;
  enabled: boolean;
}

export interface SyncResult {
  ok: boolean;
  message: string;
}

export interface CloudSyncController {
  configured: boolean;
  enabled: boolean;
  label: string;
  userEmail?: string;
  isSyncing: boolean;
  message?: string;
  error?: string;
  signInWithEmail: (email: string) => Promise<SyncResult>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
}

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  tags: string[];
  estimated_minutes: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  device_updated_at: string;
};

type ScheduleBlockRow = {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  start_minutes: number;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  device_updated_at: string;
};

type SettingsRow = {
  id: "local";
  user_id: string;
  day_start_minutes: number;
  day_end_minutes: number;
  slot_size_minutes: number;
  default_view: AppSettings["defaultView"];
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

export const syncStatus: SyncStatus = {
  provider: configured ? "supabase" : "local-only",
  label: configured ? "Cloud ready" : "Saved locally",
  enabled: configured,
};

export function isCloudSyncConfigured() {
  return configured;
}

function getSupabaseClient() {
  if (!configured) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

function toTaskRow(task: Task, userId: string): TaskRow {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    estimated_minutes: task.estimatedMinutes,
    due_date: task.dueDate ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt ?? null,
    device_updated_at: task.deviceUpdatedAt,
  };
}

function fromTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    tags: row.tags ?? [],
    estimatedMinutes: row.estimated_minutes,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
    deviceUpdatedAt: row.device_updated_at,
  };
}

function toBlockRow(block: ScheduleBlock, userId: string): ScheduleBlockRow {
  return {
    id: block.id,
    user_id: userId,
    task_id: block.taskId,
    date: block.date,
    start_minutes: block.startMinutes,
    duration_minutes: block.durationMinutes,
    notes: block.notes ?? null,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
    deleted_at: block.deletedAt ?? null,
    device_updated_at: block.deviceUpdatedAt,
  };
}

function fromBlockRow(row: ScheduleBlockRow): ScheduleBlock {
  return {
    id: row.id,
    taskId: row.task_id,
    date: row.date,
    startMinutes: row.start_minutes,
    durationMinutes: row.duration_minutes,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
    deviceUpdatedAt: row.device_updated_at,
  };
}

function toSettingsRow(settings: AppSettings, userId: string): SettingsRow {
  return {
    id: "local",
    user_id: userId,
    day_start_minutes: settings.dayStartMinutes,
    day_end_minutes: settings.dayEndMinutes,
    slot_size_minutes: settings.slotSizeMinutes,
    default_view: settings.defaultView,
    updated_at: new Date().toISOString(),
  };
}

function fromSettingsRow(row: SettingsRow): AppSettings {
  return {
    id: "local",
    dayStartMinutes: row.day_start_minutes,
    dayEndMinutes: row.day_end_minutes,
    slotSizeMinutes: row.slot_size_minutes,
    defaultView: row.default_view,
  };
}

function isNewerOrEqual(localUpdatedAt: string, remoteUpdatedAt?: string | null) {
  if (!remoteUpdatedAt) {
    return true;
  }

  return Date.parse(localUpdatedAt) >= Date.parse(remoteUpdatedAt);
}

async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }

  return data.user;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  if (!configured) {
    return syncStatus;
  }

  const user = await getCurrentUser();
  return {
    provider: "supabase",
    label: user ? "Signed in" : "Cloud ready",
    enabled: Boolean(user),
  };
}

export async function signInWithEmail(email: string): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Check your email for the magic link." };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function pushLocalChanges(_state?: PlannerState): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return { ok: false, message: "Sign in before syncing." };
  }

  const [tasks, blocks, settings] = await Promise.all([
    db.tasks.toArray(),
    db.scheduleBlocks.toArray(),
    db.settings.get("local"),
  ]);

  const [{ data: remoteTasks, error: taskReadError }, { data: remoteBlocks, error: blockReadError }] =
    await Promise.all([
      supabase.from("tasks").select("id, updated_at"),
      supabase.from("schedule_blocks").select("id, updated_at"),
    ]);

  if (taskReadError || blockReadError) {
    return {
      ok: false,
      message: taskReadError?.message ?? blockReadError?.message ?? "Could not read remote data.",
    };
  }

  const remoteTaskUpdatedAt = new Map(
    (remoteTasks ?? []).map((row) => [row.id, row.updated_at]),
  );
  const remoteBlockUpdatedAt = new Map(
    (remoteBlocks ?? []).map((row) => [row.id, row.updated_at]),
  );
  const taskRows = tasks
    .filter((task) => isNewerOrEqual(task.updatedAt, remoteTaskUpdatedAt.get(task.id)))
    .map((task) => toTaskRow(task, user.id));
  const blockRows = blocks
    .filter((block) => isNewerOrEqual(block.updatedAt, remoteBlockUpdatedAt.get(block.id)))
    .map((block) => toBlockRow(block, user.id));

  if (taskRows.length) {
    const { error } = await supabase.from("tasks").upsert(taskRows, { onConflict: "user_id,id" });
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  if (blockRows.length) {
    const { error } = await supabase
      .from("schedule_blocks")
      .upsert(blockRows, { onConflict: "user_id,id" });
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  const { error: settingsError } = await supabase
    .from("settings")
    .upsert(toSettingsRow(settings ?? DEFAULT_SETTINGS, user.id), { onConflict: "user_id,id" });
  if (settingsError) {
    return { ok: false, message: settingsError.message };
  }

  return { ok: true, message: "Local changes pushed." };
}

export async function pullRemoteChanges(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return { ok: false, message: "Sign in before syncing." };
  }

  const [
    localTasks,
    localBlocks,
    { data: remoteTasks, error: taskError },
    { data: remoteBlocks, error: blockError },
    { data: remoteSettings, error: settingsError },
  ] = await Promise.all([
    db.tasks.toArray(),
    db.scheduleBlocks.toArray(),
    supabase.from("tasks").select("*"),
    supabase.from("schedule_blocks").select("*"),
    supabase.from("settings").select("*").eq("id", "local").maybeSingle(),
  ]);

  if (taskError || blockError || settingsError) {
    return {
      ok: false,
      message: taskError?.message ?? blockError?.message ?? settingsError?.message ?? "Could not pull remote data.",
    };
  }

  const localTaskUpdatedAt = new Map(localTasks.map((task) => [task.id, task.updatedAt]));
  const localBlockUpdatedAt = new Map(localBlocks.map((block) => [block.id, block.updatedAt]));
  const tasksToPut = (remoteTasks ?? [])
    .filter((row) => isNewerOrEqual(row.updated_at, localTaskUpdatedAt.get(row.id)))
    .map(fromTaskRow);
  const blocksToPut = (remoteBlocks ?? [])
    .filter((row) => isNewerOrEqual(row.updated_at, localBlockUpdatedAt.get(row.id)))
    .map(fromBlockRow);

  await db.transaction("rw", db.tasks, db.scheduleBlocks, db.settings, async () => {
    if (tasksToPut.length) {
      await db.tasks.bulkPut(tasksToPut);
    }

    if (blocksToPut.length) {
      await db.scheduleBlocks.bulkPut(blocksToPut);
    }

    if (remoteSettings) {
      await db.settings.put(fromSettingsRow(remoteSettings));
    }
  });

  return { ok: true, message: "Remote changes pulled." };
}

export async function hydrateFromCloudOnStartup(): Promise<SyncResult> {
  const status = await getSyncStatus();
  if (!status.enabled) {
    return { ok: true, message: status.label };
  }

  return pullRemoteChanges();
}

export async function syncNow(): Promise<SyncResult> {
  const push = await pushLocalChanges();
  if (!push.ok) {
    return push;
  }

  const pull = await pullRemoteChanges();
  if (!pull.ok) {
    return pull;
  }

  return { ok: true, message: "Synced." };
}

export function useCloudSync(): CloudSyncController {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const enabled = configured && Boolean(userEmail);
  const label = useMemo(() => {
    if (!configured) {
      return "Saved locally";
    }
    if (isSyncing) {
      return "Syncing";
    }
    if (error) {
      return "Sync failed";
    }
    if (userEmail) {
      return "Auto sync on";
    }
    return "Cloud ready";
  }, [error, isSyncing, userEmail]);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    setError(undefined);
    const result = await syncNow();
    setIsSyncing(false);
    setMessage(result.message);
    if (!result.ok) {
      setError(result.message);
    }
    return result;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      const email = data.session?.user.email;
      setUserEmail(email);
      if (email) {
        void hydrateFromCloudOnStartup().then((result) => {
          if (!mounted) {
            return;
          }
          setMessage(result.message);
          if (!result.ok) {
            setError(result.message);
          }
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      const email = session?.user.email;
      setUserEmail(email);
      if (event === "SIGNED_IN" && email) {
        void runSync();
      }
      if (event === "SIGNED_OUT") {
        setMessage("Signed out.");
        setError(undefined);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [runSync]);

  return {
    configured,
    enabled,
    label,
    userEmail,
    isSyncing,
    message,
    error,
    signInWithEmail: async (email: string) => {
      setError(undefined);
      const result = await signInWithEmail(email);
      setMessage(result.message);
      if (!result.ok) {
        setError(result.message);
      }
      return result;
    },
    signOut: async () => {
      await signOut();
      setUserEmail(undefined);
    },
    syncNow: runSync,
  };
}
