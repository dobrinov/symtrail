// Pure routing decision for the root auth/onboarding gate. Given the auth
// state, the local profile count, and the current top route segment, returns
// the route to redirect to — or null to stay put. The app is unusable without
// at least one profile, so authenticated zero-profile users are forced into
// the onboarding flow before the tabs become reachable.
export function resolveRoute(
  authed: boolean,
  profileCount: number,
  topSegment: string | undefined,
): string | null {
  if (!authed) {
    return topSegment === "(auth)" ? null : "/(auth)/sign-in";
  }
  if (profileCount === 0) {
    return topSegment === "(onboarding)" ? null : "/(onboarding)";
  }
  // Has a profile: get out of the auth/onboarding groups, otherwise stay.
  return topSegment === "(auth)" || topSegment === "(onboarding)" ? "/(tabs)" : null;
}
