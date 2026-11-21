/** Same rule the User class uses: a stored account type wins, otherwise a "bot" name or username. */
export function isBotAccount(
  user: { accountType?: string; name?: string; username?: string } | null | undefined
): boolean {
  if (!user) return false;
  if (user.accountType) return user.accountType === "bot";
  return [user.name, user.username].some((value) => String(value ?? "").toLowerCase().includes("bot"));
}
