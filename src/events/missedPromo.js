import { ChannelType, EmbedBuilder } from 'discord.js';
import { MISSED_PROMO_CATEGORY_ID, MISSED_PROMO_DELAY_MS } from '../config.js';

export async function handleChannelCreate(channel) {
  if (channel.type !== ChannelType.GuildText) return;
  if (channel.parentId !== MISSED_PROMO_CATEGORY_ID) return;

  await new Promise((resolve) => setTimeout(resolve, MISSED_PROMO_DELAY_MS));

  const embed = new EmbedBuilder()
    .setTitle('Missed Promotion')
    .setColor(0x5865f2)
    .addFields(
      { name: '1. What Is Your Current Rank?',                          value: '*Please type your answer below.*' },
      { name: '2. Are You CGM?',                                        value: '*Please type your answer below.*' },
      { name: '3. Did You Miss A Single, Double Or Triple?',            value: '*Please type your answer below.*' },
      { name: '4. Please Send Any Proof To Speed Things Up!',           value: '*Please attach a screenshot or paste a link below.*' }
    )
    .setTimestamp()
    .setFooter({ text: 'Missed Promotion Request' });

  await channel.send({ embeds: [embed] }).catch((err) => {
    console.error(`Failed to send missed promo embed in #${channel.name}:`, err);
  });
}
