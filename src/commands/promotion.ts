import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  TextChannel,
} from 'discord.js';

export const PROMOTION_CATEGORY_ID = '1525748687697875006';

export const promotionCommand = new SlashCommandBuilder()
  .setName('promotion')
  .setDescription('Submit a promotion request to the leadership panel')
  .addStringOption((opt) =>
    opt
      .setName('rank')
      .setDescription('What rank are you requesting to be promoted to?')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('proof')
      .setDescription('Proof of your promotion (image URL, link, or description)')
      .setRequired(true)
  );

export async function handlePromotion(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const rank = interaction.options.getString('rank', true);
  const proof = interaction.options.getString('proof', true);
  const submitterMember = await interaction.guild.members.fetch(interaction.user.id);

  await interaction.deferReply({ ephemeral: true });

  // Fetch all channels in the target category
  await interaction.guild.channels.fetch();
  const categoryChannels = interaction.guild.channels.cache.filter(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      (ch as TextChannel).parentId === PROMOTION_CATEGORY_ID
  ) as Map<string, TextChannel>;

  if (categoryChannels.size === 0) {
    await interaction.editReply({
      content: '❌ No text channels found in the promotion category. Please contact an administrator.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Promotion Request')
    .setColor(0xf1c40f)
    .addFields(
      {
        name: 'Member',
        value: `${submitterMember} | ${submitterMember.displayName}`,
        inline: true,
      },
      {
        name: 'Current Roles',
        value: submitterMember.roles.cache
          .filter((r) => r.id !== interaction.guild!.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString())
          .slice(0, 5)
          .join(', ') || 'None',
        inline: true,
      },
      {
        name: 'What Rank Should You Be Promoted To?',
        value: rank,
      },
      {
        name: 'Send any Proof About Your Promotion',
        value: proof,
      }
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'Promotion Request' });

  let sent = 0;
  const errors: string[] = [];

  for (const [, channel] of categoryChannels) {
    try {
      await channel.send({ embeds: [embed] });
      sent++;
    } catch {
      errors.push(channel.name);
    }
  }

  if (sent === 0) {
    await interaction.editReply({
      content: '❌ Failed to send your promotion request to any channels. Please contact an administrator.',
    });
    return;
  }

  const errorNote = errors.length > 0 ? `\n⚠️ Could not post to: ${errors.join(', ')}` : '';
  await interaction.editReply({
    content: `✅ Your promotion request has been submitted to **${sent}** channel${sent === 1 ? '' : 's'} in the leadership panel.${errorNote}`,
  });
}
