require('dotenv').config();
const { Client, Intents } = require('discord.js');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const TOKEN = process.env.DISCORD_TOKEN;
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
const SHEET_NAME = 'Teams'; // Update as necessary
const GOOGLE_SHEET_CREDENTIALS_PATH = 'path/to/credentials.json'; // Path to your Google Sheets API credentials

const auth = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
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
        range: `${SHEET_NAME}!A:D`
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
