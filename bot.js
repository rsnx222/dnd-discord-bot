const { Client, GatewayIntentBits, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const commandManager = require('./commandManager'); // Command management functions
const { getTeamOptions, getTeamEmoji } = require('./teamManager'); // Team-related utilities
const { getTeamData, updateTeamLocation, updateExploredTiles } = require('./googleSheetsHelper'); // Google Sheets interaction
const { calculateNewTile, isValidTile, canMoveToTile } = require('./movementLogic'); // Movement logic
const { generateMapImage } = require('./mapGenerator'); // Map generation
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

// Slash command definitions (uses team options from teamManager)
const commands = [
  {
    name: 'moveteam',
    description: 'Move a team by selecting a direction',
  },
  {
    name: 'locations',
    description: 'Show current team locations',
  },
  {
    name: 'showmap',
    description: 'Show the current map with team locations',
    options: [
      {
        name: 'team',
        description: 'Optional: Select a team to view only their explored/unexplored tiles',
        type: 3, // String type
        required: false,
        choices: getTeamOptions(),
      },
    ],
  },
];

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isCommand()) {
      if (interaction.commandName === 'locations') {
        await handleLocationsCommand(interaction);
      } else if (interaction.commandName === 'moveteam') {
        await handleMoveTeamCommand(interaction);
      } else if (interaction.commandName === 'showmap') {
        await handleShowMapCommand(interaction);
      }
    }

    // Handle team selection for moving teams
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_team') {
      await handleTeamSelection(interaction);
    }

    // Handle directional button press for movement
    if (interaction.isButton() && ['north', 'south', 'west', 'east'].includes(interaction.customId)) {
      await handleDirectionSelection(interaction);
    }
  } catch (error) {
    console.error('An error occurred in the interaction handler:', error);
  }
});

// Handlers
async function handleLocationsCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const teamData = await getTeamData(); // Fetch team data from Google Sheets
    let locations = 'Current Team Locations:\n';

    teamData.forEach(({ teamName, currentLocation }) => {
      const emoji = getTeamEmoji(teamName); // Fetch team emoji
      locations += `${emoji} ${teamName} is at ${currentLocation}\n`;
    });

    await interaction.editReply({ content: locations });
  } catch (error) {
    console.error('Error fetching team locations:', error);
    await interaction.editReply({ content: 'Failed to fetch team locations.' });
  }
}

async function handleMoveTeamCommand(interaction) {
  const teamSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_team')
    .setPlaceholder('Select a team')
    .addOptions(getTeamOptions()); // Dynamically populate options

  const row = new ActionRowBuilder().addComponents(teamSelectMenu);
  await interaction.reply({
    content: 'Select a team to move:',
    components: [row],
    ephemeral: true,
  });
}

async function handleShowMapCommand(interaction) {
  const selectedTeam = interaction.options.getString('team'); // Get the selected team (optional)
  await interaction.deferReply({ ephemeral: true });

  try {
    const teamData = await getTeamData();
    const filteredTeamData = selectedTeam ? teamData.filter(team => team.teamName === selectedTeam) : teamData;
    const showAllTeams = !selectedTeam; // Flag for showing unexplored tiles for all teams
    const imagePath = await generateMapImage(filteredTeamData, showAllTeams); // Generate the map image
    await interaction.editReply({ files: [imagePath] });
  } catch (error) {
    console.error('Error generating map or fetching data:', error);
    await interaction.editReply({ content: 'Failed to generate the map.' });
  }
}

async function handleTeamSelection(interaction) {
  const selectedTeam = interaction.values[0]; // Get selected team

  const directionButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('north').setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('south').setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('west').setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('east').setLabel('➡️ East').setStyle(ButtonStyle.Primary)
  );

  await interaction.update({
    content: `You selected ${selectedTeam}. Now choose the direction:`,
    components: [directionButtons],
    ephemeral: true,
  });
}

async function handleDirectionSelection(interaction) {
  const selectedDirection = interaction.customId;
  const teamName = interaction.message.content.match(/You selected (.+?)\./)[1];

  try {
    await interaction.deferReply({ ephemeral: true });
    const newTile = calculateNewTile(await getCurrentLocation(teamName), selectedDirection);

    if (!isValidTile(newTile)) {
      return await interaction.editReply({ content: `Invalid tile: ${newTile}.` });
    }

    if (!(await canMoveToTile(newTile))) {
      return await interaction.editReply({ content: `Cannot move to ${newTile} due to hidden requirements.` });
    }

    await updateTeamLocation(teamName, newTile); // Update team's current location
    await updateExploredTiles(teamName, newTile); // Update explored tiles

    await interaction.editReply({ content: `Team ${teamName} moved to ${newTile}.` });
  } catch (error) {
    console.error('Error moving team:', error);
    await interaction.editReply({ content: 'Failed to move the team.' });
  }
}

// Login the bot and register commands
client.once(Events.ClientReady, async () => {
  console.log('Bot is online!');

  // Clear and register commands
  await commandManager.deleteAllGuildCommands(DISCORD_CLIENT_ID, guildId);
  await commandManager.registerCommands(DISCORD_CLIENT_ID, guildId, commands);
});

client.login(DISCORD_TOKEN);
