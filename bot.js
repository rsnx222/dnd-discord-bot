// bot.js

require('dotenv').config();

const { Client, GatewayIntentBits, Events, Collection, ActivityType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const commandManager = require('./helpers/commandManager');
const { logger } = require('./helpers/logger');
const { handleDirectionMove } = require('./helpers/movementLogic');
const { handleForfeitEvent, handleCompleteEvent, handleModalSubmit } = require('./helpers/eventActionHandler');
const { createDirectionButtons } = require('./helpers/sendMapAndEvent');
const fs = require('fs');
const path = require('path');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands and context menus
client.commands = new Collection();
client.contextMenus = new Collection();

// Load all commands from the /commands directory
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (Array.isArray(command.data)) {
    command.data.forEach(cmd => client.commands.set(cmd.name, command));
  } else {
    client.commands.set(command.data.name, command);
  }
}

// Load all context menus from the /contextMenus directory
const contextMenuFiles = fs.readdirSync(path.join(__dirname, 'contextMenus')).filter(file => file.endsWith('.js'));
for (const file of contextMenuFiles) {
  const contextMenu = require(`./contextMenus/${file}`);
  client.contextMenus.set(contextMenu.data.name, contextMenu);
}

// Randomized bot activities
const activities = [
  { type: ActivityType.Playing, message: "with code" },
  { type: ActivityType.Playing, message: "along with a dangerous dungeon crawl" },
  { type: ActivityType.Playing, message: "with fire and ancient secrets" },
  { type: ActivityType.Watching, message: "adventurers brave the wilds" },
  { type: ActivityType.Listening, message: "to whispers of ancient lore" },
  { type: ActivityType.Watching, message: "shadows creeping in the dungeon" },
  { type: ActivityType.Watching, message: "heroes solve riddles to unlock mysteries" },
  { type: ActivityType.Listening, message: "to tales of battles and lost treasures" }
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
  setInterval(setRandomActivity, 1800000); // Update activity every 30 minutes

  try {
    logger('Deleting all guild and global commands...');
    await commandManager.deleteAllGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID);
    await commandManager.deleteAllGlobalCommands(process.env.CLIENT_ID);

    logger('Registering commands and context menus...');
    await commandManager.registerCommandsAndContextMenus(process.env.CLIENT_ID, process.env.GUILD_ID);

    logger('Bot setup completed successfully.');
  } catch (error) {
    logger('Error during command registration:', error);
  }
});

// Log rate limits
client.rest.on('rateLimited', (info) => {
  logger(`Rate limited: Timeout - ${info.timeout}ms, Path - ${info.path}, Method - ${info.method}`);
});

// Handle button interactions
async function handleButtonInteraction(interaction) {
  try {
    const [action, type, teamName] = interaction.customId.split('_');

    // Check for direction buttons from /move_team command
    if (['north', 'south', 'west', 'east'].includes(action)) {
      const moveTeamCommand = require('./commands/move_team');
      return await moveTeamCommand.handleButton(interaction);
    }

    // Handle quest-related buttons
    if (action === 'start' && type === 'quest') {
      return await interaction.update({ content: 'Starting quest! Complete the task to proceed.', components: [] });
    }
    if (action === 'ignore' && type === 'quest') {
      const directionButtons = createDirectionButtons(teamName);
      return await interaction.update({ content: 'You ignored the quest. Choose a direction to move:', components: [directionButtons] });
    }

    // Handle transport-related buttons
    if (action === 'use' && type === 'transport') {
      return await interaction.update({ content: 'You have used the transport link. Moving to the destination...', components: [] });
    }
    if (action === 'ignore' && type === 'transport') {
      const directionButtons = createDirectionButtons(teamName);
      return await interaction.update({ content: 'You ignored the transport link. Choose a direction to move:', components: [directionButtons] });
    }

    // Handle approval buttons
    if (['approve', 'reject'].includes(action)) {
      const approveButton = new ButtonBuilder()
        .setCustomId(`confirmApprove_${teamName}_${type}`)
        .setLabel('Confirm Approve')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`confirmReject_${teamName}_${type}`)
        .setLabel('Confirm Reject')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(approveButton, rejectButton);

      return await interaction.reply({
        content: 'Please confirm your action.',
        components: [row],
        ephemeral: true
      });
    }

    // Handle approval confirmation
    if (['confirmApprove', 'confirmReject'].includes(action)) {
      const handler = action === 'confirmApprove' ? handleCompleteEvent : handleForfeitEvent;
      await handler(interaction, teamName, type);
      return await interaction.reply({ content: `${action === 'confirmApprove' ? 'Approved' : 'Rejected'} successfully.`, ephemeral: true });
    }

    // Handle direction movement for buttons
    if (['north', 'south', 'west', 'east'].includes(type)) {
      return await handleDirectionMove(interaction, teamName, type);
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
  try {
    if (
      customId.startsWith('forfeit_event_modal_') ||
      customId.startsWith('complete_event_modal_') ||
      customId.startsWith('submit_puzzle_modal_')
    ) {
      await handleModalSubmit(interaction);
    } else if (customId.startsWith('reset_team_modal_')) {
      const command = client.commands.get('reset_team');
      if (command && typeof command.handleModal === 'function') {
        await command.handleModal(interaction);
      } else {
        logger('No handler for modal interaction:', customId);
        await interaction.reply({ content: 'Failed to handle modal interaction.', ephemeral: true });
      }
    } else if (customId.startsWith('move_team_by_coord_')) {  // Add handling for move_team_by_coord
      const command = client.commands.get('move_team_by_coord');
      if (command && typeof command.handleModal === 'function') {
        await command.handleModal(interaction);
      } else {
        logger('No handler for modal interaction:', customId);
        await interaction.reply({ content: 'Failed to handle modal interaction.', ephemeral: true });
      }
    } else {
      logger('Unhandled modal interaction:', customId);
      await interaction.reply({ content: 'Unhandled modal interaction.', ephemeral: true });
    }
  } catch (error) {
    logger('Error handling modal interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Failed to handle modal interaction.', ephemeral: true });
    }
  }
}


// Handle command interactions
async function handleCommandInteraction(interaction) {
  const command = client.commands.get(interaction.commandName) || client.contextMenus.get(interaction.commandName);
  if (!command) {
    logger(`No command or context menu found for: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger(`Error executing command or context menu: ${interaction.commandName}`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error executing this action!', ephemeral: true });
    }
  }
}

// Main interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isCommand()) return await handleCommandInteraction(interaction);
    if (interaction.isMessageContextMenuCommand()) return await handleCommandInteraction(interaction);
    if (interaction.isButton()) return await handleButtonInteraction(interaction);
    if (interaction.isModalSubmit()) return await handleModalInteraction(interaction);

    logger('Unhandled interaction type received.');
  } catch (error) {
    logger('Error in interaction handling:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'An error occurred while handling your request.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => logger('Failed to login the bot:', error));

module.exports = { client };
