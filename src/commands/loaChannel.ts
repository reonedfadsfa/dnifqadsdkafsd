import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  TextChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { setGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID } from '../config.js';

export const loaChannelCommand = new SlashCommandBuilder()
  .setName('loachannel')
  .setDescription('Set the channel where LOA request embeds are posted')
  .addChannelOption((opt) =>
    opt
      .setName('channel')
      .setDescription('Channel to post LOA requests in')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function handleLoaChannel(interaction: ChatInputCommandInteraction): Promise<void> {
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

  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  setGuildConfig(interaction.guild.id, { loaChannel: channel.id });
  await interaction.reply({ content: `✅ LOA request channel set to ${channel}.`, ephemeral: true });
}
