import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID } from '../config.js';

export const roleChannelCommand = new SlashCommandBuilder()
  .setName('rolechannel')
  .setDescription('Manage the role assignment channel')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Set the channel where /role add can be used')
      .addChannelOption((opt) =>
        opt.setName('channel').setDescription('The channel to use for role assignments')
          .addChannelTypes(ChannelType.GuildText).setRequired(true)
      )
  );

export async function handleRoleChannel(interaction) {
  if (!interaction.guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  const member  = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isAdmin && !member.roles.cache.has(PRIVILEGED_ROLE_ID)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  if (interaction.options.getSubcommand() === 'set') {
    const channel = interaction.options.getChannel('channel', true);
    setGuildConfig(interaction.guild.id, { roleChannel: channel.id });
    await interaction.reply({ content: `✅ Role channel set to ${channel}.`, ephemeral: true });
  }
}
