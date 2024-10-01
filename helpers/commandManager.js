// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Setup REST with the token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register all commands and context menus
async function registerCommandsAndContextMenus(CLIENT_ID, GUILD_ID) {
  try {
    logger('Started refreshing guild (/) slash commands and context menus.');

    // Load command files
    const commandsDir = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

    const commands = [];
    for (const file of commandFiles) {
      const command = require(`../commands/${file}`);
      if ('data' in command) {
        if (Array.isArray(command.data)) {
          command.data.forEach(cmdData => {
            logger(`Registering command: ${cmdData.name}`);
            commands.push(cmdData.toJSON());
          });
        } else {
          logger(`Registering command: ${command.data.name}`);
          commands.push(command.data.toJSON());
        }
      } else {
        logger(`Command file ${file} is missing "data" property.`);
      }
    }

    // Load context menu files
    const contextMenusDir = path.join(__dirname, '../contextMenus');
    const contextMenuFiles = fs.readdirSync(contextMenusDir).filter(file => file.endsWith('.js'));

    for (const file of contextMenuFiles) {
      const contextMenu = require(`../contextMenus/${file}`);
      if ('data' in contextMenu) {
        logger(`Registering context menu: ${contextMenu.data.name}`);
        commands.push(contextMenu.data.toJSON());
      } else {
        logger(`Context menu file ${file} is missing "data" property.`);
      }
    }

    logger(`Total commands & context menus to register: ${commands.length}`);

    // Register all commands and context menus with Discord
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    logger('Successfully registered all commands and context menus.');
  } catch (error) {
    logger('Error registering commands and context menus:', error);
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

// Function to reload a specific command
async function reloadCommand(commandName) {
  try {
    const commandsDir = path.join(__dirname, '../commands');
    const commandPath = path.join(commandsDir, `${commandName}.js`);

    if (!fs.existsSync(commandPath)) {
      logger(`Command ${commandName} not found.`);
      return false;
    }

    // Remove the command from the cache
    delete require.cache[require.resolve(commandPath)];

    // Re-require the command
    const newCommand = require(commandPath);

    // Add the command to the collection again
    if ('data' in newCommand) {
      const commandCollection = require('../bot').client.commands;
      commandCollection.set(newCommand.data.name, newCommand);
      logger(`Command ${commandName} reloaded successfully.`);
      return true;
    } else {
      logger(`Failed to reload command ${commandName}: missing "data" property.`);
      return false;
    }
  } catch (error) {
    logger(`Error reloading command ${commandName}:`, error);
    return false;
  }
}

// Function to reload a specific helper
async function reloadHelper(helperName) {
  try {
    const helpersDir = path.join(__dirname, '../helpers');
    const helperPath = path.join(helpersDir, `${helperName}.js`);

    if (!fs.existsSync(helperPath)) {
      logger(`Helper ${helperName} not found.`);
      return false;
    }

    // Remove the helper from the cache
    delete require.cache[require.resolve(helperPath)];

    // Re-require the helper
    require(helperPath);

    logger(`Helper ${helperName} reloaded successfully.`);
    return true;
  } catch (error) {
    logger(`Error reloading helper ${helperName}:`, error);
    return false;
  }
}

module.exports = {
  registerCommandsAndContextMenus,
  deleteAllGuildCommands,
  deleteAllGlobalCommands,
  reloadCommand,
  reloadHelper,
};
