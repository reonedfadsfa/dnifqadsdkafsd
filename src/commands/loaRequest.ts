import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { getGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID, LOA_ROLE_ID } from '../config.js';

export const loaRequestCommand = new SlashCommandBuilder()
  .setName('loarequest')
  .setDescription('Submit a Leave of Absence request')
  .addStringOption((opt) =>
    opt.setName('reason').setDescription('Reason for your LOA').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('length').setDescription('How long will your LOA last? (e.g. 1 week, 3 days)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('notes').setDescription('Any additional notes').setRequired(false)
  );

export async function handleLoaRequest(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const config = getGuildConfig(interaction.guild.id);
  if (!config.loaChannel) {
    await interaction.reply({
      content: '❌ No LOA channel has been set. An administrator must use `/loachannel` first.',
      ephemeral: true,
    });
    return;
  }

  const loaChannel = interaction.guild.channels.cache.get(config.loaChannel) as TextChannel | undefined;
  if (!loaChannel) {
    await interaction.reply({ content: '❌ The configured LOA channel no longer exists.', ephemeral: true });
    return;
  }

  const reason = interaction.options.getString('reason', true);
  const length = interaction.options.getString('length', true);
  const notes = interaction.options.getString('notes') ?? 'None';
  const submitterMember = await interaction.guild.members.fetch(interaction.user.id);

  await interaction.deferReply({ ephemeral: true });

  try {
    await submitterMember.roles.add(LOA_ROLE_ID, 'LOA request submitted');
  } catch {
    await interaction.editReply({ content: '❌ Failed to assign the LOA role. Please contact an administrator.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Leave of Absence Request')
    .setColor(0xffa500)
    .addFields(
      { name: 'Member', value: `${submitterMember} | ${submitterMember.displayName}`, inline: true },
      { name: 'Reviewed By', value: 'Pending', inline: true },
      { name: 'Status', value: 'Pending', inline: true },
      { name: 'Reason', value: reason },
      { name: 'Length', value: length, inline: true },
      { name: 'Notes', value: notes, inline: true }
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'LOA Request' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`loa_approve_${interaction.user.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`loa_deny_${interaction.user.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  await loaChannel.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Your LOA request has been submitted to ${loaChannel}. You have been given the LOA role.` });
}

export async function handleLoaButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const reviewerMember = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = reviewerMember.permissions.has(PermissionFlagsBits.Administrator);
  const hasPrivilegedRole = reviewerMember.roles.cache.has(PRIVILEGED_ROLE_ID);

  if (!isAdmin && !hasPrivilegedRole) {
    await interaction.reply({ content: '❌ You do not have permission to approve or deny LOA requests.', ephemeral: true });
    return;
  }

  const parts = interaction.customId.split('_');
  const action = parts[1];
  const targetUserId = parts[2];
  const isApprove = action === 'approve';

  await interaction.deferUpdate();

  if (!isApprove) {
    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      await targetMember.roles.remove(LOA_ROLE_ID, `LOA denied by ${interaction.user.tag}`).catch(() => null);
    }
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
      .setCustomId('loa_result_disabled')
      .setLabel(`LOA ${isApprove ? 'Approved' : 'Denied'} By: ${reviewerMember.displayName}`)
      .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({ embeds: [updatedEmbed], components: [resultRow] });
}
