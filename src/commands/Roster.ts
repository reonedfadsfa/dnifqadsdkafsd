import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

import { google } from "googleapis";

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
      .setDescription("Google email")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.options.getString("discordid", true);
  const email = interaction.options.getString("email", true);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({
    version: "v3",
    auth,
  });

  await drive.permissions.create({
    fileId: process.env.SHEET_ID!,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: email,
    },
    sendNotificationEmail: true,
  });

  await interaction.reply({
    content: `✅ Granted edit access to ${email} for Discord ID ${discordId}`,
    ephemeral: true,
  });
}
