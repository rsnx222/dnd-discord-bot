// commandManager.js

const { REST, Routes } = require('discord.js');
const settings = require('../config/settings');
const fs = require('fs');
const path = require('path');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    console.log('Started clearing and refreshing guild (/) commands.');

    // Load commands from the /commands directory
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

    const commands = commandFiles.flatMap(file => {
      const command = require(`../commands/${file}`);
      console.log(`Registering command(s) from: ${file}`);

      // Check if the file exports multiple commands or a single command
      if (Array.isArray(command.data)) {
        console.log(`Command array found in: ${file}`);
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

    console.log('Successfully reloaded guild (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

async function fetchCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    const commands = await rest.get(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId)
    );
    return commands;
  } catch (error) {
    console.error('Error fetching commands:', error);
  }
}

async function deleteAllGuildCommands(DISCORD_CLIENT_ID, guildId) {
  try {
    console.log('Deleting all guild commands...');
    const commands = await fetchCommands(DISCORD_CLIENT_ID, guildId);

    for (const command of commands) {
      await rest.delete(
        Routes.applicationGuildCommand(DISCORD_CLIENT_ID, guildId, command.id)
      );
      console.log(`Deleted command: ${command.name}`);
    }
  } catch (error) {
    console.error('Error deleting all commands:', error);
  }
}

async function deleteAllGlobalCommands(DISCORD_CLIENT_ID) {
  try {
    console.log('Deleting all global commands...');
    const commands = await rest.get(Routes.applicationCommands(DISCORD_CLIENT_ID));

    for (const command of commands) {
      await rest.delete(Routes.applicationCommand(DISCORD_CLIENT_ID, command.id));
      console.log(`Deleted global command: ${command.name}`);
    }
  } catch (error) {
    console.error('Error deleting global commands:', error);
  }
}

module.exports = {
  registerCommands,
  fetchCommands,
  deleteAllGuildCommands,
  deleteAllGlobalCommands,
};