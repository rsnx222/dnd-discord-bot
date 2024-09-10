require('dotenv').config();
const { Client, Intents } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const TOKEN = process.env.DISCORD_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Decode the Base64-encoded credentials
const credentialsBase64 = process.env.GOOGLE_SHEET_CREDENTIALS_BASE64;
const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
const credentials = JSON.parse(credentialsJson);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args.shift().toLowerCase();

  if (command === '!progress') {
    const teamName = args.join(' ');
    if (!teamName) {
      message.channel.send('Please specify a team name.');
      return;
    }

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `Teams!A:D`
      });

      const rows = response.data.values;
      const teamData = rows.find(row => row[0] === teamName);

      if (teamData) {
        const [team, location, exploredTiles, status] = teamData;
        message.channel.send(`Team: ${team}\nLocation: ${location}\nExplored Tiles: ${exploredTiles}\nStatus: ${status}`);
      } else {
        message.channel.send('Team not found.');
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      message.channel.send('Error fetching team data.');
    }
  } else if (command === '!move') {
    const teamName = args.shift();
    const direction = args.join(' ');

    if (!teamName || !direction) {
      message.channel.send('Please specify a team name and direction.');
      return;
    }

    message.channel.send(`Moving team ${teamName} ${direction}.`);
  }
});

client.on('error', error => {
  console.error('Discord.js error:', error);
});

client.login(TOKEN);
