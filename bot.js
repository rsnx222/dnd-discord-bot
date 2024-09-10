const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

client.on(Events.ClientReady, () => {
  console.log('Bot is online!');

  // Registering commands
  const commands = [
    {
      name: 'locations',
      description: 'Show the current locations of all teams.',
    },
    {
      name: 'moveteam',
      description: 'Move a team to a new tile.',
      options: [
        {
          type: 3, // STRING
          name: 'team',
          description: 'Name of the team to move.',
          required: true,
        },
        {
          type: 3, // STRING
          name: 'direction',
          description: 'Direction to move the team (up, down, left, right, up-left, up-right, down-left, down-right).',
          required: true,
        },
      ],
    },
  ];

  client.application.commands.set(commands)
    .then(() => console.log('Slash commands registered'))
    .catch(console.error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user, member } = interaction;

  if (commandName === 'locations') {
    // Handle /locations command
    const range = 'Teams!A1:D10'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const teamData = response.data.values;

      // Build the visual response
      const locations = teamData.map(row => {
        const [teamName, location] = row;
        const emoji = getEmojiForTeam(teamName); // Get the emoji for the team
        return `${emoji} ${teamName} is at ${location}`;
      }).join('\n');

      await interaction.reply({ content: `Current Team Locations:\n${locations}`, ephemeral: true });
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      await interaction.reply({ content: 'Failed to fetch data from Google Sheets.', ephemeral: true });
    }
  } else if (commandName === 'moveteam') {
    // Handle /moveteam command
    if (!member.roles.cache.some(role => role.name === 'admin')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const teamName = options.getString('team');
    const direction = options.getString('direction');

    try {
      const teamSheet = sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Teams!A2:D',
      });

      const teamData = teamSheet.data.values;

      const teamIndex = teamData.findIndex(row => row[0] === teamName);
      if (teamIndex === -1) {
        return interaction.reply({ content: 'Team not found.', ephemeral: true });
      }

      const currentLocation = teamData[teamIndex][1];
      const [currentRowLetter, currentColumnStr] = currentLocation.split(/(\d+)/);
      const currentColumn = parseInt(currentColumnStr, 10);

      const newTile = calculateNewTile(currentRowLetter, currentColumn, direction);

      if (!newTile) {
        return interaction.reply({ content: 'Invalid move direction.', ephemeral: true });
      }

      const range = `Teams!B${teamIndex + 2}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[newTile]],
        },
      });

      await interaction.reply({ content: `Moved team ${teamName} to ${newTile}.`, ephemeral: true });
    } catch (error) {
      console.error('Error updating team location:', error);
      await interaction.reply({ content: 'Failed to update team location.', ephemeral: true });
    }
  }
});

function getEmojiForTeam(teamName) {
  // Customize this mapping to suit your needs
  const emojis = {
    'Pink': '🩷',
    'Blue': '🔵',
    'Green': '🟢',
    'Yellow': '🟡',
  };
  return emojis[teamName] || '🔘';
}

function calculateNewTile(currentRowLetter, currentColumn, direction) {
  if (!currentRowLetter || !currentColumn) return null;

  const currentRowNumber = currentRowLetter.charCodeAt(0) - 64;
  let newRowNumber = currentRowNumber;
  let newColumn = currentColumn;

  switch (direction) {
    case 'up': newRowNumber -= 1; break;
    case 'down': newRowNumber += 1; break;
    case 'left': newColumn -= 1; break;
    case 'right': newColumn += 1; break;
    case 'up-left': newRowNumber -= 1; newColumn -= 1; break;
    case 'up-right': newRowNumber -= 1; newColumn += 1; break;
    case 'down-left': newRowNumber += 1; newColumn -= 1; break;
    case 'down-right': newRowNumber += 1; newColumn += 1; break;
    default: return null;
  }

  // Prevent moving out of bounds
  if (newRowNumber < 1 || newColumn < 1 || newRowNumber > 5 || newColumn > 10) return null;

  const newRowLetter = String.fromCharCode(newRowNumber + 64);
  return `${newRowLetter}${newColumn}`;
}

client.login(DISCORD_TOKEN);
