const { Client, GatewayIntentBits, Events, ActionRowBuilder, SelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// Command to start the move team interaction
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'moveteam') {
    // Select Menu for Team Selection
    const teamSelectMenu = new SelectMenuBuilder()
      .setCustomId('select_team')
      .setPlaceholder('Select a team')
      .addOptions(
        { label: 'Pink', value: 'Pink', emoji: '🩷' },
        { label: 'Green', value: 'Green', emoji: '🟢' },
        { label: 'Grey', value: 'Grey', emoji: '🔘' },
        { label: 'Blue', value: 'Blue', emoji: '🔵' },
        { label: 'Orange', value: 'Orange', emoji: '🟠' },
        { label: 'Yellow', value: 'Yellow', emoji: '🟡' },
        { label: 'Cyan', value: 'Cyan', emoji: '🔵' }
      );

    const row = new ActionRowBuilder().addComponents(teamSelectMenu);

    await interaction.reply({
      content: 'Select a team to move:',
      components: [row],
      ephemeral: true,
    });
  }

  // Handling team selection
  if (interaction.customId === 'select_team') {
    const selectedTeam = interaction.values[0]; // Selected team value

    // Buttons for selecting direction
    const directionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('north')
        .setLabel('⬆️ North')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('south')
        .setLabel('⬇️ South')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('west')
        .setLabel('⬅️ West')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('east')
        .setLabel('➡️ East')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({
      content: `You selected ${selectedTeam}. Now choose the direction:`,
      components: [directionButtons],
      ephemeral: true,
    });
  }

  // Handling direction buttons
  if (['north', 'south', 'west', 'east'].includes(interaction.customId)) {
    const selectedDirection = interaction.customId;
    const teamName = interaction.message.content.match(/You selected (.+?)\./)[1]; // Extract selected team from previous message

    try {
      const teamSheet = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Teams!A2:D',
      });

      const teamData = teamSheet.data.values || [];
      const team = teamData.find(row => row[0] === teamName);

      if (!team) {
        return await interaction.update({ content: `Team ${teamName} not found.`, ephemeral: true });
      }

      const [currentLocation] = team;
      const newTile = calculateNewTile(currentLocation, selectedDirection);

      if (!isValidTile(newTile)) {
        return await interaction.update({ content: `Invalid tile: ${newTile}.`, ephemeral: true });
      }

      const hiddenRequirementsSheet = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'HiddenTileRequirements!A2:B',
      });

      if (!canMoveToTile(newTile, hiddenRequirementsSheet.data.values)) {
        return await interaction.update({ content: `Cannot move to ${newTile} due to hidden requirements.`, ephemeral: true });
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

      await interaction.update({ content: `Team ${teamName} moved to ${newTile}.`, components: [], ephemeral: true });
    } catch (error) {
      console.error('Error updating team location:', error);
      try {
        await interaction.update({ content: 'Failed to update team location.', ephemeral: true });
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

// Existing utility functions for movement logic

function calculateNewTile(currentTile, direction) {
  const col = currentTile.charAt(0); // Letter (Column)
  const row = parseInt(currentTile.slice(1)); // Number (Row)

  if (isNaN(row)) return null; // Ensure row is a number

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0); // Convert column letter to index (A = 0, B = 1, etc.)
  let newColIndex = colIndex;
  let newRow = row;

  switch (direction) {
    case 'north': newRow -= 1; break;
    case 'south': newRow += 1; break;
    case 'west': newColIndex -= 1; break;
    case 'east': newColIndex += 1; break;
    default: return null; // Invalid direction
  }

  const newCol = String.fromCharCode('A'.charCodeAt(0) + newColIndex); // Convert back to column letter

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
