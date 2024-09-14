// bot.js

const { Client, GatewayIntentBits, Events, Collection, ActivityType } = require('discord.js');  // Import ActivityType
const commandManager = require('./helpers/commandManager');  // Manages loading and executing commands
const logger = require('./helpers/logger');  // Log management
const settings = require('./config/settings');  // Settings and configuration
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
  
  // If the command exports multiple commands, iterate over them
  if (Array.isArray(command.data)) {
    command.data.forEach(cmd => {
      client.commands.set(cmd.name, command);
    });
  } else {
    client.commands.set(command.data.name, command);
  }
}

// Randomised bot activities
const activities = [
  { type: ActivityType.Playing, message: "Exploring dungeons..." },
  { type: ActivityType.Playing, message: "Defeating bosses..." },
  { type: ActivityType.Playing, message: "Completing quests in Gielinor..." },
  { type: ActivityType.Playing, message: "Battling the goblin king..." },
  { type: ActivityType.Playing, message: "Transporting between worlds..." },
  { type: ActivityType.Watching, message: "over adventurers" },
  { type: ActivityType.Listening, message: "the whispers of ancient lore..." },
  { type: ActivityType.Playing, message: "Rolling dice for fate..." },
  { type: ActivityType.Watching, message: "the shadows in the dungeon..." },
];

// Function to set a random activity
function setRandomActivity() {
  const randomActivity = activities[Math.floor(Math.random() * activities.length)];
  client.user.setActivity(randomActivity.message, { type: randomActivity.type });
}

// On client ready
client.once(Events.ClientReady, async () => {
  logger.log('Bot is online!');

  // Set activity randomly every 30 mins
  setRandomActivity();
  setInterval(setRandomActivity, 1800000);

  // Clear old commands and register the current ones from the /commands directory
  await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
  await commandManager.deleteAllGlobalCommands(settings.DISCORD_CLIENT_ID);
  await commandManager.registerCommands(settings.DISCORD_CLIENT_ID, settings.guildId);

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

  // Handle select menu interaction (for team selection in moveteam or resetposition)
  else if (interaction.isStringSelectMenu()) {
    const command = client.commands.get('moveteam') || client.commands.get('resetpositions'); // Use resetpositions for both resetposition and resetallpositions

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
    const command = client.commands.get('moveteam') || client.commands.get('moveteamcoord');

    if (command && typeof command.handleButton === 'function') {
      try {
        await command.handleButton(interaction);
      } catch (error) {
        logger.error('Error handling button interaction:', error);
        await interaction.reply({ content: 'Failed to handle button interaction.', ephemeral: true });
      }
    }
  }
    
  // Handle modal interaction (for moveteamcoord command or resetpositions)
  else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('reset_team_modal_') || interaction.customId === 'reset_all_teams_modal') {
      const command = client.commands.get('resetpositions');  // Use resetpositions to handle reset modals
      if (command && typeof command.handleModal === 'function') {
        try {
          await command.handleModal(interaction);
        } catch (error) {
          logger.error('Error handling reset modal interaction:', error);
          await interaction.reply({ content: 'Failed to handle the reset modal.', ephemeral: true });
        }
      }
    } else if (interaction.customId.startsWith('moveteamcoord_')) {
      const command = client.commands.get('moveteamcoord');  // Use moveteamcoord for its own modal
      if (command && typeof command.handleModal === 'function') {
        try {
          await command.handleModal(interaction);
        } catch (error) {
          logger.error('Error handling moveteamcoord modal interaction:', error);
          await interaction.reply({ content: 'Failed to handle the moveteamcoord modal.', ephemeral: true });
        }
      }
    }
  }
});

// Login the bot
client.login(settings.DISCORD_TOKEN);
