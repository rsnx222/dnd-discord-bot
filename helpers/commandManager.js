// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to register slash commands
async function registerCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) slash commands.');

    // Load commands from the /commands directory
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      logger(`Registering command(s) from: ${file}`);

      // Check if the file exports multiple commands or a single command
      if (Array.isArray(command.data)) {
        logger(`Command array found in: ${file}`);
        return command.data.map(cmd => cmd.toJSON()); // Map multiple commands
      } else {
        return command.data.toJSON(); // Convert to JSON for a single command
      }
    });

    // Register slash commands with Discord
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
      { body: commands }
    );

    logger('Successfully reloaded guild (/) slash commands.');
  } catch (error) {
    logger('Error registering slash commands:', error);
  }
}

// Function to register context menu commands
async function registerContextMenus(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) context menus.');

    // Load context menu commands from the /contextMenus directory
    const contextMenuFiles = fs.readdirSync(path.join(__dirname, '../contextMenus')).filter(file => file.endsWith('.js'));

    const contextMenus = contextMenuFiles.map(file => {
      const contextMenu = require(`../contextMenus/${file}`);
      logger(`Registering context menu from: ${file}`);
      return contextMenu.data.toJSON(); // Convert to JSON format
    });

    // Register context menu commands with Discord
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
      { body: contextMenus }
    );

    logger('Successfully reloaded guild (/) context menus.');
  } catch (error) {
    logger('Error registering context menus:', error);
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
  registerCommands,
  registerContextMenus,
  deleteAllGuildCommands,
  deleteAllGlobalCommands,
};
