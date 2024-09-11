// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper'); // Use the new database helper
const { calculateNewTile } = require('../core/movementLogic'); // Import the movement logic
const { generateEventMessage } = require('../core/storylineManager'); // Import the message generator
const { generateMapImage } = require('../core/mapGenerator'); // Import the map generator

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction'),

  async execute(interaction) {
    try {
      // Fetch team data from the database
      const teamData = await databaseHelper.getTeamData();

      // Generate team options for the select menu
      const teamSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_team')
        .setPlaceholder('Select a team')
        .addOptions(teamData.map(team => ({
          label: team.teamName,  // Make sure you're using 'teamName' as per database structure
          value: team.teamName,
        })));

      const row = new ActionRowBuilder().addComponents(teamSelectMenu);

      await interaction.reply({
        content: 'Select a team to move:',
        components: [row],
        ephemeral: true,
      });

    } catch (error) {
      console.error('Error generating team select menu:', error);
      await interaction.reply({
        content: 'Failed to load teams. Please try again later.',
        ephemeral: true,
      });
    }
  },

  // Handle team selection from the select menu
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'select_team') {
      const selectedTeam = interaction.values[0]; // Get the selected team

      // Generate buttons for movement directions
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
  },

  // Handle direction button press
  async handleButton(interaction) {
    const direction = interaction.customId; // 'north', 'south', 'east', or 'west'
    const teamNameMatch = interaction.message.content.match(/You selected (.+?)\./);

    if (!teamNameMatch) {
      console.error('Could not extract team name from message content.');
      await interaction.reply({
        content: 'Failed to determine the team. Please try again.',
        ephemeral: true,
      });
      return;
    }

    const teamName = teamNameMatch[1]; // Extracted team name

    try {
      // Fetch the team's current location from the database
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === teamName);

      if (!team || !team.currentLocation) {
        throw new Error(`Could not find current location for team ${teamName}`);
      }

      const currentLocation = team.currentLocation; // Now we have the team's current location

      // Calculate the new tile based on the direction
      const newTile = calculateNewTile(currentLocation, direction);

      if (!newTile) {
        await interaction.reply({
          content: 'Invalid move. The team cannot move in that direction.',
          ephemeral: true,
        });
        return;
      }

      // Fetch the new tile data from the database
      const tileData = await databaseHelper.getTileData(newTile);

      // Generate the event message
      const eventMessage = tileData ? generateEventMessage(tileData) : `Your team moved ${direction} to ${newTile}. Looking out on the area you don’t see anything alarming so you set up camp and rest up...`;

      // Update the team's location in the database
      await databaseHelper.updateTeamLocation(teamName, newTile);

      // Generate and send the map image
      const mapImagePath = await generateMapImage(teamData, false); // Pass false to show only the moving team's location

      // Fetch the team's channel ID
      const channelId = await databaseHelper.getTeamChannelId(teamName);

      if (!channelId) {
        await interaction.reply({
          content: 'Failed to find the team’s channel. Please contact the event organizer.',
          ephemeral: true,
        });
        return;
      }

      // Send the message and map image to the team’s channel
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        await channel.send(eventMessage);
        await channel.send({ files: [mapImagePath] });
      } else {
        await interaction.reply({
          content: 'Failed to fetch the team’s channel. Please contact the event organizer.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: `Team ${teamName} moved ${direction} to ${newTile}.`,
        ephemeral: true,
      });

    } catch (error) {
      console.error(`Error moving team ${teamName}:`, error);
      await interaction.reply({
        content: 'Failed to move the team. Please try again later.',
        ephemeral: true,
      });
    }
  }
};
