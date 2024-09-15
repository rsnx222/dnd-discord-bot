// moveteamcoord.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { generateEventMessage, handleEventCompletion } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const teamManager = require('../helpers/teamManager');
const { isHelper } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteamcoord')
    .setDescription('Move a team to a specific tile coordinate')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())
    ),

  async execute(interaction) {
    if (!isHelper(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');

    // Create a modal for entering the tile coordinate
    const modal = new ModalBuilder()
      .setCustomId(`moveteamcoord_${selectedTeam}`)  // Unique customId for modal based on the team
      .setTitle('Enter Tile Coordinate');

    const textInput = new TextInputBuilder()
      .setCustomId('tile_coordinate')  // Ensure the customId matches what is accessed later
      .setLabel('Enter a tile coordinate (e.g., A7)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(textInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);  // Show the modal to the user
  },

  async handleModal(interaction) {
    if (!interaction.customId.startsWith('moveteamcoord_')) return;

    const selectedTeam = interaction.customId.split('_').pop();  // Extract the team name
    const enteredTile = interaction.fields.getTextInputValue('tile_coordinate').toUpperCase();  // Get the tile coordinate

    try {
      await interaction.deferReply({ ephemeral: true });  // Properly defer reply

      // Fetch team data from the database
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team) {
        console.error(`Could not find team data for ${selectedTeam}`);
        throw new Error(`Could not find team data for ${selectedTeam}`);
      }

      // Fetch the tile data and generate the event message
      const tileData = await databaseHelper.getTileData(enteredTile);
      const eventMessage = tileData
        ? generateEventMessage(tileData)
        : `Your team has moved to ${enteredTile}. There doesn't seem to be anything unusual here.`;

      // Update the team's location and explored tiles
      await databaseHelper.updateTeamLocation(selectedTeam, enteredTile);
      const updatedExploredTiles = [...new Set([...team.exploredTiles, enteredTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      // Fetch updated team data and generate the map
      const updatedTeamData = await databaseHelper.getTeamData();
      const filteredTeamData = updatedTeamData.filter(t => t.teamName === selectedTeam);
      const mapImagePath = await generateMapImage(filteredTeamData, false);

      // Fetch team channel and send event and map
      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        // Always send the map to the team's channel after moving
        await channel.send({ files: [mapImagePath] });

        // Send the event message if there's an event on the tile
        await channel.send(eventMessage);

        // Handle the completion and reward logic if there's an event
        if (tileData && tileData.event_type) {
          const completionMessage = await handleEventCompletion(tileData, team);
          await channel.send(completionMessage);
        }
      }

      // Reply with success message
      await interaction.editReply({
        content: `Team ${selectedTeam} moved to ${enteredTile}. The update has been posted to the team's channel.`,
      });

    } catch (error) {
      console.error(`Error handling modal submission for ${selectedTeam}:`, error);
      await interaction.editReply({
        content: 'Failed to move the team. Please try again later.',
      });
    }
  }
};
