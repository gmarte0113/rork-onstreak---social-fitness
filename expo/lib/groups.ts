import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { supabase, isSupabaseConfigured, ensureAnonymousSession } from "./supabase";

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
import type { Group, GroupMember } from "@/providers/AppProvider";

export const GROUPS_TABLE = "groups";
export const GROUP_MEMBERS_TABLE = "group_members";
export const GROUP_PHOTOS_TABLE = "group_workout_photos";
export const GROUP_PHOTOS_BUCKET = "group-photos";
export const GROUP_MESSAGES_TABLE = "group_messages";

type GroupMessageRow = {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string | null;
  text: string;
  created_at: string;
};

export type RemoteGroupMessage = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
};

function rowToMessage(row: GroupMessageRow): RemoteGroupMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.user_id,
    authorName: row.user_name ?? "Member",
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchGroupMessagesRemote(
  groupIds: string[],
  limitPerGroup: number = 200
): Promise<RemoteGroupMessage[]> {
  if (!isSupabaseConfigured || groupIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from(GROUP_MESSAGES_TABLE)
      .select("*")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(limitPerGroup * Math.max(1, groupIds.length));
    if (error) {
      console.log("[groups] fetchGroupMessagesRemote error", error.message);
      return [];
    }
    return ((data ?? []) as GroupMessageRow[]).map(rowToMessage);
  } catch (e) {
    console.log("[groups] fetchGroupMessagesRemote exception", e);
    return [];
  }
}

export async function insertGroupMessageRemote(params: {
  groupId: string;
  userId: string;
  userName: string;
  text: string;
}): Promise<RemoteGroupMessage | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from(GROUP_MESSAGES_TABLE)
      .insert({
        group_id: params.groupId,
        user_id: params.userId,
        user_name: params.userName,
        text: params.text,
      })
      .select()
      .single();
    if (error) {
      console.log("[groups] insertGroupMessageRemote error", error.message);
      return null;
    }
    return rowToMessage(data as GroupMessageRow);
  } catch (e) {
    console.log("[groups] insertGroupMessageRemote exception", e);
    return null;
  }
}

export function subscribeToGroupMessages(
  groupIds: string[],
  onInsert: (msg: RemoteGroupMessage) => void
): () => void {
  if (!isSupabaseConfigured || groupIds.length === 0) return () => {};
  try {
    const channel = supabase
      .channel(`group-messages-${groupIds.join("-").slice(0, 80)}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: GROUP_MESSAGES_TABLE,
          filter: `group_id=in.(${groupIds.join(",")})`,
        },
        (payload: { new: GroupMessageRow }) => {
          try {
            onInsert(rowToMessage(payload.new));
          } catch (e) {
            console.log("[groups] subscribeToGroupMessages handler error", e);
          }
        }
      )
      .subscribe((status) => {
        console.log("[groups] messages channel status", status);
      });
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.log("[groups] removeChannel error", e);
      }
    };
  } catch (e) {
    console.log("[groups] subscribeToGroupMessages exception", e);
    return () => {};
  }
}


type GroupRow = {
  id: string;
  name: string;
  code: string;
  icon: string;
  owner_id: string;
  created_by: string | null;
  created_at: string;
  streak: number;
  last_success_date: string | null;
  last_reset_date: string | null;
};

type GroupMemberRow = {
  group_id: string;
  user_id: string;
  name: string | null;
  joined_at: string;
  streak: number;
  completed_today: boolean;
  total_completions: number;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rowToMember(row: GroupMemberRow, selfUserId: string): GroupMember {
  return {
    id: row.user_id,
    name: row.name ?? "Member",
    streak: row.streak ?? 0,
    completedToday: Boolean(row.completed_today),
    totalCompletions: row.total_completions ?? 0,
    isSelf: row.user_id === selfUserId,
  };
}

export async function fetchUserGroups(userId: string): Promise<Group[] | null> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: memberships, error: mErr } = await supabase
      .from(GROUP_MEMBERS_TABLE)
      .select("group_id")
      .eq("user_id", userId);
    if (mErr) {
      console.log("[groups] fetch memberships error", mErr.message);
      return null;
    }
    const groupIds = (memberships ?? []).map((m) => m.group_id as string);
    if (groupIds.length === 0) return [];
    const [groupsRes, membersRes] = await Promise.all([
      supabase.from(GROUPS_TABLE).select("*").in("id", groupIds),
      supabase.from(GROUP_MEMBERS_TABLE).select("*").in("group_id", groupIds),
    ]);
    if (groupsRes.error) {
      console.log("[groups] fetch groups error", groupsRes.error.message);
      return null;
    }
    if (membersRes.error) {
      console.log("[groups] fetch members error", membersRes.error.message);
    }
    const memberRows = (membersRes.data ?? []) as GroupMemberRow[];
    const existingGroupIds = new Set(((groupsRes.data ?? []) as GroupRow[]).map((g) => g.id));
    const missingGroupIds = groupIds.filter((id) => !existingGroupIds.has(id));
    if (missingGroupIds.length > 0) {
      console.log("[groups] fetchUserGroups pruning missing groups", missingGroupIds);
    }
    return ((groupsRes.data ?? []) as GroupRow[]).map((g) => {
      const members = memberRows
        .filter((m) => m.group_id === g.id)
        .map((m) => rowToMember(m, userId));
      const self = members.find((m) => m.isSelf);
      return {
        id: g.id,
        name: g.name,
        code: g.code,
        createdAt: new Date(g.created_at).getTime(),
        icon: g.icon ?? "🔥",
        ownerId: g.created_by ?? g.owner_id,
        members,
        joinedAt: self ? toDateKey(new Date()) : toDateKey(new Date()),
        streak: g.streak ?? 0,
        lastSuccessDate: g.last_success_date,
        lastResetDate: g.last_reset_date,
      };
    });
  } catch (e) {
    console.log("[groups] fetchUserGroups exception", e);
    return null;
  }
}

export async function createGroupRemote(params: {
  userId: string;
  userName: string;
  name: string;
  code: string;
}): Promise<Group | null> {
  if (!isSupabaseConfigured) {
    console.log("[groups] createGroupRemote aborted: supabase not configured");
    return null;
  }
  try {
    console.log("[groups] Creating group");
    console.log("[groups] group name:", params.name);
    console.log("[groups] generated code:", params.code);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const authedUserId = authData?.user?.id;
    console.log("[groups] createGroupRemote user.id:", authedUserId, "paramsUserId:", params.userId);
    if (authErr) {
      console.error("[groups] createGroupRemote auth.getUser error", authErr);
    }
    if (!authedUserId) {
      console.log("[groups] createGroupRemote aborted: user not authenticated");
      return null;
    }
    const creatorId = authedUserId;
    const today = toDateKey(new Date());
    const insertPayload = {
      name: params.name,
      code: params.code,
      icon: "\uD83D\uDD25",
      owner_id: creatorId,
      created_by: creatorId,
      streak: 0,
      last_success_date: null,
      last_reset_date: today,
    };
    console.log("[groups] insert payload:", insertPayload);
    const { data, error } = await supabase
      .from(GROUPS_TABLE)
      .insert(insertPayload)
      .select();
    console.log("[groups] insert error:", error);
    console.log("[groups] insert data:", data);
    if (error) {
      const errDetails = {
        message: error.message,
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
      };
      console.error(
        "[groups] Group creation failed",
        JSON.stringify(errDetails)
      );
      return null;
    }
    if (!data || data.length === 0) {
      console.error("[groups] Group creation failed: no data returned");
      return null;
    }
    const groupRow = data[0] as GroupRow;
    const { error: memErr } = await supabase.from(GROUP_MEMBERS_TABLE).insert({
      group_id: groupRow.id,
      user_id: creatorId,
      name: params.userName,
      joined_at: today,
      streak: 0,
      completed_today: false,
      total_completions: 0,
    });
    if (memErr) {
      console.log(
        "[groups] add owner member error",
        JSON.stringify({
          message: memErr.message,
          code: (memErr as { code?: string }).code,
          details: (memErr as { details?: string }).details,
          hint: (memErr as { hint?: string }).hint,
        })
      );
    }
    return {
      id: groupRow.id,
      name: groupRow.name,
      code: groupRow.code,
      createdAt: new Date(groupRow.created_at).getTime(),
      icon: groupRow.icon ?? "🔥",
      ownerId: groupRow.created_by ?? groupRow.owner_id,
      joinedAt: today,
      streak: 0,
      lastSuccessDate: null,
      lastResetDate: today,
      members: [
        {
          id: creatorId,
          name: params.userName,
          streak: 0,
          completedToday: false,
          totalCompletions: 0,
          isSelf: true,
        },
      ],
    };
  } catch (e) {
    console.log("[groups] createGroupRemote exception", e);
    return null;
  }
}

export type JoinResult =
  | { ok: true; group: Group }
  | { ok: false; reason: "not_found" | "full" | "error"; message?: string };

export async function joinGroupRemote(params: {
  userId: string;
  userName: string;
  code: string;
  maxMembers: number;
}): Promise<JoinResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: "error", message: "Backend not configured" };
  }
  try {
    try {
      await withTimeout(ensureAnonymousSession(), 8000, "auth session");
    } catch (e) {
      console.log("[groups] ensureAnonymousSession failed, continuing", e);
    }
    const rawInput = params.code;
    const code = rawInput.replace(/\s+/g, "").toUpperCase();
    const codeLower = code.toLowerCase();
    console.log("[groups] joinGroupRemote start", {
      rawInput,
      normalized: code,
      userId: params.userId,
    });

    let groupRow: GroupRow | null = null;

    const ilikeRes = await withTimeout(
      supabase.from(GROUPS_TABLE).select("*").ilike("code", code).limit(1),
      10000,
      "group lookup"
    );
    if (ilikeRes.error) {
      console.log("[groups] lookup ilike error", ilikeRes.error.message);
    } else {
      groupRow = ((ilikeRes.data?.[0] as GroupRow | undefined) ?? null) as GroupRow | null;
      console.log("[groups] lookup ilike result", {
        found: Boolean(groupRow),
        groupId: groupRow?.id,
        count: ilikeRes.data?.length ?? 0,
      });
    }

    if (!groupRow) {
      const eqUpperRes = await withTimeout(
        supabase.from(GROUPS_TABLE).select("*").eq("code", code).limit(1),
        10000,
        "group lookup eq upper"
      );
      if (eqUpperRes.error) {
        console.log("[groups] lookup eq upper error", eqUpperRes.error.message);
      } else {
        groupRow = ((eqUpperRes.data?.[0] as GroupRow | undefined) ?? null) as GroupRow | null;
        console.log("[groups] lookup eq upper result", {
          found: Boolean(groupRow),
          groupId: groupRow?.id,
        });
      }
    }

    if (!groupRow) {
      const eqLowerRes = await withTimeout(
        supabase.from(GROUPS_TABLE).select("*").eq("code", codeLower).limit(1),
        10000,
        "group lookup eq lower"
      );
      if (eqLowerRes.error) {
        console.log("[groups] lookup eq lower error", eqLowerRes.error.message);
      } else {
        groupRow = ((eqLowerRes.data?.[0] as GroupRow | undefined) ?? null) as GroupRow | null;
        console.log("[groups] lookup eq lower result", {
          found: Boolean(groupRow),
          groupId: groupRow?.id,
        });
      }
    }

    if (!groupRow) {
      console.log("[groups] lookup: no group found for code", code);
      return { ok: false, reason: "not_found" };
    }

    const membersRes = await withTimeout(
      supabase.from(GROUP_MEMBERS_TABLE).select("*").eq("group_id", groupRow.id),
      10000,
      "members lookup"
    );
    const { data: existingMembers, error: mErr } = membersRes;
    if (mErr) {
      console.log("[groups] members lookup error", mErr.message);
      return { ok: false, reason: "error", message: mErr.message };
    }
    const members = (existingMembers ?? []) as GroupMemberRow[];
    const already = members.find((m) => m.user_id === params.userId);
    if (!already && members.length >= params.maxMembers) {
      return { ok: false, reason: "full" };
    }

    const today = toDateKey(new Date());
    if (!already) {
      const insRes = await withTimeout(
        supabase
          .from(GROUP_MEMBERS_TABLE)
          .insert({
            group_id: groupRow.id,
            user_id: params.userId,
            name: params.userName,
            joined_at: today,
            streak: 0,
            completed_today: false,
            total_completions: 0,
          })
          .select()
          .single(),
        10000,
        "insert member"
      );
      const { data: insertedRow, error: insErr } = insRes;
      console.log("[groups] insert member response", {
        ok: !insErr && Boolean(insertedRow),
        error: insErr?.message,
      });
      if (insErr || !insertedRow) {
        return {
          ok: false,
          reason: "error",
          message: insErr?.message ?? "Could not add you to the group.",
        };
      }
    } else {
      console.log("[groups] user already a member, skipping insert");
    }

    const updatedMembers = already
      ? members
      : [
          ...members,
          {
            group_id: groupRow.id,
            user_id: params.userId,
            name: params.userName,
            joined_at: today,
            streak: 0,
            completed_today: false,
            total_completions: 0,
          } as GroupMemberRow,
        ];

    const group: Group = {
      id: groupRow.id,
      name: groupRow.name,
      code: groupRow.code,
      createdAt: new Date(groupRow.created_at).getTime(),
      icon: groupRow.icon ?? "🔥",
      ownerId: groupRow.created_by ?? groupRow.owner_id,
      joinedAt: today,
      streak: groupRow.streak ?? 0,
      lastSuccessDate: groupRow.last_success_date,
      lastResetDate: groupRow.last_reset_date,
      members: updatedMembers.map((m) => rowToMember(m, params.userId)),
    };
    console.log("[groups] joinGroupRemote success", {
      groupId: group.id,
      members: group.members.length,
      alreadyMember: Boolean(already),
    });
    return { ok: true, group };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[groups] joinGroupRemote exception", msg);
    return { ok: false, reason: "error", message: msg };
  }
}

export async function leaveGroupRemote(
  userId: string,
  groupId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from(GROUP_MEMBERS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("group_id", groupId);
    if (error) {
      console.log("[groups] leave error", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log("[groups] leaveGroupRemote exception", e);
    return false;
  }
}

export async function deleteGroupRemote(groupId: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  if (!isSupabaseConfigured) return { ok: true };
  try {
    console.log("[groups] deleteGroupRemote start", { groupId });

    const { data: photoRows, error: photoListErr } = await supabase
      .from(GROUP_PHOTOS_TABLE)
      .select("id, path")
      .eq("group_id", groupId);
    if (photoListErr) {
      console.log("[groups] delete: list photos error", photoListErr.message);
    }
    const paths = ((photoRows ?? []) as { id: string; path: string | null }[])
      .map((r) => r.path)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from(GROUP_PHOTOS_BUCKET)
        .remove(paths);
      if (storageErr) {
        console.log("[groups] delete: storage remove error", storageErr.message);
      }
    }

    const { error: photosErr } = await supabase
      .from(GROUP_PHOTOS_TABLE)
      .delete()
      .eq("group_id", groupId);
    if (photosErr) {
      console.log("[groups] delete: photos row error", photosErr.message);
    }

    const { error: membersErr } = await supabase
      .from(GROUP_MEMBERS_TABLE)
      .delete()
      .eq("group_id", groupId);
    if (membersErr) {
      console.log("[groups] delete: members error", membersErr.message);
      return { ok: false, message: membersErr.message };
    }

    const { error: groupErr } = await supabase
      .from(GROUPS_TABLE)
      .delete()
      .eq("id", groupId);
    if (groupErr) {
      console.log("[groups] delete: group error", groupErr.message);
      return { ok: false, message: groupErr.message };
    }

    console.log("[groups] deleteGroupRemote success", { groupId });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[groups] deleteGroupRemote exception", msg);
    return { ok: false, message: msg };
  }
}

export async function updateMemberCompletionRemote(params: {
  groupId: string;
  userId: string;
  completedToday: boolean;
  streak: number;
  totalCompletions: number;
}): Promise<{ ok: boolean; alreadyCompleted?: boolean; message?: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  try {
    if (params.completedToday) {
      const { data: existing, error: fetchErr } = await supabase
        .from(GROUP_MEMBERS_TABLE)
        .select("completed_today, streak, total_completions")
        .eq("group_id", params.groupId)
        .eq("user_id", params.userId)
        .maybeSingle();
      if (fetchErr) {
        console.log(
          "[groups] updateMemberCompletion fetch error",
          fetchErr.message
        );
      } else if (existing && existing.completed_today === true) {
        console.log(
          "[groups] updateMemberCompletion idempotent skip",
          { groupId: params.groupId, userId: params.userId }
        );
        return { ok: true, alreadyCompleted: true };
      }
    }
    const { error } = await supabase
      .from(GROUP_MEMBERS_TABLE)
      .update({
        completed_today: params.completedToday,
        streak: params.streak,
        total_completions: params.totalCompletions,
      })
      .eq("group_id", params.groupId)
      .eq("user_id", params.userId);
    if (error) {
      console.log("[groups] updateMemberCompletion error", error.message);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[groups] updateMemberCompletionRemote exception", msg);
    return { ok: false, message: msg };
  }
}

export async function updateGroupStreakRemote(params: {
  groupId: string;
  streak: number;
  lastSuccessDate: string | null;
  lastResetDate: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from(GROUPS_TABLE)
      .update({
        streak: params.streak,
        last_success_date: params.lastSuccessDate,
        last_reset_date: params.lastResetDate,
      })
      .eq("id", params.groupId);
    if (error) console.log("[groups] updateGroupStreak error", error.message);
  } catch (e) {
    console.log("[groups] updateGroupStreakRemote exception", e);
  }
}

export type ComputeStreakResult = {
  ok: boolean;
  allCompleted: boolean;
  streak: number;
  lastSuccessDate: string | null;
  lastResetDate: string | null;
};

export async function computeAndUpdateGroupStreakRemote(
  groupId: string
): Promise<ComputeStreakResult | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const today = toDateKey(new Date());
    const [groupRes, membersRes] = await Promise.all([
      supabase.from(GROUPS_TABLE).select("*").eq("id", groupId).maybeSingle(),
      supabase
        .from(GROUP_MEMBERS_TABLE)
        .select("user_id, completed_today")
        .eq("group_id", groupId),
    ]);
    if (groupRes.error || !groupRes.data) {
      console.log(
        "[groups] computeAndUpdateGroupStreakRemote fetch group error",
        groupRes.error?.message
      );
      return null;
    }
    if (membersRes.error) {
      console.log(
        "[groups] computeAndUpdateGroupStreakRemote fetch members error",
        membersRes.error.message
      );
      return null;
    }
    const g = groupRes.data as GroupRow;
    const members = (membersRes.data ?? []) as {
      user_id: string;
      completed_today: boolean;
    }[];
    const allCompleted =
      members.length >= 2 && members.every((m) => Boolean(m.completed_today));

    let streak = g.streak ?? 0;
    let lastSuccessDate: string | null = g.last_success_date;
    if (allCompleted && g.last_success_date !== today) {
      if (g.last_success_date) {
        const gap = Math.round(
          (new Date(today).getTime() - new Date(g.last_success_date).getTime()) /
            86_400_000
        );
        streak = gap === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      lastSuccessDate = today;
    }
    const lastResetDate = g.last_reset_date ?? today;
    const { error } = await supabase
      .from(GROUPS_TABLE)
      .update({
        streak,
        last_success_date: lastSuccessDate,
        last_reset_date: lastResetDate,
      })
      .eq("id", groupId);
    if (error) {
      console.log(
        "[groups] computeAndUpdateGroupStreakRemote update error",
        error.message
      );
      return null;
    }
    return { ok: true, allCompleted, streak, lastSuccessDate, lastResetDate };
  } catch (e) {
    console.log("[groups] computeAndUpdateGroupStreakRemote exception", e);
    return null;
  }
}

type GroupPhotoRow = {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string | null;
  date?: string | null;
  url?: string | null;
  photo_url?: string | null;
  path: string | null;
  created_at: string;
};

export type RemoteGroupPhoto = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  date: string;
  uri: string;
  createdAt: number;
};

type UploadResult =
  | { ok: true; path: string; url: string }
  | { ok: false; message: string; statusCode?: string };

async function uploadGroupPhotoFile(
  userId: string,
  groupId: string,
  localUri: string
): Promise<UploadResult> {
  try {
    const extMatch = localUri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = (extMatch?.[1] ?? "jpg").toLowerCase();
    const path = `${groupId}/${userId}-${Date.now()}.${ext}`;
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    let body: Blob | ArrayBuffer;
    if (Platform.OS === "web") {
      try {
        const res = await fetch(localUri);
        if (!res.ok) {
          const msg = `Failed to read picked image (status ${res.status})`;
          console.log("[groups] web fetch local uri non-ok", msg);
          return { ok: false, message: msg };
        }
        body = await res.blob();
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.log("[groups] web fetch local uri failed", msg, { localUri: localUri.slice(0, 60) });
        return {
          ok: false,
          message: `Could not read selected image. ${msg}. Try picking a different image.`,
        };
      }
    } else {
      const b64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("binary");
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      body = bytes.buffer;
    }

    const { error } = await supabase.storage
      .from(GROUP_PHOTOS_BUCKET)
      .upload(path, body as ArrayBuffer, { contentType, upsert: true });
    if (error) {
      const statusCode = (error as { statusCode?: string }).statusCode;
      console.log(
        "[groups] upload photo error",
        JSON.stringify({ message: error.message, statusCode, name: error.name })
      );
      return { ok: false, message: error.message, statusCode };
    }
    const { data } = supabase.storage.from(GROUP_PHOTOS_BUCKET).getPublicUrl(path);
    return { ok: true, path, url: data.publicUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[groups] uploadGroupPhotoFile exception", msg);
    return { ok: false, message: msg };
  }
}

export type InsertGroupPhotoResult =
  | { ok: true; photo: RemoteGroupPhoto }
  | { ok: false; reason: "not_configured" | "upload_failed" | "insert_failed" | "exception"; message?: string; code?: string; details?: string; hint?: string };

export async function insertGroupPhotoRemote(params: {
  groupId: string;
  userId: string;
  userName: string;
  localUri: string;
}): Promise<InsertGroupPhotoResult> {
  console.log("STEP 1: starting photo submission");
  if (!isSupabaseConfigured) return { ok: false, reason: "not_configured" };
  try {
    const uploaded = await uploadGroupPhotoFile(params.userId, params.groupId, params.localUri);
    if (!uploaded.ok) {
      console.error(
        "[groups] Photo upload failed (storage)",
        JSON.stringify({
          userId: params.userId,
          groupId: params.groupId,
          message: uploaded.message,
          statusCode: uploaded.statusCode,
        })
      );
      const alertBody = JSON.stringify({
        message: uploaded.message,
        statusCode: uploaded.statusCode,
      });
      try {
        if (Platform.OS === "web") {
          if (typeof window !== "undefined") {
            window.alert(`Photo upload failed (storage)\n${alertBody}`);
          }
        } else {
          Alert.alert("Photo upload failed (storage)", alertBody);
        }
      } catch (alertErr) {
        console.log("[groups] alert error", alertErr);
      }
      return { ok: false, reason: "upload_failed", message: uploaded.message, code: uploaded.statusCode };
    }

    const insertPayload = {
      user_id: params.userId,
      group_id: params.groupId,
      photo_url: uploaded.url,
    };

    console.log("STEP 2: upload complete", { photoUrl: uploaded.url });
    console.log("Submitting workout photo", {
      userId: params.userId,
      groupId: params.groupId,
      photoUrl: uploaded.url,
    });
    console.log("[groups] insert payload", JSON.stringify(insertPayload));

    console.log("STEP 3: about to insert into group_workout_photos");
    const { data, error } = await supabase
      .from(GROUP_PHOTOS_TABLE)
      .insert(insertPayload)
      .select();

    console.log("STEP 4: insert finished", { data, error });
    console.log("Insert result:", data);
    if (error) {
      console.error("Insert error:", error);
      const code = (error as { code?: string }).code;
      const details = (error as { details?: string }).details;
      const hint = (error as { hint?: string }).hint;
      console.error("[groups] insert error details", JSON.stringify({
        message: error.message,
        code,
        details,
        hint,
      }));
      const alertBody = JSON.stringify({
        message: error?.message,
        code,
        details,
      });
      try {
        if (Platform.OS === "web") {
          if (typeof window !== "undefined") {
            window.alert(`Photo upload failed\n${alertBody}`);
          }
        } else {
          Alert.alert("Photo upload failed", alertBody);
        }
      } catch (alertErr) {
        console.log("[groups] alert error", alertErr);
      }
      return { ok: false, reason: "insert_failed", message: error.message, code, details, hint };
    }

    const rows = (data ?? []) as GroupPhotoRow[];
    const row = rows[0];
    if (!row) {
      console.error("[groups] insert photo returned no rows", { data });
      const emptyMsg = "Insert failed: no data returned";
      try {
        if (Platform.OS === "web") {
          if (typeof window !== "undefined") {
            window.alert(`Photo upload failed\n${emptyMsg}`);
          }
        } else {
          Alert.alert("Photo upload failed", emptyMsg);
        }
      } catch (alertErr) {
        console.log("[groups] alert error", alertErr);
      }
      return { ok: false, reason: "insert_failed", message: emptyMsg };
    }
    return {
      ok: true,
      photo: {
        id: row.id,
        groupId: row.group_id,
        userId: row.user_id,
        userName: row.user_name ?? "Member",
        date: toDateKey(new Date(row.created_at)),
        uri: row.photo_url ?? row.url ?? uploaded.url,
        createdAt: new Date(row.created_at).getTime(),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[groups] insertGroupPhotoRemote exception", msg);
    return { ok: false, reason: "exception", message: msg };
  }
}

export async function fetchGroupPhotosRemote(
  groupIds: string[],
  _date?: string
): Promise<RemoteGroupPhoto[]> {
  if (!isSupabaseConfigured || groupIds.length === 0) return [];
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);
    const { data, error } = await supabase
      .from(GROUP_PHOTOS_TABLE)
      .select("*")
      .in("group_id", groupIds)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString())
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[groups] fetch photos error", error.message);
      return [];
    }
    return ((data ?? []) as GroupPhotoRow[]).map((row) => ({
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      userName: row.user_name ?? "Member",
      date: toDateKey(new Date(row.created_at)),
      uri: row.photo_url ?? row.url ?? "",
      createdAt: new Date(row.created_at).getTime(),
    }));
  } catch (e) {
    console.log("[groups] fetchGroupPhotosRemote exception", e);
    return [];
  }
}

export async function updateGroupIconRemote(
  groupId: string,
  icon: string
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from(GROUPS_TABLE)
      .update({ icon })
      .eq("id", groupId);
    if (error) console.log("[groups] icon update error", error.message);
  } catch (e) {
    console.log("[groups] updateGroupIconRemote exception", e);
  }
}
