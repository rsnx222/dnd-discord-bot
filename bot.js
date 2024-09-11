const { Client, GatewayIntentBits, Events } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Ensure this is included
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

// Emojis for teams
const teamEmojis = {
  Pink: '🩷',
  Green: '🟢',
  Grey: '🔘',
  Blue: '🔵',
  Orange: '🟠',
  Yellow: '🟡',
  Cyan: '🔵',
};

// Command handling
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'locations') {
    const range = 'Teams!A2:D'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const teamData = response.data.values || [];
      let locations = 'Current Team Locations:\n';

      teamData.forEach(row => {
        const [teamName, currentLocation] = row;
        const emoji = teamEmojis[teamName] || '🔘'; // Default to '🔘' if no emoji found
        locations += `${emoji} ${teamName} is at ${currentLocation}\n`;
      });

      await interaction.reply({ content: locations, ephemeral: true });
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      try {
        await interaction.reply({ content: 'Failed to fetch data from Google Sheets.', ephemeral: true });
      } catch (err) {
        console.error('Failed to send reply:', err);
      }
    }
  } else if (commandName === 'moveteam') {
    const teamName = interaction.options.getString('team');
    const direction = interaction.options.getString('direction');

    // Check if user has 'admin' role
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const adminRole = interaction.guild.roles.cache.find(role => role.name === 'admin');
    if (!adminRole || !member.roles.cache.has(adminRole.id)) {
      return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const teamSheet = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Teams!A2:D',
      });

      const teamData = teamSheet.data.values || [];
      const team = teamData.find(row => row[0] === teamName);

      if (!team) {
        return await interaction.reply({ content: `Team ${teamName} not found.`, ephemeral: true });
      }

      const [currentLocation] = team;
      const newTile = calculateNewTile(currentLocation, direction);

      if (!isValidTile(newTile)) {
        return await interaction.reply({ content: `Invalid tile: ${newTile}.`, ephemeral: true });
      }

      const hiddenRequirementsSheet = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'HiddenTileRequirements!A2:B',
      });

      if (!canMoveToTile(newTile, hiddenRequirementsSheet.data.values)) {
        return await interaction.reply({ content: `Cannot move to ${newTile} due to hidden requirements.`, ephemeral: true });
      }

      // Update the team's location
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Teams!B${teamData.findIndex(row => row[0] === teamName) + 2}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[newTile]],
        },
      });

      // Update the explored tiles if necessary
      await updateExploredTiles(teamSheet, teamName, newTile);

      await interaction.reply({ content: `Team ${teamName} moved to ${newTile}.`, ephemeral: true });
    } catch (error) {
      console.error('Error updating team location:', error);
      try {
        await interaction.reply({ content: 'Failed to update team location.', ephemeral: true });
      } catch (err) {
        console.error('Failed to send reply:', err);
      }
    }
  }
});

client.once(Events.ClientReady, () => {
  console.log('Bot is online!');
});

client.login(DISCORD_TOKEN);

// This is the updated function to correctly handle tile calculation and prevent NaN issues
function calculateNewTile(currentTile, direction) {
  const col = currentTile.charAt(0); // Letter (Column)
  const row = parseInt(currentTile.slice(1)); // Number (Row)

  if (isNaN(row)) return null; // Ensure row is a number

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0); // Convert column letter to index
  let newColIndex = colIndex;
  let newRow = row;

  switch (direction) {
    case 'up': newRow -= 1; break;
    case 'down': newRow += 1; break;
    case 'left': newColIndex -= 1; break;
    case 'right': newColIndex += 1; break;
    case 'up-left': newRow -= 1; newColIndex -= 1; break;
    case 'up-right': newRow -= 1; newColIndex += 1; break;
    case 'down-left': newRow += 1; newColIndex -= 1; break;
    case 'down-right': newRow += 1; newColIndex += 1; break;
    default: return null; // Invalid direction
  }

  // Convert back to column letter and check boundaries
  const newCol = String.fromCharCode('A'.charCodeAt(0) + newColIndex);

  // Ensure the move is within map bounds (A to E for columns, 1 to 5 for rows)
  if (newRow < 1 || newRow > 5 || newColIndex < 0 || newColIndex > 4) {
    return null;
  }

  return `${newCol}${newRow}`;
}

function isValidTile(tile) {
  return tile !== null;
}

function canMoveToTile(tile, hiddenRequirements) {
  for (const [requirementTile, requirement] of hiddenRequirements) {
    if (requirementTile === tile) {
      return !requirement || requirement === 'None';
    }
  }
  return true;
}

async function updateExploredTiles(teamSheet, teamName, newTile) {
  const teamData = teamSheet.data.values || [];
  const teamRowIndex = teamData.findIndex(row => row[0] === teamName) + 2;

  const currentExploredTiles = teamData[teamRowIndex - 2][2] || '';
  const updatedExploredTiles = currentExploredTiles ? `${currentExploredTiles},${newTile}` : newTile;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Teams!C${teamRowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[updatedExploredTiles]],
    },
  });
}
