import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID, RECRUIT_ROLE_1_ID, RECRUIT_ROLE_2_ID } from '../config.js';

export const recruitCommand = new SlashCommandBuilder()
  .setName('recruit')
  .setDescription('Recruit a user by assigning them the recruit roles')
  .addUserOption((opt) =>
    opt.setName('user').setDescription('The user to recruit').setRequired(true)
  );

export async function handleRecruit(interaction) {
  if (!interaction.guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  const member  = await interaction.guild.members.fetch(interaction.user.id);
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isAdmin && !member.roles.cache.has(PRIVILEGED_ROLE_ID)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const targetUser   = interaction.options.getUser('user', true);
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    return interaction.reply({ content: '❌ Could not find that user in this server.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await targetMember.roles.add([RECRUIT_ROLE_1_ID, RECRUIT_ROLE_2_ID], `Recruited by ${interaction.user.tag}`);
  } catch {
    return interaction.editReply({ content: '❌ Failed to assign recruit roles. Check bot permissions and role hierarchy.' });
  }

  const embed = new EmbedBuilder()
    .setTitle('New Recruit')
    .setColor(0x5865f2)
    .setDescription('**Please Add To The Roster**')
    .addFields(
      { name: 'User',      value: `${targetMember} | ${targetMember.user.tag}`, inline: true },
      { name: 'Recruiter', value: `${interaction.user} | ${interaction.user.tag}`, inline: true }
    )
    .setThumbnail(targetMember.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'Recruitment' });

  await interaction.editReply({ content: `✅ Successfully recruited ${targetMember}.` });

  const config = getGuildConfig(interaction.guild.id);
  if (config.recruitLogChannel) {
    const logChannel = interaction.guild.channels.cache.get(config.recruitLogChannel);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    } else {
      await interaction.followUp({ content: '⚠️ Recruit log channel not found. Use `/recruitlog` to set a valid channel.', ephemeral: true });
    }
  } else {
    await interaction.followUp({ content: '⚠️ No recruit log channel set. Use `/recruitlog` to configure one.', ephemeral: true });
  }
}
