import type { ChatInputCommandInteraction, Guild, PermissionResolvable } from "discord.js";

export async function requireGuildPermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable,
): Promise<Guild | null> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return null;
  }

  const guildMember = await guild.members.fetch(interaction.user.id);
  if (!guildMember.permissions.has(permission)) {
    await interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
    return null;
  }

  return guild;
}
