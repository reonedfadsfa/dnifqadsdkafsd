import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} from 'discord.js';
import { incrementTaskLog } from '../storage.js';
import { TASK_APPROVER_ROLE_ID } from '../config.js';

export const taskLogCommand = new SlashCommandBuilder()
  .setName('tasklog')
  .setDescription('Submit a task log for approval')
  .addStringOption((opt) =>
    opt.setName('rank')
      .setDescription('Your rank')
      .setRequired(true)
      .addChoices(
        { name: 'Consigliere', value: 'Consigliere' },
        { name: 'Executive',   value: 'Executive'   },
        { name: 'Supervisor',  value: 'Supervisor'  },
        { name: 'Pre-Command',  value: 'Pre-Command'  },
      )
  )
  .addBooleanOption((opt) =>
    opt.setName('pre_command')
      .setDescription('Are you a Pre-Command member (being evaluated for this rank)?')
      .setRequired(true)
  )
  .addStringOption((opt) => opt.setName('task').setDescription('The task you completed').setRequired(true))
  .addStringOption((opt) => opt.setName('proof').setDescription('Proof of completion (URL, link, or description)').setRequired(true));

export async function handleTaskLog(interaction) {
  if (!interaction.guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  const rank       = interaction.options.getString('rank',        true);
  const preCommand = interaction.options.getBoolean('pre_command', true);
  const task       = interaction.options.getString('task',        true);
  const proof      = interaction.options.getString('proof',       true);
  const submitter  = await interaction.guild.members.fetch(interaction.user.id);

  // Storage key: "Pre-Consigliere" vs "Consigliere" etc.
  const rankKey    = preCommand ? `Pre-${rank}` : rank;
  const rankLabel  = preCommand ? `Pre-${rank}` : rank;

  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setTitle('Task Log')
    .setColor(0xffa500)
    .addFields(
      { name: 'Submitted By', value: `${submitter} | ${submitter.displayName}`, inline: true },
      { name: 'Rank',         value: rankLabel, inline: true },
      { name: 'Status',       value: 'Pending', inline: true },
      { name: 'Reviewed By',  value: 'Pending', inline: true },
      { name: 'Task',         value: task  },
      { name: 'Proof',        value: proof },
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'Task Log' });

  // Encode rankKey in button ID (no spaces — use URL-safe encoding)
  const encodedRank = encodeURIComponent(rankKey);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tl_approve_${interaction.user.id}_${encodedRank}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tl_deny_${interaction.user.id}_${encodedRank}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleTaskLogButton(interaction) {
  if (!interaction.guild) return;

  const reviewer = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin  = reviewer.permissions.has(PermissionFlagsBits.Administrator);

  if (!isAdmin && !reviewer.roles.cache.has(TASK_APPROVER_ROLE_ID)) {
    return interaction.reply({ content: '❌ You do not have permission to approve or deny task logs.', ephemeral: true });
  }

  // customId format: tl_<action>_<userId>_<encodedRank>
  const parts        = interaction.customId.split('_');
  const action       = parts[1];               // approve | deny
  const targetUserId = parts[2];               // Discord snowflake
  const encodedRank  = parts.slice(3).join('_');
  const rankKey      = decodeURIComponent(encodedRank);
  const isApprove    = action === 'approve';

  await interaction.deferUpdate();

  if (isApprove) incrementTaskLog(interaction.guild.id, targetUserId, rankKey);

  const oldEmbed = interaction.message.embeds[0];
  if (!oldEmbed) return;

  const updatedEmbed = EmbedBuilder.from(oldEmbed)
    .setColor(isApprove ? 0x57f287 : 0xed4245)
    .spliceFields(2, 2,
      { name: 'Status',      value: isApprove ? 'Approved' : 'Denied',              inline: true },
      { name: 'Reviewed By', value: `${interaction.user} | ${reviewer.displayName}`, inline: true },
    );

  const resultRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tl_result_disabled')
      .setLabel(`Task Log ${isApprove ? 'Approved' : 'Denied'} By: ${reviewer.displayName}`)
      .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true),
  );

  await interaction.message.edit({ embeds: [updatedEmbed], components: [resultRow] });
}
