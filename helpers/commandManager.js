// commandManager.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Setup REST with the token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Helper function to add a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

    const batchSize = 1;
    for (let i = 0; i < combined.length; i += batchSize) {
      const batch = combined.slice(i, i + batchSize);
      await registerBatch(batch, DISCORD_CLIENT_ID, guildId);
      await delay(10000);  // Delay between batches to avoid rate limiting
    }

    logger('Finished registering all commands and context menus.');
  } catch (error) {
    logger('Error during registration of commands and context menus:', error);
  }
}

// Retry logic for batch registration
async function registerBatch(batch, DISCORD_CLIENT_ID, guildId, retries = 3) {
  try {
    logger(`Attempting to register commands batch: ${batch.map(cmd => cmd.name).join(', ')}`);
    const response = await withTimeout(
      rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID, guildId), { body: batch }),
      30000 // 30-second timeout
    );
    logger(`Successfully registered batch: ${batch.map(cmd => cmd.name).join(', ')}`);

    // Capture and log rate limit headers if available
    if (response.headers) {
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      const rateLimitReset = response.headers['x-ratelimit-reset'];
      const rateLimitLimit = response.headers['x-ratelimit-limit'];

      if (rateLimitRemaining) {
        logger(`Rate Limit Remaining: ${rateLimitRemaining}`);
        logger(`Rate Limit Reset: ${new Date(rateLimitReset * 1000).toISOString()}`);
        logger(`Rate Limit Limit: ${rateLimitLimit}`);
      }
    }
  } catch (error) {
    if (retries > 0) {
      logger(`Timeout occurred while registering batch: ${batch.map(cmd => cmd.name).join(', ')}. Retrying...`);
      await delay(1000); // Exponential delay before retry
      return registerBatch(batch, DISCORD_CLIENT_ID, guildId, retries - 1); // Retry with lower retries
    } else {
      logger(`Failed to register batch after retries: ${batch.map(cmd => cmd.name).join(', ')}`, error);
    }
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
    const commands = await rest.get(Routes.applicationCommands(DISCORD_CLIENT_ID, guildId));
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
