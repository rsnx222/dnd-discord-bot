// commandManager.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Started clearing and refreshing guild (/) commands.');

    // Load commands from the /commands directory
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      logger(`Registering command(s) from: ${file}`);

      // Check if the file exports multiple commands or a single command
      if (Array.isArray(command.data)) {
        logger(`Command array found in: ${file}`);
        return command.data.map(cmd => cmd.toJSON()); // If multiple commands, map over them
      } else {
        return command.data.toJSON(); // If single, return it directly
      }
    });

    // Register commands with Discord
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
      { body: commands }
    );

    logger('Successfully reloaded guild (/) commands.');
  } catch (error) {
    logger('Error registering commands:', error);
  }
}

async function fetchCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    const commands = await rest.get(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId)
    );
    return commands;
  } catch (error) {
    logger('Error fetching commands:', error);
  }
}

async function deleteAllGuildCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    logger('Deleting all guild commands...');
    const commands = await fetchCommands(DISCORD_CLIENT_ID, guildId);

    for (const command of commands) {
      await rest.delete(
        Routes.applicationGuildCommand(DISCORD_CLIENT_ID, guildId, command.id)
      );
      logger(`Deleted command: ${command.name}`);
    }
  } catch (error) {
    logger('Error deleting all commands:', error);
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
  registerCommands,
  fetchCommands,
  deleteAllGuildCommands,
  deleteAllGlobalCommands,
};