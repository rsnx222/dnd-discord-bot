// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Helper function to add a delay (throttling)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function registerCommandsAndContextMenus(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) slash commands and context menus.');

    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      logger(`Registering command(s) from: ${file}`);
      return Array.isArray(command.data) ? command.data.map(cmd => cmd.toJSON()) : [command.data.toJSON()];
    });

    const contextMenuFiles = fs.readdirSync(path.join(__dirname, '../contextMenus')).filter(file => file.endsWith('.js'));
    const contextMenus = contextMenuFiles.map(file => {
      const contextMenu = require(`../contextMenus/${file}`);
      logger(`Registering context menu from: ${file}`);
      return contextMenu.data.toJSON();
    });

    const combined = [...commands, ...contextMenus];

    logger(`Total commands & context menus to register: ${combined.length}`);
    
    // Loop through and register commands in batches, adding delay to avoid rate limits
    for (const command of combined) {
      try {
        logger(`Registering command: ${command.name}`);
        const response = await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), { body: [command] });

        if (response) {
          logger(`Successfully registered command: ${command.name}`);
        }
        
        await delay(1000);  // 1-second delay between each request to avoid rate limits

      } catch (error) {
        if (error.status === 429) {
          const retryAfter = error.headers['retry-after'];
          logger(`Rate limit hit. Retrying after ${retryAfter} seconds.`);
          await delay(retryAfter * 1000);  // Retry after the specified delay
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          logger(`Timeout or connection reset occurred while registering command: ${command.name}`);
        } else {
          logger(`Error registering command: ${command.name}`, error);
        }
      }
    }

    logger('Finished registering all commands and context menus.');
  } catch (error) {
    logger('Error registering commands and context menus:', error);
  }
}

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
