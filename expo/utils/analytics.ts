import type PostHog from "posthog-react-native";

let client: PostHog | null = null;
let identifiedId: string | null = null;

export function setAnalyticsClient(instance: PostHog | null): void {
  client = instance;
}

export function getAnalyticsClient(): PostHog | null {
  return client;
}

export function track(event: string, props?: Record<string, unknown>): void {
  try {
    if (!client) {
      console.log("[analytics] track skipped (no client)", event);
      return;
    }
    client.capture(event, props);
    console.log("[analytics] track", event, props ?? {});
  } catch (e) {
    console.log("[analytics] track error", e);
  }
}

export function identifyUser(
  id: string,
  props?: Record<string, unknown>
): void {
  try {
    if (!client) {
      console.log("[analytics] identify skipped (no client)", id);
      return;
    }
    if (identifiedId === id) {
      return;
    }
    client.identify(id, props);
    identifiedId = id;
    console.log("[analytics] identify", id, props ?? {});
  } catch (e) {
    console.log("[analytics] identify error", e);
  }
}

export function resetAnalyticsIdentity(): void {
  identifiedId = null;
  try {
    client?.reset();
  } catch (e) {
    console.log("[analytics] reset error", e);
  }
}
