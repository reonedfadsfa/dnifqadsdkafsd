import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("lottoticket")
    .setDescription("View information about lottery ticket types.")
    .addStringOption(option =>
        option
            .setName("type")
            .setDescription("Choose a lottery ticket type")
            .setRequired(true)
            .addChoices(
                {
                    name: "Lottery Ticket (Up to 25,000)",
                    value: "lottery"
                },
                {
                    name: "Raffle (Up to 250,000)",
                    value: "raffle"
                },
                {
                    name: "Sweepstake (Up to 500,000)",
                    value: "sweepstake"
                }
            )
    );

export async function execute(
    interaction: ChatInputCommandInteraction
) {
    const type = interaction.options.getString("type", true);

    let maxPrize = 0;

    switch (type) {
        case "lottery":
            maxPrize = 25_000;
            break;
        case "raffle":
            maxPrize = 250_000;
            break;
        case "sweepstake":
            maxPrize = 500_000;
            break;
    }

    const embed = new EmbedBuilder()
        .setTitle("🎟️ Lottery Ticket Information")
        .addFields(
            {
                name: "Ticket Type",
                value: type.charAt(0).toUpperCase() + type.slice(1),
                inline: true
            },
            {
                name: "Maximum Prize",
                value: `$${maxPrize.toLocaleString()}`,
                inline: true
            }
        )
        .setTimestamp();

    await interaction.reply({
        embeds: [embed]
    });
}
