// commandManager.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands(DISCORD_CLIENT_ID, guildId, commands) {
  try {
    console.log('Started clearing and refreshing guild (/) commands.');

    // Clear all previous guild commands and register new ones
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
    console.log('Registered Slash Commands:', commands);
    return commands;
  } catch (error) {
    console.error('Error fetching commands:', error);
  }
}

async function deleteCommand(DISCORD_CLIENT_ID, guildId, commandId) {
  try {
    await rest.delete(
      Routes.applicationGuildCommand(DISCORD_CLIENT_ID, guildId, commandId)
    );
    console.log(`Deleted command with ID: ${commandId}`);
  } catch (error) {
    console.error('Error deleting command:', error);
  }
}

module.exports = {
  registerCommands,
  fetchCommands,
  deleteCommand,
};
