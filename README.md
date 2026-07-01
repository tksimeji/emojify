# Emojify

Emojify is a Discord bot that helps you create custom emojis from
text and Minecraft skins.

It provides simple slash commands for generating emoji images and adding them to
your Discord server.

[**Invite Emojify to your server**](https://discord.com/oauth2/authorize?client_id=1521460765100343397)

## Commands

### `/text2emoji`

![Text emoji preview](docs/images/text2emoji.png)

Create a custom emoji from text.

You can choose the text and color, then Emojify generates an emoji image and
adds it to the server.

### `/mcskin2emoji`

![Minecraft skin emoji preview](docs/images/mcskin2emoji.png)

Create a custom emoji from a Minecraft skin.

Enter a Minecraft username, and Emojify generates an emoji based on the player's skin.

## Required Permissions

Emojify needs the following permissions to work correctly:

- Create Expressions
- Send Messages

Users who run emoji creation commands also need permission to create guild expressions.

## Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file.

```env
BOT_TOKEN=discord_bot_token
```

### 3. Start the bot

```bash
pnpm dev
```

## License

MIT
