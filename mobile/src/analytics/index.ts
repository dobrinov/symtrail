// Analytics — thin wrapper around PostHog, injected via AppServices so screens
// depend on this interface, not the SDK. Each environment (development /
// staging / production) points at its own PostHog project: the key arrives at
// build time through EXPO_PUBLIC_POSTHOG_API_KEY (eas.json per profile, .env
// locally). No key → a silent no-op client, so tests and keyless dev runs
// never load the SDK or send anything.
//
// Privacy: users stay anonymous (no identify), and events carry only
// coarse-grained properties — never symptom names, temperatures, or any other
// health data.
import { APP_ENV } from "../config";

export type EventProps = Record<string, string | number | boolean>;

// Friendly names for Entry.entryType values, used in event names and the
// log_type property ("temp" → "temperature_logged", …).
export const LOG_TYPE_NAMES = {
  symptom: "symptom",
  temp: "temperature",
  med: "medication",
  note: "note",
} as const;

export interface Analytics {
  /** Record a named product event. */
  track(event: string, props?: EventProps): void;
  /** Record a screen view (route change). */
  screen(name: string): void;
  /** Drop the anonymous id (sign-out). */
  reset(): void;
}

export const noopAnalytics: Analytics = { track() {}, screen() {}, reset() {} };

export function createAnalytics(): Analytics {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!apiKey) return noopAnalytics;
  const PostHog = (require("posthog-react-native") as typeof import("posthog-react-native")).default;
  const client = new PostHog(apiKey, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    captureAppLifecycleEvents: true, // Application Opened / Backgrounded / Updated
  });
  // Per-env projects already separate the data; the super property makes the
  // environment explicit on every event anyway (cheap insurance against a key
  // pasted into the wrong profile).
  void client.register({ app_env: APP_ENV });
  return {
    track: (event, props) => client.capture(event, props),
    screen: (name) => client.screen(name),
    reset: () => client.reset(),
  };
}
