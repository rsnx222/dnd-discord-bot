const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const credentialsBase64 = process.env.GOOGLE_SHEET_CREDENTIALS_BASE64;
const credentialsPath = path.join(__dirname, 'credentials.json');
fs.writeFileSync(credentialsPath, Buffer.from(credentialsBase64, 'base64'));

const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const sheets = google.sheets({ version: 'v4', auth });

// Your Google Sheets ID
const spreadsheetId = '1GNbfUs3fb2WZ4Zn9rI7kHq7ZwKECOa3psrg7sx2W3oM';

// Register slash commands
client.once('ready', async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: [
        {
          name: 'example',
          description: 'Fetch data from Google Sheets',
        },
        {
          name: 'status',
          description: 'Check the status of something',
        },
        {
          name: 'explore',
          description: 'Explore a map or execute an explore-related action',
        },
      ],
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'example') {
    const range = 'Teams!A1:D10'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      await interaction.reply(`Spreadsheet Data: ${JSON.stringify(response.data.values)}`);
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      await interaction.reply('Failed to fetch data from Google Sheets.');
    }
  } else if (commandName === 'status') {
    // Add your status command logic here
    await interaction.reply('Status command executed!');
  } else if (commandName === 'explore') {
    // Add your explore command logic here
    await interaction.reply('Explore command executed!');
  }
});

client.once('ready', () => {
  console.log('Bot is online!');
});

client.login(DISCORD_TOKEN);
