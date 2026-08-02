import { ALLOWED_GUILD_IDS } from '../config.js';

/**
 * Returns true when the guild is authorised to use the bot.
 * If ALLOWED_GUILD_IDS is empty every guild is allowed.
 */
export function isGuildAuthorised(guildId) {
  if (!ALLOWED_GUILD_IDS || ALLOWED_GUILD_IDS.length === 0) return true;
  return ALLOWED_GUILD_IDS.includes(guildId);
}

/**
 * Called on the guildCreate event.
 * If the guild is not authorised, DM the owner and leave.
 */
export async function handleGuildCreate(guild) {
  if (isGuildAuthorised(guild.id)) {
    console.log(`✅ Joined authorised guild: ${guild.name} (${guild.id})`);
    return;
  }

  console.warn(`⛔ Joined unauthorised guild: ${guild.name} (${guild.id}) — leaving.`);

  try {
    const owner = await guild.fetchOwner();
    await owner.send(
      `⛔ **Server Unauthorised**\n\n` +
      `Your server **${guild.name}** is not authorised to use this bot.\n` +
      `The bot will now leave your server. Please contact the bot owner if you believe this is a mistake.`
    ).catch(() => null); // DM may be blocked — don't crash
  } catch (err) {
    console.error('Could not DM guild owner:', err);
  }

  try {
    await guild.leave();
    console.log(`👋 Left unauthorised guild: ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error('Failed to leave guild:', err);
  }
}

/**
 * Called once on ready — leaves any guilds the bot is already in
 * that are not on the allowed list.
 */
export async function checkAllGuildsOnStartup(client) {
  if (!ALLOWED_GUILD_IDS || ALLOWED_GUILD_IDS.length === 0) return;

  for (const [guildId, guild] of client.guilds.cache) {
    if (!isGuildAuthorised(guildId)) {
      console.warn(`⛔ Leaving unauthorised guild on startup: ${guild.name} (${guildId})`);
      try {
        const owner = await guild.fetchOwner();
        await owner.send(
          `⛔ **Server Unauthorised**\n\n` +
          `Your server **${guild.name}** is not authorised to use this bot.\n` +
          `The bot will now leave your server. Please contact the bot owner if you believe this is a mistake.`
        ).catch(() => null);
      } catch { /* ignore */ }
      await guild.leave().catch(() => null);
    }
  }
}
