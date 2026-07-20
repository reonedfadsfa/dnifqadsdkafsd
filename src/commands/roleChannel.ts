import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
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
        opt
          .setName('channel')
          .setDescription('The channel to use for role assignments')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  );

export async function handleRoleChannel(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
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
  if (sub === 'set') {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    setGuildConfig(interaction.guild.id, { roleChannel: channel.id });
    await interaction.reply({ content: `✅ Role channel has been set to ${channel}.`, ephemeral: true });
  }
}
