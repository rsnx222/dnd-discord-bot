const { Client, GatewayIntentBits, Events, MessageActionRow, MessageButton } = require('discord.js');
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

client.once(Events.ClientReady, () => {
  console.log('Bot is online!');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'example') {
    const range = 'Teams!A1:D10'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const teamData = response.data.values || [];
      const embed = new Discord.EmbedBuilder()
        .setTitle('Team Status')
        .setDescription('Here is the current status of all teams:')
        .setColor('#00ff00');

      teamData.forEach((row) => {
        const [teamName, currentLocation] = row;
        const teamEmoji = getTeamEmoji(teamName);
        embed.addField(`${teamEmoji} ${teamName}`, `Current Location: ${currentLocation}`, true);
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      await interaction.reply({ content: 'Failed to fetch data from Google Sheets.', ephemeral: true });
    }
  } else if (commandName === 'moveteam') {
    const member = interaction.member;

    if (!member.roles.cache.some(role => role.name === 'admin')) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const teamName = interaction.options.getString('team');
    const direction = interaction.options.getString('direction');

    try {
      await moveTeamAndTrackExploration(teamName, direction);
      await interaction.reply({ content: `Moved team ${teamName} ${direction}.`, ephemeral: true });
    } catch (error) {
      console.error('Error moving team:', error);
      await interaction.reply({ content: 'Failed to move team.', ephemeral: true });
    }
  }
});

// Add command handling and register slash commands
client.on(Events.ClientReady, async () => {
  const commands = [
    {
      name: 'example',
      description: 'Fetch data from Google Sheets and display it',
    },
    {
      name: 'moveteam',
      description: 'Move a team to a new tile',
      options: [
        {
          type: 3,
          name: 'team',
          description: 'Name of the team to move',
          required: true,
        },
        {
          type: 3,
          name: 'direction',
          description: 'Direction to move (e.g., up, down, left, right)',
          required: true,
        },
      ],
    },
  ];

  try {
    await client.application.commands.set(commands);
    console.log('Slash commands registered');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Function to get team emoji
function getTeamEmoji(teamName) {
  const emojis = {
    'Red': '🔴',
    'Blue': '🔵',
    'Green': '🟢',
    'Yellow': '🟡',
    // Add more team names and their corresponding emojis
  };
  return emojis[teamName] || '🔘'; // Default emoji if team not found
}

// Function to handle team movement and exploration tracking
async function moveTeamAndTrackExploration(teamName, direction) {
  const teamSheet = sheets.spreadsheets.values;
  const range = 'Teams!A2:D';
  
  try {
    const response = await teamSheet.get({
      spreadsheetId,
      range,
    });
    
    const teamData = response.data.values;
    const teamIndex = teamData.findIndex(row => row[0] === teamName);
    if (teamIndex === -1) throw new Error('Team not found');
    
    const [currentLocation] = teamData[teamIndex];
    const newTile = calculateNewTile(currentLocation, direction);
    
    if (!newTile) throw new Error('Invalid move');
    
    // Update the team's location
    const newExploredTiles = (teamData[teamIndex][2] || '').split(',').concat(newTile).join(',');
    await teamSheet.update({
      spreadsheetId,
      range: `Teams!B${teamIndex + 2}:D${teamIndex + 2}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[newTile, newExploredTiles]],
      },
    });
    
    console.log(`Moved team ${teamName} to ${newTile}`);
  } catch (error) {
    console.error('Error updating team location:', error);
  }
}

// Function to calculate new tile based on direction
function calculateNewTile(currentTile, direction) {
  if (!currentTile) return null;

  const [currentRowLetter, currentColumn] = [currentTile.charAt(0), parseInt(currentTile.slice(1))];
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
  }

  if (newRowNumber < 1 || newColumn < 1) return null;

  const newRowLetter = String.fromCharCode(newRowNumber + 64);
  return newRowLetter + newColumn;
}

client.login(DISCORD_TOKEN);
