import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { provideTextEmoji } from "../providers/text.js";

const DEFAULT_COLOR = "#EC71A1";

const COLORS = [
  { name: "Pink", value: DEFAULT_COLOR },
  { name: "Cyan", value: "#3AB0C7" },
  { name: "Green", value: "#38BA91" },
  { name: "Gold", value: "#EAA822" },
  { name: "Blurple", value: "#5865F2" },
];

export const textEmojiCommand = new SlashCommandBuilder()
  .setName("text-emoji")
  .setDescription("Create a text emoji")
  .addStringOption((option) =>
    option.setName("text").setDescription("The text to display").setRequired(true).setMaxLength(8),
  )
  .addStringOption((option) =>
    option
      .setName("color")
      .setDescription("The color of the text")
      .setRequired(false)
      .addChoices(...COLORS),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
  .toJSON();

export async function executeTextEmojiCommand(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const guildMember = await interaction.guild.members.fetch(interaction.user.id);
  if (!guildMember.permissions.has(PermissionFlagsBits.CreateGuildExpressions)) {
    await interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  const text = interaction.options.getString("text", true).trim();
  const color = interaction.options.getString("color", false) ?? DEFAULT_COLOR;

  await interaction.deferReply({ ephemeral: true });

  try {
    const buffer = await provideTextEmoji({ text, color });

    const emoji = await guild.emojis.create({
      attachment: buffer,
      name: "emoji",
      reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.editReply(`Emoji created! ${emoji.toString()}`);
  } catch (error) {
    console.error("Failed to create emoji:", error);
    await interaction.editReply(`Error creating emoji: ${error}`);
  }
}
