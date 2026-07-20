import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { getGuildConfig, allowRoleForRequest, disallowRoleForRequest } from '../storage.js';
import { PRIVILEGED_ROLE_ID } from '../config.js';

export const roleCommand = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Role management commands')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a role to a user')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('The user to give the role to').setRequired(true)
      )
      .addRoleOption((opt) =>
        opt.setName('role').setDescription('The role to assign').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for assigning the role').setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('allow')
      .setDescription('Allow a role to be requested via /rolerequest')
      .addRoleOption((opt) =>
        opt.setName('role').setDescription('The role to allow').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('disallow')
      .setDescription('Disallow a role from being requested via /rolerequest')
      .addRoleOption((opt) =>
        opt.setName('role').setDescription('The role to disallow').setRequired(true)
      )
  );

export async function handleRole(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  const hasPrivilegedRole = member.roles.cache.has(PRIVILEGED_ROLE_ID);

  if (!isAdmin && !hasPrivilegedRole) {
    await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const config = getGuildConfig(interaction.guild.id);
    if (!config.roleChannel) {
      await interaction.reply({
        content: '❌ No role channel has been set. An administrator must use `/rolechannel set` first.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.channelId !== config.roleChannel) {
      await interaction.reply({
        content: `❌ This command can only be used in <#${config.roleChannel}>.`,
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const role = interaction.options.getRole('role', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: '❌ Could not find that user in this server.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      await targetMember.roles.add(role.id, `Assigned by ${interaction.user.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('Role Assigned')
        .setColor(0x57f287)
        .addFields(
          { name: 'User', value: `${targetMember} | ${targetMember.user.tag}`, inline: true },
          { name: 'Role', value: `${role}`, inline: true },
          { name: 'Assigned By', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp()
        .setFooter({ text: 'Role Assignment' });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({
        content: '❌ Failed to assign the role. Make sure the bot has proper permissions and its role is above the target role.',
      });
    }
    return;
  }

  if (sub === 'allow') {
    const role = interaction.options.getRole('role', true);
    allowRoleForRequest(interaction.guild.id, role.id);
    await interaction.reply({ content: `✅ **${role.name}** is now **allowed** for \`/rolerequest\`.`, ephemeral: true });
    return;
  }

  if (sub === 'disallow') {
    const role = interaction.options.getRole('role', true);
    disallowRoleForRequest(interaction.guild.id, role.id);
    await interaction.reply({ content: `✅ **${role.name}** is now **disallowed** from \`/rolerequest\`.`, ephemeral: true });
    return;
  }
}
