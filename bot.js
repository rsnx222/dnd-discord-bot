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
  if (interaction.isCommand()) {
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
  }

  // Handle select menu interaction (e.g., for team selection in moveteam)
  else if (interaction.isSelectMenu()) {
    const command = client.commands.get('moveteam'); // Ensure the interaction is for moveteam

    if (command && typeof command.handleSelectMenu === 'function') {
      try {
        await command.handleSelectMenu(interaction);
      } catch (error) {
        logger.error('Error handling select menu interaction:', error);
        await interaction.reply({ content: 'Failed to handle team selection.', ephemeral: true });
      }
    }
  }

  // Handle button interaction (e.g., for directional movement in moveteam)
  else if (interaction.isButton()) {
    const command = client.commands.get('moveteam'); // Ensure the interaction is for moveteam

    if (command && typeof command.handleButton === 'function') {
      try {
        await command.handleButton(interaction);
      } catch (error) {
        logger.error('Error handling button interaction:', error);
        await interaction.reply({ content: 'Failed to handle button interaction.', ephemeral: true });
      }
    }
  }
});

// Login the bot
client.login(settings.DISCORD_TOKEN);
