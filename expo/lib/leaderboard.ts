import { supabase, isSupabaseConfigured, PROFILES_TABLE } from "./supabase";
import { GROUPS_TABLE, GROUP_MEMBERS_TABLE } from "./groups";

export type LeaderboardUser = {
  id: string;
  name: string;
  streak: number;
  total: number;
};

export type LeaderboardGroup = {
  id: string;
  name: string;
  icon: string;
  score: number;
  size: number;
};

type ProfileLite = {
  user_id: string;
  name: string | null;
  streak: number | null;
  completed_dates: string[] | null;
};

type GroupLite = {
  id: string;
  name: string;
  icon: string | null;
};

type MemberLite = {
  group_id: string;
  streak: number | null;
};

export async function fetchGlobalIndividualLeaderboard(
  limit: number = 50
): Promise<LeaderboardUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select("user_id, name, streak, completed_dates")
      .order("streak", { ascending: false })
      .limit(limit);
    if (error) {
      console.log("[leaderboard] individual fetch error", error.message);
      return [];
    }
    return ((data ?? []) as ProfileLite[])
      .filter((p) => !!p.user_id)
      .map((p) => {
        const full = (p.name ?? "").trim();
        const first = full.split(/\s+/)[0] ?? "";
        return {
          id: p.user_id,
          name: first,
          streak: p.streak ?? 0,
          total: Array.isArray(p.completed_dates) ? p.completed_dates.length : 0,
        };
      })
      .filter((u) => u.name.length > 0);
  } catch (e) {
    console.log("[leaderboard] individual exception", e);
    return [];
  }
}

export async function fetchGlobalGroupLeaderboard(
  limit: number = 50
): Promise<LeaderboardGroup[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const [groupsRes, membersRes] = await Promise.all([
      supabase.from(GROUPS_TABLE).select("id, name, icon").limit(200),
      supabase.from(GROUP_MEMBERS_TABLE).select("group_id, streak"),
    ]);
    if (groupsRes.error) {
      console.log("[leaderboard] groups error", groupsRes.error.message);
      return [];
    }
    if (membersRes.error) {
      console.log("[leaderboard] members error", membersRes.error.message);
    }
    const members = (membersRes.data ?? []) as MemberLite[];
    const scores = new Map<string, { score: number; size: number }>();
    for (const m of members) {
      const prev = scores.get(m.group_id) ?? { score: 0, size: 0 };
      scores.set(m.group_id, {
        score: prev.score + (m.streak ?? 0),
        size: prev.size + 1,
      });
    }
    const out: LeaderboardGroup[] = ((groupsRes.data ?? []) as GroupLite[]).map(
      (g) => {
        const s = scores.get(g.id) ?? { score: 0, size: 0 };
        return {
          id: g.id,
          name: g.name,
          icon: g.icon ?? "🔥",
          score: s.score,
          size: s.size,
        };
      }
    );
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit);
  } catch (e) {
    console.log("[leaderboard] group exception", e);
    return [];
  }
}
