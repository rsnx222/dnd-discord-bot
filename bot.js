const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Ensure this is at the top

// Setup Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Bot token from the Discord Developer Portal
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Decode Base64 credentials and write to a temporary file
const credentialsBase64 = process.env.GOOGLE_SHEET_CREDENTIALS_BASE64;
const credentialsPath = path.join(__dirname, 'credentials.json');
fs.writeFileSync(credentialsPath, Buffer.from(credentialsBase64, 'base64'));

// Google Sheets API setup
const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const sheets = google.sheets({ version: 'v4', auth });

// Example command handler
client.on('messageCreate', async (message) => {
  if (message.content === '!example') {
    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your actual spreadsheet ID
    const range = 'Teams!A1:D10'; // Adjust the range as needed
    
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
  }
});

client.once('ready', () => {
  console.log('Bot is online!');
});

client.login(DISCORD_TOKEN);
