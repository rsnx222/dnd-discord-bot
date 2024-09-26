// bot.js

require('dotenv').config();

const { Client, GatewayIntentBits, Events, Collection, ActivityType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const commandManager = require('./helpers/commandManager');
const { logger } = require('./helpers/logger');
const { handleDirectionMove } = require('./helpers/movementLogic');
const { handleForfeitEvent, handleCompleteEvent } = require('./helpers/eventActionHandler');
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
    const [action, directionOrType, teamName] = interaction.customId.split('_');

    // Check for direction buttons from /move_team command
    if (['north', 'south', 'west', 'east'].includes(action)) {
      const moveTeamCommand = require('./commands/move_team');
      return await moveTeamCommand.handleButton(interaction);
    }

    // Handle 'choose_direction' button interaction
    if (action === `choose_direction_${teamName}`) {
      return await interaction.reply({ content: 'Choose a direction to move:', ephemeral: true });
    }

    if (action === 'use_transport') {
      return await interaction.reply({ content: 'You have used the transport link.', ephemeral: true });
    }

    if (['approve', 'reject'].includes(action)) {
      const approveButton = new ButtonBuilder()
        .setCustomId(`confirmApprove_${teamName}_${directionOrType}`)
        .setLabel('Confirm Approve')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`confirmReject_${teamName}_${directionOrType}`)
        .setLabel('Confirm Reject')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(approveButton, rejectButton);

      return await interaction.reply({
        content: 'Please confirm your action.',
        components: [row],
        ephemeral: true
      });
    }

    if (['confirmApprove', 'confirmReject'].includes(action)) {
      const handler = action === 'confirmApprove' ? handleForfeitEvent : handleCompleteEvent;
      await handler(interaction, teamName, directionOrType);
      return await interaction.reply({ content: `${action === 'confirmApprove' ? 'Approved' : 'Rejected'} successfully.`, ephemeral: true });
    }

    if (['north', 'south', 'west', 'east'].includes(directionOrType)) {
      return await handleDirectionMove(interaction, teamName, directionOrType);
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
  const command = customId.startsWith('reset_team_modal_') ? client.commands.get('reset_team') : client.commands.get('move_team_by_coord');
  if (command && typeof command.handleModal === 'function') {
    try {
      await command.handleModal(interaction);
    } catch (error) {
      logger('Error handling modal interaction:', error);
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
