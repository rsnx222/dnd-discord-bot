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
if (!process.env.DISCORD_TOKEN) {
  logger('DISCORD_TOKEN is missing from environment variables.');
  process.exit(1);
}
if (!settings.DISCORD_CLIENT_ID || !settings.guildId) {
  logger('DISCORD_CLIENT_ID or guildId is missing from settings.');
  process.exit(1);
}

// Create a Collection to store commands and context menus
client.commands = new Collection();
client.contextMenus = new Collection();

// Dynamically load all slash commands from the /commands directory
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (Array.isArray(command.data)) {
    command.data.forEach(cmd => client.commands.set(cmd.name, command));
  } else {
    client.commands.set(command.data.name, command);
  }
}

// Dynamically load all context menu commands from the /contextMenus directory
const contextMenuFiles = fs.readdirSync(path.join(__dirname, 'contextMenus')).filter(file => file.endsWith('.js'));
for (const file of contextMenuFiles) {
  const contextMenu = require(`./contextMenus/${file}`);
  client.contextMenus.set(contextMenu.data.name, contextMenu);
}

// Randomized bot activities
const activities = [
  { type: ActivityType.Playing, message: "an epic battle against bosses" },
  { type: ActivityType.Playing, message: "a dangerous dungeon crawl" },
  { type: ActivityType.Playing, message: "quests to unlock ancient secrets" },
  { type: ActivityType.Playing, message: "a fierce duel with the goblin king" },
  { type: ActivityType.Playing, message: "a game of fate with dice rolls" },
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

  // Set activity randomly every 30 mins
  setRandomActivity();
  setInterval(setRandomActivity, 1800000);

  // Clear and register commands
  try {
    await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
    await commandManager.deleteAllGlobalCommands(settings.DISCORD_CLIENT_ID);
    await commandManager.registerCommandsAndContextMenus(settings.DISCORD_CLIENT_ID, settings.guildId);

    logger('Commands and context menus registered successfully.');
  } catch (error) {
    logger('Error during command registration:', error);
  }
});


// Handle command interactions
async function handleCommandInteraction(interaction) {
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger(`No command found for: ${interaction.commandName}`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    logger(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
  }
}

async function handleContextMenuInteraction(interaction) {
  const contextMenuName = interaction.commandName;

  logger(`Received context menu interaction: ${contextMenuName}`);
  
  // Check if the context menu is registered
  const contextMenu = client.contextMenus.get(contextMenuName);

  if (!contextMenu) {
    // Log all registered context menus
    logger(`Available context menus: ${[...client.contextMenus.keys()].join(', ')}`);
    logger(`No context menu found for: ${contextMenuName}`);
    await interaction.reply({ content: 'No matching context menu found.', ephemeral: true });
    return;
  }

  try {
    logger(`Executing context menu: ${contextMenuName}`);
    await contextMenu.execute(interaction);  // Execute the context menu handler
  } catch (error) {
    logger(`Error executing context menu ${contextMenuName}:`, error);
    await interaction.reply({ content: 'There was an error processing this action!', ephemeral: true });
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
    const customIdParts = interaction.customId.split('_');
    const action = customIdParts[0];
    const directionOrType = customIdParts[1];
    const teamName = customIdParts.pop();

    logger(`Handling button interaction: ${interaction.customId}`);
    logger(`Action: ${action}, Direction/Event Type: ${directionOrType}, Team: ${teamName}`);

    if (['north', 'south', 'west', 'east'].includes(directionOrType)) {
      await handleDirectionMove(interaction, teamName, directionOrType);
    } else if (action === 'forfeit') {
      await handleForfeitEvent(interaction, teamName, directionOrType);
    } else if (action === 'complete') {
      await handleCompleteEvent(interaction, teamName, directionOrType);
    } else {
      const command = client.commands.get('moveteam') || client.commands.get('moveteamcoord');
      if (command && typeof command.handleButton === 'function') {
        await command.handleButton(interaction);
      } else {
        logger(`No command found for button interaction: ${interaction.customId}`);
        await interaction.reply({ content: 'Invalid button interaction.', ephemeral: true });
      }
    }
  } catch (error) {
    logger('Error handling button interaction:', error);
    await interaction.reply({ content: 'Failed to handle button interaction.', ephemeral: true });
  }
}

// Handle modal interactions
async function handleModalInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('reset_team_modal_')) {
    const command = client.commands.get('resetteam');
    if (command && typeof command.handleModal === 'function') {
      try {
        await command.handleModal(interaction);
      } catch (error) {
        logger('Error handling reset modal interaction:', error);
        await interaction.reply({ content: 'Failed to handle the reset modal.', ephemeral: true });
      }
    }
  } else if (customId.startsWith('moveteamcoord_')) {
    const command = client.commands.get('moveteamcoord');
    if (command && typeof command.handleModal === 'function') {
      try {
        await command.handleModal(interaction);
      } catch (error) {
        logger('Error handling moveteamcoord modal interaction:', error);
        await interaction.reply({ content: 'Failed to handle the moveteamcoord modal.', ephemeral: true });
      }
    }
  }
}

// Main interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isCommand()) {
      await handleCommandInteraction(interaction);
    } else if (interaction.isContextMenuCommand()) {
      await handleContextMenuInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
    }
  } catch (error) {
    logger('Error in interaction handling:', error);
    await interaction.reply({ content: 'An error occurred while handling your request.', ephemeral: true });
  }
});

// Login the bot
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  logger('Failed to login the bot:', error);
});
