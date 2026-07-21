import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { getGuildConfig } from '../storage.js';
import { PRIVILEGED_ROLE_ID, RECRUIT_ROLE_1_ID, RECRUIT_ROLE_2_ID } from '../config.js';

export const recruitCommand = new SlashCommandBuilder()
  .setName('recruit')
  .setDescription('Recruit a user by assigning them the recruit roles')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('The user to recruit')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('name')
      .setDescription('The recruit name')
      .setRequired(true)
  );

export async function handleRecruit(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  const hasPrivilegedRole = member.roles.cache.has(PRIVILEGED_ROLE_ID);

  if (!isAdmin && !hasPrivilegedRole) {
    await interaction.reply({
      content: '❌ You do not have permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const recruitName = interaction.options.getString('name', true);

  const targetMember = await interaction.guild.members
    .fetch(targetUser.id)
    .catch(() => null);

  if (!targetMember) {
    await interaction.reply({
      content: '❌ Could not find that user in this server.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await targetMember.roles.add(
      [RECRUIT_ROLE_1_ID, RECRUIT_ROLE_2_ID],
      `Recruited by ${interaction.user.tag}`
    );
  } catch {
    await interaction.editReply({
      content:
        '❌ Failed to assign recruit roles. Make sure the bot has proper permissions.',
    });
    return;
  }

  const recruitEmbed = new EmbedBuilder()
    .setTitle('New Recruit')
    .setColor(0x5865f2)
    .addFields(
      {
        name: 'Recruit',
        value: `${targetMember}\n**LSM | ${recruitName}**`,
        inline: true,
      },
      {
        name: 'Recruiter',
        value: `${interaction.user}\n${interaction.user.tag}`,
        inline: true,
      }
    )
    .setDescription('**Please Add To The Roster**')
    .setThumbnail(targetMember.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({
      text: 'Recruitment',
    });

  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`recruit_complete_${targetMember.id}`)
      .setLabel('✅ Completed')
      .setStyle(ButtonStyle.Success)
  );

  await interaction.editReply({
    content: `✅ Successfully recruited ${targetMember}.`,
  });

  const config = getGuildConfig(interaction.guild.id);

  if (config.recruitLogChannel) {
    const logChannel = interaction.guild.channels.cache.get(
      config.recruitLogChannel
    ) as TextChannel | undefined;

    if (logChannel) {
      await logChannel.send({
        embeds: [recruitEmbed],
        components: [button],
      });
    }
  }
}
