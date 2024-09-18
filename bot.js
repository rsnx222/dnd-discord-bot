// bot.js
const { Client, GatewayIntentBits, Events, Collection, ActivityType } = require('discord.js');
const commandManager = require('./helpers/commandManager');
const { logger } = require('./helpers/logger');
const settings = require('./config/settings');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { handleDirectionMove } = require('./helpers/movementLogic');
const { handleForfeitEvent, handleCompleteEvent } = require('./helpers/eventActionHandler');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Ensure necessary environment variables are available
if (!process.env.DISCORD_TOKEN || !settings.DISCORD_CLIENT_ID || !settings.guildId) {
  logger('Missing environment variables.');
  process.exit(1);
}

// Create a Collection to store commands and context menus
client.commands = new Collection();
client.contextMenus = new Collection();

// Dynamically load all slash commands from the /commands directory
const loadFiles = (directory) => fs.readdirSync(path.join(__dirname, directory)).filter(file => file.endsWith('.js'));

for (const file of loadFiles('commands')) {
  const command = require(`./commands/${file}`);
  if (Array.isArray(command.data)) {
    command.data.forEach(cmd => client.commands.set(cmd.name, command));
  } else {
    client.commands.set(command.data.name, command);
  }
}

// Dynamically load all context menu commands from the /contextMenus directory
for (const file of loadFiles('contextMenus')) {
  const contextMenu = require(`./contextMenus/${file}`);
  client.contextMenus.set(contextMenu.data.name, contextMenu);
}

// Randomized bot activities
const activities = [
  { type: ActivityType.Playing, message: "an epic battle against bosses" },
  { type: ActivityType.Playing, message: "a dangerous dungeon crawl" },
  { type: ActivityType.Playing, message: "quests to unlock ancient secrets" },
  { type: ActivityType.Watching, message: "adventurers brave the wilds" },
  { type: ActivityType.Listening, message: "the whispers of ancient lore" },
  { type: ActivityType.Watching, message: "shadows creeping in the dungeon" },
  { type: ActivityType.Watching, message: "heroes solve riddles to unlock mysteries" },
  { type: ActivityType.Listening, message: "tales of battles and lost treasures" }
];

// Function to set a random activity
function setRandomActivity() {
  const randomActivity = activities[Math.floor(Math.random() * activities.length)];
  client.user.setActivity(randomActivity.message, { type: randomActivity.type });
}

// On client ready
client.once(Events.ClientReady, async () => {
  logger('Bot is online!');

  setRandomActivity();
  setInterval(setRandomActivity, 1800000);

  try {
    logger('Deleting all guild and global commands...');
    await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
    await commandManager.deleteAllGlobalCommands(settings.DISCORD_CLIENT_ID);

    logger('Registering commands and context menus...');
    await commandManager.registerCommandsAndContextMenusWithThrottling(settings.DISCORD_CLIENT_ID, settings.guildId);

    logger('Bot setup completed successfully.');
  } catch (error) {
    logger('Error during command registration:', error);
  }
});

// Log rate limits
client.rest.on('rateLimited', (info) => {
  logger(`Rate limited: Timeout - ${info.timeout}ms, Path - ${info.path}, Method - ${info.method}`);
});

// Handle command interactions
async function handleCommandInteraction(interaction) {
  const command = client.commands.get(interaction.commandName) || client.contextMenus.get(interaction.commandName);
  if (!command) return logger(`No command or context menu found for: ${interaction.commandName}`);
  try {
    await command.execute(interaction);
  } catch (error) {
    logger(`Error executing command or context menu: ${interaction.commandName}`, error);
    await interaction.reply({ content: 'There was an error executing this action!', ephemeral: true });
  }
}

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction) {
  const command = client.commands.get('moveteam') || client.commands.get('resetteam');
  if (command && typeof command.handleSelectMenu === 'function') {
    try {
      await command.handleSelectMenu(interaction);
    } catch (error) {
      logger('Error handling select menu interaction:', error);
      await interaction.reply({ content: 'Failed to handle team selection.', ephemeral: true });
    }
  }
}

// Handle button interactions
async function handleButtonInteraction(interaction) {
  try {
    const [action, directionOrType, teamName] = interaction.customId.split('_');
    if (['north', 'south', 'west', 'east'].includes(directionOrType)) {
      return await handleDirectionMove(interaction, teamName, directionOrType);
    }
    if (action === 'forfeit') {
      return await handleForfeitEvent(interaction, teamName, directionOrType);
    }
    if (action === 'complete') {
      return await handleCompleteEvent(interaction, teamName, directionOrType);
    }
    const command = client.commands.get('moveteam') || client.commands.get('moveteamcoord');
    if (command && typeof command.handleButton === 'function') {
      return await command.handleButton(interaction);
    }
    logger(`No command found for button interaction: ${interaction.customId}`);
    await interaction.reply({ content: 'Invalid button interaction.', ephemeral: true });
  } catch (error) {
    logger('Error handling button interaction:', error);
    await interaction.reply({ content: 'Failed to handle button interaction.', ephemeral: true });
  }
}

// Handle modal interactions
async function handleModalInteraction(interaction) {
  const { customId } = interaction;
  const command = customId.startsWith('reset_team_modal_') ? client.commands.get('resetteam') : client.commands.get('moveteamcoord');
  if (command && typeof command.handleModal === 'function') {
    try {
      await command.handleModal(interaction);
    } catch (error) {
      logger('Error handling modal interaction:', error);
      await interaction.reply({ content: 'Failed to handle modal interaction.', ephemeral: true });
    }
  }
}

// Main interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isCommand()) return await handleCommandInteraction(interaction);
    if (interaction.isMessageContextMenuCommand()) return await handleCommandInteraction(interaction);
    if (interaction.isStringSelectMenu()) return await handleCommandInteraction(interaction);
    if (interaction.isButton()) return await handleButtonInteraction(interaction);
    if (interaction.isModalSubmit()) return await handleModalInteraction(interaction);
  } catch (error) {
    logger('Error in interaction handling:', error);
    await interaction.reply({ content: 'An error occurred while handling your request.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => logger('Failed to login the bot:', error));
