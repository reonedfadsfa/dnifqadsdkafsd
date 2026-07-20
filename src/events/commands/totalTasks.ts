import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { getTaskLogs, resetTaskLogs } from '../storage.js';
import { TASK_APPROVER_ROLE_ID } from '../config.js';

export const totalTasksCommand = new SlashCommandBuilder()
  .setName('totaltasks')
  .setDescription('View the leaderboard of approved task logs for the current cycle');

export async function handleTotalTasks(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const logs = getTaskLogs(interaction.guild.id);
  const entries = Object.entries(logs).sort(([, a], [, b]) => b - a);
  const embed = await buildLeaderboardEmbed(entries, interaction.guild);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('tt_start_cycle').setLabel('Start New Cycle').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tt_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function buildLeaderboardEmbed(
  entries: [string, number][],
  guild: NonNullable<ChatInputCommandInteraction['guild']>
): Promise<EmbedBuilder> {
  let description: string;

  if (entries.length === 0) {
    description = '*No approved task logs yet this cycle.*';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(
      entries.map(async ([userId, count], index) => {
        const member = await guild.members.fetch(userId).catch(() => null);
        const name = member ? member.displayName : `<@${userId}>`;
        const medal = medals[index] ?? `**${index + 1}.**`;
        return `${medal} ${name} — **${count}** approved task${count === 1 ? '' : 's'}`;
      })
    );
    description = lines.join('\n');
  }

  return new EmbedBuilder()
    .setTitle('📋 Total Tasks — Current Cycle')
    .setColor(0x5865f2)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'Task Leaderboard • Use "Start New Cycle" to reset counts' });
}

export async function handleTotalTasksButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  if (interaction.customId === 'tt_cancel') {
    await interaction.update({ components: [] });
    return;
  }

  if (interaction.customId === 'tt_start_cycle') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const hasApproverRole = member.roles.cache.has(TASK_APPROVER_ROLE_ID);

    if (!isAdmin && !hasApproverRole) {
      await interaction.reply({ content: '❌ Only approvers or admins can start a new cycle.', ephemeral: true });
      return;
    }

    resetTaskLogs(interaction.guild.id);

    const freshEmbed = new EmbedBuilder()
      .setTitle('📋 Total Tasks — New Cycle Started')
      .setColor(0x57f287)
      .setDescription('*A new cycle has begun. Task counts have been reset.*')
      .setTimestamp()
      .setFooter({ text: `Cycle reset by ${member.displayName}` });

    await interaction.update({ embeds: [freshEmbed], components: [] });
  }
}
