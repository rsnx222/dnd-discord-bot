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

module.exports = {
  registerCommands,
  fetchCommands,
  deleteAllGuildCommands,
};
