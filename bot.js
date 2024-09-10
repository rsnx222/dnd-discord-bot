const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

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

// Command handling
client.on('messageCreate', async (message) => {
  if (message.content === '!example') {
    const range = 'Teams!A1:D10'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      message.channel.send(`Spreadsheet Data: ${JSON.stringify(response.data.values)}`);
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      message.channel.send('Failed to fetch data from Google Sheets.');
    }
  } else if (message.content === '!status') {
    // Add your status command logic here
  } else if (message.content === '!explore') {
    // Add your explore command logic here
  }
});

client.once('ready', () => {
  console.log('Bot is online!');
});

client.login(DISCORD_TOKEN);
