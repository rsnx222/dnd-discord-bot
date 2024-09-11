const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const commandManager = require('./commandManager');  // Manages loading and executing commands
const logger = require('./logger');  // Log management
const settings = require('./settings');  // Settings and configuration
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Create a Collection to store commands
client.commands = new Collection();

// Dynamically load all commands from the /commands directory
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// On client ready
client.once(Events.ClientReady, async () => {
  logger.log('Bot is online!');

  // Clear old commands and register the current ones from the /commands directory
  await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
  await commandManager.registerCommands(settings.DISCORD_CLIENT_ID, settings.guildId, client.commands);
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
