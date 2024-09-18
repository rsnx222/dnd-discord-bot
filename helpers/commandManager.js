// commandManager.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Setup REST with the token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Helper function to add a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to register commands and context menus
async function registerCommandsAndContextMenus(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) slash commands and context menus.');

    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      logger(`Preparing to register command(s) from: ${file}`);
      return Array.isArray(command.data) ? command.data.map(cmd => cmd.toJSON()) : [command.data.toJSON()];
    });

    const contextMenuFiles = fs.readdirSync(path.join(__dirname, '../contextMenus')).filter(file => file.endsWith('.js'));
    const contextMenus = contextMenuFiles.map(file => {
      const contextMenu = require(`../contextMenus/${file}`);
      logger(`Preparing to register context menu from: ${file}`);
      return contextMenu.data.toJSON();
    });

    const combined = [...commands, ...contextMenus];
    logger(`Total commands & context menus to register: ${combined.length}`);

    // Register in batches with a timeout and error handling
    const batchSize = 3; // Register 3 commands at a time
    for (let i = 0; i < combined.length; i += batchSize) {
      const batch = combined.slice(i, i + batchSize);
      try {
        logger(`Attempting to register commands batch: ${batch.map(cmd => cmd.name).join(', ')}`);

        const response = await withTimeout(rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), { body: batch }), 10000); // Timeout set to 10 seconds
        logger(`Successfully registered batch: ${batch.map(cmd => cmd.name).join(', ')}`);

        await delay(10000); // Delay between batches to avoid rate-limiting (10 seconds)
      } catch (error) {
        logger(`Error registering commands batch: ${batch.map(cmd => cmd.name).join(', ')}`, error);
        if (error.status === 429) {
          const retryAfter = error.headers ? error.headers['retry-after'] : 10;
          logger(`Rate limited. Retrying after ${retryAfter} seconds.`);
          await delay(retryAfter * 1000);
        } else if (error.message === 'Request timeout') {
          logger(`Timeout occurred while registering batch: ${batch.map(cmd => cmd.name).join(', ')}`);
        } else {
          logger(`Unknown error: ${error.message}`);
        }
      }
    }

    logger('Finished registering all commands and context menus.');
  } catch (error) {
    logger('Error during registration of commands and context menus:', error);
  }
}

// Function to wrap an API call with a timeout
async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms));
  return Promise.race([promise, timeout]);
}

// Function to delete all guild commands
async function deleteAllGuildCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Deleting all guild commands...');
    const commands = await rest.get(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId));
    for (const command of commands) {
      await rest.delete(Routes.applicationGuildCommand(DISCORD_CLIENT_ID, guildId, command.id));
      logger(`Deleted command: ${command.name}`);
    }
  } catch (error) {
    logger('Error deleting all guild commands:', error);
  }
}

// Function to delete all global commands
async function deleteAllGlobalCommands(DISCORD_CLIENT_ID) {
  try {
    logger('Deleting all global commands...');
    const commands = await rest.get(Routes.applicationCommands(DISCORD_CLIENT_ID));
    for (const command of commands) {
      await rest.delete(Routes.applicationCommand(DISCORD_CLIENT_ID, command.id));
      logger(`Deleted global command: ${command.name}`);
    }
  } catch (error) {
    logger('Error deleting global commands:', error);
  }
}

module.exports = {
  registerCommandsAndContextMenus,
  deleteAllGuildCommands,
  deleteAllGlobalCommands,
};
