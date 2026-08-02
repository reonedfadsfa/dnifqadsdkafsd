import { Client, GatewayIntentBits, Partials, REST, Routes, Collection } from 'discord.js';

import { roleChannelCommand, handleRoleChannel }               from './commands/roleChannel.js';
import { roleCommand, handleRole }                             from './commands/role.js';
import { queCommand, handleQue }                               from './commands/que.js';
import { roleRequestCommand, handleRoleRequest, handleRoleRequestButton } from './commands/roleRequest.js';
import { recruitCommand, handleRecruit }                       from './commands/recruit.js';
import { recruitLogCommand, handleRecruitLog }                 from './commands/recruitLog.js';
import { taskLogCommand, handleTaskLog, handleTaskLogButton }  from './commands/taskLog.js';
import { totalTasksCommand, handleTotalTasks, handleTotalTasksButton } from './commands/totalTasks.js';
import { loaChannelCommand, handleLoaChannel }                 from './commands/loaChannel.js';
import { loaRequestCommand, handleLoaRequest, handleLoaButton } from './commands/loaRequest.js';
import { handleChannelCreate }                                 from './events/missedPromo.js';
import { handleGuildCreate, checkAllGuildsOnStartup }          from './events/guildAuth.js';

const TOKEN = (process.env.DISCORD_BOT_TOKEN || '').trim();
if (!TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is not set.');
  process.exit(1);
}

// ── Command registry ──────────────────────────────────────────────────────────
const commands = [
  roleChannelCommand, roleCommand, queCommand, roleRequestCommand,
  recruitCommand, recruitLogCommand, taskLogCommand, totalTasksCommand,
  loaChannelCommand, loaRequestCommand,
];

const handlers = new Collection();
handlers.set('rolechannel', handleRoleChannel);
handlers.set('role',        handleRole);
handlers.set('que',         handleQue);
handlers.set('rolerequest', handleRoleRequest);
handlers.set('recruit',     handleRecruit);
handlers.set('recruitlog',  handleRecruitLog);
handlers.set('tasklog',     handleTaskLog);
handlers.set('totaltasks',  handleTotalTasks);
handlers.set('loachannel',  handleLoaChannel);
handlers.set('loarequest',  handleLoaRequest);

// ── Client ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.GuildMember],
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once('clientReady', async (ready) => {
  console.log(`✅ Logged in as ${ready.user.tag}`);

  // Leave any guilds that are not on the authorised list
  await checkAllGuildsOnStartup(client);

  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(ready.user.id), {
      body: commands.map((c) => c.toJSON()),
    });
    console.log(`✅ Registered ${commands.length} slash commands globally.`);
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

// ── Guild auth ────────────────────────────────────────────────────────────────
client.on('guildCreate', async (guild) => {
  try { await handleGuildCreate(guild); }
  catch (err) { console.error('Error in guildCreate:', err); }
});

// ── Missed promo ──────────────────────────────────────────────────────────────
client.on('channelCreate', async (channel) => {
  try { await handleChannelCreate(channel); }
  catch (err) { console.error('Error in channelCreate:', err); }
});

// ── Interactions ──────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const handler = handlers.get(interaction.commandName);
    if (!handler) return;
    try {
      await handler(interaction);
    } catch (err) {
      console.error(`Error handling /${interaction.commandName}:`, err);
      const msg = { content: '❌ An error occurred.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => null);
      else await interaction.reply(msg).catch(() => null);
    }
    return;
  }

  // Buttons
  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith('rr_approve_') || interaction.customId.startsWith('rr_deny_')) {
        await handleRoleRequestButton(interaction);
      } else if (interaction.customId.startsWith('tl_approve_') || interaction.customId.startsWith('tl_deny_')) {
        await handleTaskLogButton(interaction);
      } else if (interaction.customId === 'tt_start_cycle' || interaction.customId === 'tt_cancel') {
        await handleTotalTasksButton(interaction);
      } else if (interaction.customId.startsWith('loa_approve_') || interaction.customId.startsWith('loa_deny_')) {
        await handleLoaButton(interaction);
      }
    } catch (err) {
      console.error('Error handling button:', err);
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
    }
  }
});

client.login(TOKEN);
