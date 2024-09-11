const { Client, GatewayIntentBits, Events, ActionRowBuilder, SelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const guildId = '1242722293700886591';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
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

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle /locations command
    if (interaction.isCommand() && interaction.commandName === 'locations') {
      await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction to prevent timeout

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

        await interaction.editReply({ content: locations });
      } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        await interaction.editReply({ content: 'Failed to fetch data from Google Sheets.' });
      }
    }

    // Handle /moveteam command initiation
    if (interaction.isCommand() && interaction.commandName === 'moveteam') {
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

    // Handle team selection
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_team') {

      const selectedTeam = interaction.values[0]; // Get selected team

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

    // Handle directional button press
    if (interaction.isButton() && ['north', 'south', 'west', 'east'].includes(interaction.customId)) {
      const selectedDirection = interaction.customId;
      const teamName = interaction.message.content.match(/You selected (.+?)\./)[1]; // Extract the selected team from the message

      try {
        const teamSheet = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Teams!A2:D',
        });

        const teamData = teamSheet.data.values || [];
        const team = teamData.find(row => row[0] === teamName);

        if (!team) {
          return await interaction.update({ content: `Team ${teamName} not found.`, components: [], ephemeral: true });
        }

        const [currentLocation] = team;
        const newTile = calculateNewTile(currentLocation, selectedDirection);

        if (!isValidTile(newTile)) {
          return await interaction.update({ content: `Invalid tile: ${newTile}.`, components: [], ephemeral: true });
        }

        const hiddenRequirementsSheet = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'HiddenTileRequirements!A2:B',
        });

        if (!canMoveToTile(newTile, hiddenRequirementsSheet.data.values)) {
          return await interaction.update({ content: `Cannot move to ${newTile} due to hidden requirements.`, components: [], ephemeral: true });
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
        await interaction.update({ content: 'Failed to update team location.', components: [], ephemeral: true });
      }
    }
  } catch (error) {
    console.error('An error occurred in the interaction handler:', error);
  }
});

const commands = [
  {
    name: 'moveteam',
    description: 'Move a team by selecting a direction',
  },
  {
    name: 'locations',
    description: 'Show current team locations',
  },
];


(async () => {
  try {
    console.log('Started refreshing guild (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
      { body: commands }
    );

    console.log('Successfully reloaded guild (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();


// Login the bot
client.once(Events.ClientReady, () => {
  console.log('Bot is online!');
});

client.login(DISCORD_TOKEN);

// Utility functions for movement logic
function calculateNewTile(currentTile, direction) {
  console.log(`Current Tile: ${currentTile}`);  // Log the current tile
  console.log(`Direction: ${direction}`);  // Log the direction

  if (!currentTile || currentTile.length < 2) {
    console.error('Invalid current tile format');
    return null;  // Ensure valid tile format
  }
  
  const col = currentTile.charAt(0); // Letter (Column)
  const row = parseInt(currentTile.slice(1)); // Number (Row)

  console.log(`Parsed Column: ${col}, Parsed Row: ${row}`);  // Log parsed column and row

  if (isNaN(row)) {
    console.error('Row is not a number');
    return null; // Ensure row is a number
  }

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0); // Convert column letter to index (A = 0, B = 1, etc.)
  let newColIndex = colIndex;
  let newRow = row;

  // Calculate new tile based on direction
  switch (direction) {
    case 'north': newRow -= 1; break;
    case 'south': newRow += 1; break;
    case 'west': newColIndex -= 1; break;
    case 'east': newColIndex += 1; break;
    default: 
      console.error('Invalid direction');
      return null; // Invalid direction
  }

  console.log(`New Column Index: ${newColIndex}, New Row: ${newRow}`);  // Log the new column index and row

  // Ensure the new column is within bounds (A to E = col index 0 to 4)
  if (newColIndex < 0 || newColIndex > 4) {
    console.error('New column index out of bounds');
    return null;
  }

  // Ensure the new row is within bounds (1 to 5)
  if (newRow < 1 || newRow > 5) {
    console.error('New row out of bounds');
    return null;
  }

  const newCol = String.fromCharCode('A'.charCodeAt(0) + newColIndex); // Convert back to column letter

  console.log(`New Tile: ${newCol}${newRow}`);  // Log the final new tile
  return `${newCol}${newRow}`; // Return the new tile
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
