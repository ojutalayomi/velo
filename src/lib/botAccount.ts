/** True when a name or username has "bot" as its own word (velo_bot, "Help Bot"), not inside another ("Abbott", "Robotics"). */
export function hasBotHandle(...values: Array<string | null | undefined>): boolean {
  return values.some((v) => /(^|[\s_.\-])bot($|[\s_.\-])/i.test(String(v ?? "")));
}

/** Same rule the User class uses: a stored account type wins, otherwise a "bot" name or username. */
export function isBotAccount(
  user: { accountType?: string; name?: string; username?: string } | null | undefined
): boolean {
  if (!user) return false;
  if (user.accountType) return user.accountType === "bot";
  return hasBotHandle(user.name, user.username);
}
