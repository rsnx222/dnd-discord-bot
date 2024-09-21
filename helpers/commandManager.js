// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Setup REST with the token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Helper function to add a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function registerCommandsAndContextMenus(CLIENT_ID, GUILD_ID) {
  console.log('CLIENT_ID:', CLIENT_ID);  // Debugging log
  console.log('GUILD_ID:', GUILD_ID);    // Debugging log

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

    // Register all commands in batches
    await registerBatch(combined, CLIENT_ID, GUILD_ID);
    logger('Finished registering all commands and context menus.');
  } catch (error) {
    logger('Error during registration of commands and context menus:', error);
  }
}

// Register all commands in batches
async function registerBatch(commands, CLIENT_ID, GUILD_ID, retries = 4, delayFactor = 2000, batchSize = 5) {
  try {
    // Split commands into batches
    const batches = [];
    for (let i = 0; i < commands.length; i += batchSize) {
      batches.push(commands.slice(i, i + batchSize));
    }

    // Process each batch sequentially
    for (const batch of batches) {
      logger(`Registering a batch of ${batch.length} commands...`);
      
      // Try to register the current batch
      const response = await withTimeout(
        rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: batch }),
        60000  // Increased timeout to 60 seconds
      );
      
      logger(`Successfully registered a batch of ${batch.length} commands.`);
      
      // Log rate limit headers
      if (response?.headers) {
        const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
        const rateLimitReset = response.headers['x-ratelimit-reset'];
        const rateLimitLimit = response.headers['x-ratelimit-limit'];

        if (rateLimitRemaining || rateLimitReset || rateLimitLimit) {
          logger(`Rate Limit - Remaining: ${rateLimitRemaining}, Limit: ${rateLimitLimit}, Reset: ${new Date(rateLimitReset * 1000).toISOString()}`);
        }

        if (rateLimitRemaining === '0') {
          const resetInMs = (rateLimitReset * 1000) - Date.now();
          logger(`Rate limit hit, waiting ${resetInMs / 1000} seconds before continuing...`);
          await delay(resetInMs);
        }
      }
    }
  } catch (error) {
    if (retries > 0) {
      logger(`Error occurred while registering batch. Retrying... Error:`, error);
      await delay(delayFactor); // Exponential backoff
      return registerBatch(commands, CLIENT_ID, GUILD_ID, retries - 1, delayFactor * 2, batchSize);
    } else {
      logger(`Failed to register batch after retries.`, error);
    }
  }
}

// Function to wrap an API call with a timeout
async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms));
  return Promise.race([promise, timeout]);
}

// Function to delete all guild commands
async function deleteAllGuildCommands(CLIENT_ID, GUILD_ID) {
  try {
    logger(`Deleting all guild commands for guild ID: ${GUILD_ID}...`);
    const commands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    for (const command of commands) {
      await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, command.id));
      logger(`Deleted command: ${command.name}`);
    }
  } catch (error) {
    logger('Error deleting all guild commands:', error);
  }
}

// Function to delete all global commands
async function deleteAllGlobalCommands(CLIENT_ID) {
  try {
    logger(`Deleting all global commands for application ID: ${CLIENT_ID}...`);
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    for (const command of commands) {
      await rest.delete(Routes.applicationCommand(CLIENT_ID, command.id));
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
