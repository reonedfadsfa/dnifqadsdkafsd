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
import { getGuildConfig, isRoleAllowedForRequest } from '../storage.js';
import { ROLE_APPROVER_ROLE_ID } from '../config.js';

export const roleRequestCommand = new SlashCommandBuilder()
  .setName('rolerequest')
  .setDescription('Submit a request to be given a role')
  .addRoleOption((opt) =>
    opt.setName('role').setDescription('The role you are requesting').setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName('requester').setDescription('The user requesting the role (defaults to you)').setRequired(false)
  );

export async function handleRoleRequest(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const config = getGuildConfig(interaction.guild.id);
  if (!config.roleRequestChannel) {
    await interaction.reply({
      content: '❌ No role request channel has been set. An administrator must use `/que set` first.',
      ephemeral: true,
    });
    return;
  }

  const role = interaction.options.getRole('role', true);

  if (!isRoleAllowedForRequest(interaction.guild.id, role.id)) {
    await interaction.reply({
      content: `❌ The role **${role.name}** cannot be requested. It has been disallowed or is not on the approved list.`,
      ephemeral: true,
    });
    return;
  }

  const requestChannel = interaction.guild.channels.cache.get(config.roleRequestChannel) as TextChannel | undefined;
  if (!requestChannel) {
    await interaction.reply({ content: '❌ The configured role request channel no longer exists.', ephemeral: true });
    return;
  }

  const requesterUser = interaction.options.getUser('requester') ?? interaction.user;
  const requesterMember = await interaction.guild.members.fetch(requesterUser.id).catch(() => null);
  const requestedForMember = await interaction.guild.members.fetch(interaction.user.id);

  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle('Role Request')
    .setColor(0xffa500)
    .addFields(
      { name: 'Requested For', value: `${requestedForMember} | ${requestedForMember.displayName}`, inline: true },
      {
        name: 'Requested By',
        value: requesterMember
          ? `${requesterMember} | ${requesterMember.displayName}`
          : `<@${requesterUser.id}> | ${requesterUser.username}`,
        inline: true,
      },
      { name: 'Reviewed By', value: 'Pending', inline: true },
      { name: 'Role to Add', value: `${role}\n${role.name} | ${role.id}` }
    )
    .setTimestamp()
    .setFooter({ text: 'Role Request' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rr_approve_${interaction.user.id}_${role.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rr_deny_${interaction.user.id}_${role.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  await requestChannel.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Your role request for ${role} has been submitted to ${requestChannel}.` });
}

export async function handleRoleRequestButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  const hasApproverRole = member.roles.cache.has(ROLE_APPROVER_ROLE_ID);

  if (!isAdmin && !hasApproverRole) {
    await interaction.reply({ content: '❌ You do not have permission to approve or deny role requests.', ephemeral: true });
    return;
  }

  const parts = interaction.customId.split('_');
  const action = parts[1];
  const targetUserId = parts[2];
  const roleId = parts[3];
  const isApprove = action === 'approve';

  const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
  const role = interaction.guild.roles.cache.get(roleId);

  if (!targetMember || !role) {
    await interaction.reply({ content: '❌ Could not find the user or role.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  if (isApprove) {
    try {
      await targetMember.roles.add(roleId, `Role request Reviewed By ${interaction.user.tag}`);
    } catch {
      await interaction.followUp({ content: '❌ Failed to assign the role. Check bot permissions.', ephemeral: true });
      return;
    }
  }

  const oldEmbed = interaction.message.embeds[0];
  if (!oldEmbed) return;

  const updatedEmbed = EmbedBuilder.from(oldEmbed)
    .setColor(isApprove ? 0x57f287 : 0xed4245)
    .spliceFields(2, 1, { name: 'Reviewed By', value: `${interaction.user} | ${member.displayName}`, inline: true })
    .addFields({ name: 'Status', value: isApprove ? 'Approved' : 'Denied' });

  const resultRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('rr_result_disabled')
      .setLabel(`Role Request ${isApprove ? 'Approved' : 'Denied'} By: ${member.displayName}`)
      .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({ embeds: [updatedEmbed], components: [resultRow] });
}
