import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { getTaskLogs, resetTaskLogs } from "../storage.js";
import { TASK_APPROVER_ROLE_ID } from "../config.js";

export const totalTasksCommand = new SlashCommandBuilder()
  .setName("totaltasks")
  .setDescription("View the approved task leaderboard for a rank")
  .addStringOption((opt) =>
    opt
      .setName("rank")
      .setDescription("Which rank to view")
      .setRequired(true)
      .addChoices(
        { name: "Consigliere", value: "Consigliere" },
        { name: "Executive", value: "Executive" },
        { name: "Supervisor", value: "Supervisor" },
        { name: "Pre-Command", value: "Pre-Command" },
      ),
  )
  .addBooleanOption((opt) =>
    opt
      .setName("pre_command")
      .setDescription("View the Pre-Command leaderboard for this rank?")
      .setRequired(true),
  );

export async function handleTotalTasks(interaction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
  }

  const rank = interaction.options.getString("rank", true);
  const preCommand = interaction.options.getBoolean("pre_command", true);
  const rankKey = preCommand ? `Pre-${rank}` : rank;

  await interaction.deferReply();

  const logs = getTaskLogs(interaction.guild.id, rankKey);
  const entries = Object.entries(logs).sort(([, a], [, b]) => b - a);
  const embed = await buildLeaderboardEmbed(
    entries,
    interaction.guild,
    rankKey,
  );

  const encodedRank = encodeURIComponent(rankKey);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tt_start_cycle_${encodedRank}`)
      .setLabel("Start New Cycle")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("tt_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function buildLeaderboardEmbed(entries, guild, rankKey) {
  let description;

  if (entries.length === 0) {
    description = `*No approved task logs yet this cycle for **${rankKey}**.*`;
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    const lines = await Promise.all(
      entries.map(async ([userId, count], index) => {
        const member = await guild.members.fetch(userId).catch(() => null);
        const name = member ? member.displayName : `<@${userId}>`;
        const medal = medals[index] ?? `**${index + 1}.**`;
        return `${medal} ${name} — **${count}** approved task${count === 1 ? "" : "s"}`;
      }),
    );
    description = lines.join("\n");
  }

  return new EmbedBuilder()
    .setTitle(`📋 Total Tasks — ${rankKey} • Current Cycle`)
    .setColor(0x5865f2)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: `${rankKey} Leaderboard • Use "Start New Cycle" to reset counts`,
    });
}

export async function handleTotalTasksButton(interaction) {
  if (!interaction.guild) return;

  if (interaction.customId === "tt_cancel") {
    return interaction.update({ components: [] });
  }

  if (interaction.customId.startsWith("tt_start_cycle_")) {
    const encodedRank = interaction.customId.slice("tt_start_cycle_".length);
    const rankKey = decodeURIComponent(encodedRank);
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isAdmin && !member.roles.cache.has(TASK_APPROVER_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Only approvers or admins can start a new cycle.",
        ephemeral: true,
      });
    }

    resetTaskLogs(interaction.guild.id, rankKey);

    const freshEmbed = new EmbedBuilder()
      .setTitle(`📋 Total Tasks — ${rankKey} • New Cycle Started`)
      .setColor(0x57f287)
      .setDescription(
        `*A new cycle has begun. **${rankKey}** task counts have been reset.*`,
      )
      .setTimestamp()
      .setFooter({ text: `Cycle reset by ${member.displayName}` });

    await interaction.update({ embeds: [freshEmbed], components: [] });
  }
}
