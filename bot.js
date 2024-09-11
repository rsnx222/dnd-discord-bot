const { Client, GatewayIntentBits, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
      const teamSelectMenu = new StringSelectMenuBuilder()
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
        await interaction.deferReply({ ephemeral: true }); // Defer the reply early
    
        // Fetch the Teams sheet data
        const teamSheet = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Teams!A2:B', // Update range to include only Team and Current Location columns
        });
    
        const teamData = teamSheet.data.values || [];
        
        // Find the row where the team name matches, and extract the current location from column B
        const team = teamData.find(row => row[0] === teamName);
        if (!team) {
          return await interaction.editReply({ content: `Team ${teamName} not found.` });
        }
    
        const currentLocation = team[1]; // Fetch current location from column B
        console.log(`Current Location for ${teamName}: ${currentLocation}`);  // Log the current location
    
        // Calculate the new tile based on the current location and selected direction
        const newTile = calculateNewTile(currentLocation, selectedDirection);
    
        if (!isValidTile(newTile)) {
          return await interaction.editReply({ content: `Invalid tile: ${newTile}.` });
        }
    
        // Check if the new tile meets the hidden requirements
        const hiddenRequirementsSheet = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'HiddenTileRequirements!A2:B',
        });
    
        if (!canMoveToTile(newTile, hiddenRequirementsSheet.data.values)) {
          return await interaction.editReply({ content: `Cannot move to ${newTile} due to hidden requirements.` });
        }
    
        // Update the team's location in the Teams sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Teams!B${teamData.findIndex(row => row[0] === teamName) + 2}`, // Update column B (current location)
          valueInputOption: 'RAW',
          resource: {
            values: [[newTile]],
          },
        });
    
        // Update explored tiles if necessary
        await updateExploredTiles(teamSheet, teamName, newTile);
    
        await interaction.editReply({ content: `Team ${teamName} moved to ${newTile}.` });
      } catch (error) {
        console.error('Error updating team location:', error);
        await interaction.editReply({ content: 'Failed to update team location.' });
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
    console.log('Started clearing and refreshing guild (/) commands.');

    // Clear all previous guild commands
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
      { body: [] }
    );

    // Register new commands
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId),
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

  // Ensure currentTile is valid and has a column letter and a row number
  if (!currentTile || currentTile.length < 2) {
    console.error('Invalid current tile format');
    return null;
  }

  const col = currentTile.charAt(0); // Extract letter (column)
  const row = parseInt(currentTile.slice(1)); // Extract number (row)

  console.log(`Parsed Column: ${col}, Parsed Row: ${row}`);  // Log parsed column and row

  if (isNaN(row)) {
    console.error('Row is not a number');
    return null; // Ensure row is a number
  }

  // Convert column letter to index (A = 0, B = 1, C = 2, etc.)
  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
  let newColIndex = colIndex;
  let newRow = row;

  // Calculate new position based on the direction
  switch (direction) {
    case 'north': newRow -= 1; break;
    case 'south': newRow += 1; break;
    case 'west': newColIndex -= 1; break;
    case 'east': newColIndex += 1; break;
    default: 
      console.error('Invalid direction');
      return null;
  }

  // Ensure the new column is within bounds (B to F = col index 1 to 5)
  if (newColIndex < 1 || newColIndex > 5) {
    console.error('New column index out of bounds');
    return null;
  }

  // Ensure the new row is within bounds (3 to 12)
  if (newRow < 3 || newRow > 12) {
    console.error('New row out of bounds');
    return null;
  }

  // Convert new column index back to a letter
  const newCol = String.fromCharCode('A'.charCodeAt(0) + newColIndex);

  console.log(`New Tile: ${newCol}${newRow}`);  // Log the final new tile
  return `${newCol}${newRow}`; // Return the new tile (e.g., 'C7')
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
  const teamRowIndex = teamData.findIndex(row => row[0] === teamName) + 2; // Find the row of the team

  // Fetch existing explored tiles (Column C)
  let currentExploredTiles = teamData[teamRowIndex - 2][2] || ''; 

  console.log(`Current explored tiles for ${teamName}: '${currentExploredTiles}'`); // Log current tiles for debugging

  // Trim any leading/trailing commas/spaces
  currentExploredTiles = currentExploredTiles.trim().replace(/^,+|,+$/g, '');

  console.log(`Cleaned explored tiles: '${currentExploredTiles}'`); // Log cleaned tiles

  // Split into an array of tiles if not empty, otherwise initialize an empty array
  const exploredTilesArray = currentExploredTiles ? currentExploredTiles.split(',') : []; 

  console.log(`Explored tiles array: [${exploredTilesArray.join(', ')}]`); // Log the array for debugging

  // Check if the new tile is already explored
  if (exploredTilesArray.includes(newTile)) {
    console.log(`Tile ${newTile} is already in the explored list for ${teamName}.`);
    return; // No need to update if the tile is already explored
  }

  // Append the new tile
  exploredTilesArray.push(newTile); 
  const updatedExploredTiles = exploredTilesArray.join(','); // Rebuild the comma-separated string

  console.log(`Updated explored tiles for ${teamName}: '${updatedExploredTiles}'`); // Log the new tiles

  // Update the "Explored Tiles" column (C)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Teams!C${teamRowIndex}`, // Column C contains explored tiles
    valueInputOption: 'RAW',
    resource: {
      values: [[updatedExploredTiles]],
    },
  });

  console.log(`Successfully updated explored tiles for ${teamName}: '${updatedExploredTiles}'`);
}
