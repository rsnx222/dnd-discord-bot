const { Client, GatewayIntentBits, Events } = require('discord.js');
const commandManager = require('./commandManager');  // Manages loading and executing commands
const logger = require('./logger');  // Log management
const settings = require('./settings');  // Settings and configuration
require('dotenv').config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// On client ready
client.once(Events.ClientReady, async () => {
  logger.log('Bot is online!');

  // Clear old commands and register the current ones from the /commands directory
  await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
  await commandManager.registerCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command found for: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
  }
});

// Login the bot
client.login(settings.DISCORD_TOKEN);
