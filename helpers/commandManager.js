// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to register both slash commands and context menus
async function registerCommandsAndContextMenus(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) slash commands and context menus.');

    // Load slash commands from the /commands directory
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      logger(`Registering command(s) from: ${file}`);
      if (Array.isArray(command.data)) {
        return command.data.map(cmd => cmd.toJSON());
      } else {
        return command.data.toJSON();
      }
    });

    // Load context menu commands from the /contextMenus directory
    const contextMenuFiles = fs.readdirSync(path.join(__dirname, '../contextMenus')).filter(file => file.endsWith('.js'));

    const contextMenus = contextMenuFiles.map(file => {
      const contextMenu = require(`../contextMenus/${file}`);
      logger(`Registering context menu from: ${file}`);
      return contextMenu.data.toJSON();
    });

    // Combine slash commands and context menus into a single array
    const combined = [...commands, ...contextMenus];

    // Register both with Discord
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
      { body: combined }
    );

    logger('Successfully reloaded guild (/) slash commands and context menus.');
  } catch (error) {
    logger('Error registering commands and context menus:', error);
  }
}

// Function to delete all guild commands
async function deleteAllGuildCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Deleting all guild commands...');
    const commands = await rest.get(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId)
    );

    for (const command of commands) {
      await rest.delete(
        Routes.applicationGuildCommand(DISCORD_CLIENT_ID, guildId, command.id)
      );
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
