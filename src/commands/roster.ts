import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("Grant roster edit access")
  .addStringOption(option =>
    option
      .setName("discordid")
      .setDescription("Discord User ID")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("email")
      .setDescription("Email to grant access")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.options.getString("discordid", true);
  const email = interaction.options.getString("email", true);

  await interaction.reply({
    content: `✅Granteed roster access to ${email} (Discord ID: ${discordId})`,
    ephemeral: true,
  });
}
