// commandManager.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const timeout = (promise, ms) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise.then(value => {
      clearTimeout(timer);
      resolve(value);
    }).catch(reason => {
      clearTimeout(timer);
      reject(reason);
    });
  });
};

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

    for (const command of combined) {
      try {
        logger(`Attempting to register command: ${command.name}`);
        const response = await timeout(
          rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), { body: [command] }),
          10000 // Set a 10-second timeout
        );
        logger(`Successfully registered command: ${command.name}`);
        await delay(2000); // Increase delay to 2 seconds to prevent rate limiting
      } catch (error) {
        if (error.message === 'Request timed out') {
          logger(`Timeout occurred while registering command: ${command.name}`);
        } else if (error.status === 429) {
          const retryAfter = error.headers['retry-after'];
          logger(`Rate limit hit. Retrying after ${retryAfter} seconds for command: ${command.name}`);
          await delay(retryAfter * 1000);
        } else {
          logger(`Error registering command: ${command.name}`, error);
        }
      }
    }

    logger('Finished registering all commands and context menus.');
  } catch (error) {
    logger('Error during registration of commands and context menus:', error);
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
