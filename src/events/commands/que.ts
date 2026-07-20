import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  TextChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { setGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID } from '../config.js';

export const queCommand = new SlashCommandBuilder()
  .setName('que')
  .setDescription('Queue channel management')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Set the channel where role request embeds are posted')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Channel to post role requests in')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  );

export async function handleQue(interaction: ChatInputCommandInteraction): Promise<void> {
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
  if (sub === 'set') {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    setGuildConfig(interaction.guild.id, { roleRequestChannel: channel.id });
    await interaction.reply({ content: `✅ Role request queue channel set to ${channel}.`, ephemeral: true });
  }
}
