import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { provideMinecraftSkinEmoji } from "../providers/minecraft-skin.js";
import { requireGuildPermission } from "../utils/command-helpers.js";

export const mcskin2emojiCommand = new SlashCommandBuilder()
  .setName("mcskin2emoji")
  .setDescription("Create an emoji from a Minecraft skin")
  .addStringOption((option) => option.setName("mcid").setDescription("The Minecraft ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
  .toJSON();

export async function executeMCSkin2EmojiCommand(interaction: ChatInputCommandInteraction) {
  const guild = await requireGuildPermission(interaction, PermissionFlagsBits.CreateGuildExpressions);
  if (!guild) {
    return;
  }

  const mcid = interaction.options.getString("mcid", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const buffer = await provideMinecraftSkinEmoji({ username: mcid });

    const emoji = await guild.emojis.create({
      attachment: buffer,
      name: `${mcid}`,
      reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.editReply(`Emoji created! ${emoji.toString()}`);
  } catch (error) {
    await interaction.editReply(`Error creating emoji: ${error}`);
  }
}
