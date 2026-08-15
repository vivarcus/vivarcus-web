export function resolveHeaderUserIdentity(input: {
  profileName?: string;
  profileEmail?: string;
  sessionUsername?: string;
}): { displayName: string; email: string } {
  const sessionUsername = input.sessionUsername?.trim() ?? "";
  const profileName = input.profileName?.trim() ?? "";
  const profileEmail = input.profileEmail?.trim() ?? "";

  const email = profileEmail || sessionUsername;
  const displayName = profileName || sessionUsername || "User";

  return { displayName, email };
}

export function shouldShowHeaderUserEmail(displayName: string, email: string): boolean {
  const name = displayName.trim();
  const mail = email.trim();
  return mail.length > 0 && mail.toLowerCase() !== name.toLowerCase();
}
