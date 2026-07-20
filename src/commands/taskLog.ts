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
import { incrementTaskLog } from '../storage.js';
import { TASK_APPROVER_ROLE_ID } from '../config.js';

export const taskLogCommand = new SlashCommandBuilder()
  .setName('tasklog')
  .setDescription('Submit a task log for approval')
  .addStringOption((opt) =>
    opt.setName('task').setDescription('The task you completed').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('proof').setDescription('Proof of completion (image URL, screenshot link, or description)').setRequired(true)
  );

export async function handleTaskLog(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const task = interaction.options.getString('task', true);
  const proof = interaction.options.getString('proof', true);
  const submitterMember = await interaction.guild.members.fetch(interaction.user.id);

  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setTitle('Task Log')
    .setColor(0xffa500)
    .addFields(
      { name: 'Submitted By', value: `${submitterMember} | ${submitterMember.displayName}`, inline: true },
      { name: 'Reviewed By', value: 'Pending', inline: true },
      { name: 'Status', value: 'Pending', inline: true },
      { name: 'Task', value: task },
      { name: 'Proof', value: proof }
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'Task Log' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`tl_approve_${interaction.user.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tl_deny_${interaction.user.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleTaskLogButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const reviewerMember = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = reviewerMember.permissions.has(PermissionFlagsBits.Administrator);
  const hasApproverRole = reviewerMember.roles.cache.has(TASK_APPROVER_ROLE_ID);

  if (!isAdmin && !hasApproverRole) {
    await interaction.reply({ content: '❌ You do not have permission to approve or deny task logs.', ephemeral: true });
    return;
  }

  const parts = interaction.customId.split('_');
  const action = parts[1];
  const targetUserId = parts[2];
  const isApprove = action === 'approve';

  await interaction.deferUpdate();

  if (isApprove) {
    incrementTaskLog(interaction.guild.id, targetUserId);
  }

  const oldEmbed = interaction.message.embeds[0];
  if (!oldEmbed) return;

  const updatedEmbed = EmbedBuilder.from(oldEmbed)
    .setColor(isApprove ? 0x57f287 : 0xed4245)
    .spliceFields(1, 2,
      { name: 'Reviewed By', value: `${interaction.user} | ${reviewerMember.displayName}`, inline: true },
      { name: 'Status', value: isApprove ? 'Approved' : 'Denied', inline: true }
    );

  const resultRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tl_result_disabled')
      .setLabel(`Task Log ${isApprove ? 'Approved' : 'Denied'} By: ${reviewerMember.displayName}`)
      .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({ embeds: [updatedEmbed], components: [resultRow] });
}
