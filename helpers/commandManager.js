const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Setup REST with the token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register all commands and context menus
async function registerCommandsAndContextMenus(CLIENT_ID, GUILD_ID) {
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

    // Register all commands in one request
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: combined }
    );
    logger('Successfully registered all commands and context menus.');
  } catch (error) {
    logger('Error during registration of commands and context menus:', error);
  }
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
