import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
  ChatInputCommandInteraction,
  Interaction,
  ButtonInteraction,
  Channel,
} from 'discord.js';

import { roleChannelCommand, handleRoleChannel } from './commands/roleChannel.js';
import { roleCommand, handleRole } from './commands/role.js';
import { queCommand, handleQue } from './commands/que.js';
import { roleRequestCommand, handleRoleRequest, handleRoleRequestButton } from './commands/roleRequest.js';
import { recruitCommand, handleRecruit } from './commands/recruit.js';
import { recruitLogCommand, handleRecruitLog } from './commands/recruitLog.js';
import { taskLogCommand, handleTaskLog, handleTaskLogButton } from './commands/taskLog.js';
import { totalTasksCommand, handleTotalTasks, handleTotalTasksButton } from './commands/totalTasks.js';
import { loaChannelCommand, handleLoaChannel } from './commands/loaChannel.js';
import { loaRequestCommand, handleLoaRequest, handleLoaButton } from './commands/loaRequest.js';
import { handleChannelCreate } from './events/missedPromo.js';

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is not set.');
  process.exit(1);
}

const commands = [
  roleChannelCommand,
  roleCommand,
  queCommand,
  roleRequestCommand,
  recruitCommand,
  recruitLogCommand,
  taskLogCommand,
  totalTasksCommand,
  loaChannelCommand,
  loaRequestCommand,
];

const commandHandlers = new Collection<string, (interaction: ChatInputCommandInteraction) => Promise<void>>();
commandHandlers.set('rolechannel', handleRoleChannel);
commandHandlers.set('role', handleRole);
commandHandlers.set('que', handleQue);
commandHandlers.set('rolerequest', handleRoleRequest);
commandHandlers.set('recruit', handleRecruit);
commandHandlers.set('recruitlog', handleRecruitLog);
commandHandlers.set('tasklog', handleTaskLog);
commandHandlers.set('totaltasks', handleTotalTasks);
commandHandlers.set('loachannel', handleLoaChannel);
commandHandlers.set('loarequest', handleLoaRequest);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
});

client.once('clientReady', async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN!);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    console.log(`✅ Registered ${commands.length} slash commands globally.`);
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

// Auto-send missed promo embed when a channel is created in the promo category
client.on('channelCreate', async (channel: Channel) => {
  try {
    await handleChannelCreate(channel);
  } catch (err) {
    console.error('Error handling channelCreate:', err);
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) return;
    try {
      await handler(interaction);
    } catch (err) {
      console.error(`Error handling /${interaction.commandName}:`, err);
      const msg = { content: '❌ An error occurred while running this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => null);
      } else {
        await interaction.reply(msg).catch(() => null);
      }
    }
    return;
  }

  // Button interactions
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;

    // Role request buttons
    if (btn.customId.startsWith('rr_approve_') || btn.customId.startsWith('rr_deny_')) {
      try {
        await handleRoleRequestButton(btn);
      } catch (err) {
        console.error('Error handling role request button:', err);
        await btn.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
      }
      return;
    }

    // Task log buttons
    if (btn.customId.startsWith('tl_approve_') || btn.customId.startsWith('tl_deny_')) {
      try {
        await handleTaskLogButton(btn);
      } catch (err) {
        console.error('Error handling task log button:', err);
        await btn.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
      }
      return;
    }

    // Total tasks buttons
    if (btn.customId === 'tt_start_cycle' || btn.customId === 'tt_cancel') {
      try {
        await handleTotalTasksButton(btn);
      } catch (err) {
        console.error('Error handling total tasks button:', err);
        await btn.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
      }
      return;
    }

    // LOA buttons
    if (btn.customId.startsWith('loa_approve_') || btn.customId.startsWith('loa_deny_')) {
      try {
        await handleLoaButton(btn);
      } catch (err) {
        console.error('Error handling LOA button:', err);
        await btn.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
      }
      return;
    }
  }
});

client.login(TOKEN);
