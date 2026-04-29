import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "@onstreak/chat-last-seen/v1";

type LastSeenMap = Record<string, number>;

export const [ChatReadProvider, useChatRead] = createContextHook(() => {
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({});
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LastSeenMap;
          if (parsed && typeof parsed === "object") setLastSeen(parsed);
        }
      } catch (e) {
        console.log("[chat-read] hydrate error", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const markSeen = useCallback((groupId: string, at: number = Date.now()) => {
    setLastSeen((prev) => {
      const next = { ...prev, [groupId]: at };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
        console.log("[chat-read] persist error", e)
      );
      return next;
    });
  }, []);

  const getLastSeen = useCallback(
    (groupId: string): number => lastSeen[groupId] ?? 0,
    [lastSeen]
  );

  return { lastSeen, getLastSeen, markSeen, hydrated };
});
