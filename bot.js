const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');
const commandManager = require('./commandManager');
const { generateMapImage } = require('./mapGenerator');
const googleSheetsHelper = require('./googleSheetsHelper');  // For Google Sheets integration
const teamManager = require('./teamManager');  // For team-related logic
const movementLogic = require('./movementLogic');  // For movement logic

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const auth = new google.auth.GoogleAuth({
  keyFile: settings.credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});
const sheets = google.sheets({ version: 'v4', auth });

// Read all command files from `/commands` directory
client.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Dynamically load command files
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Register commands
client.once(Events.ClientReady, async () => {
  console.log('Bot is online!');

  const commands = client.commands.map(cmd => cmd.data); // Map command data for registration
  await commandManager.deleteAllGuildCommands(settings.DISCORD_CLIENT_ID, settings.guildId);
  await commandManager.registerCommands(settings.DISCORD_CLIENT_ID, settings.guildId, commands);
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, sheets, settings); // Pass necessary dependencies
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.login(settings.DISCORD_TOKEN);
