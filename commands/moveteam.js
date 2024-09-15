// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { calculateNewTile } = require('../core/movementLogic');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { isHelper } = require('../helpers/permissionHelper');
const { sendMapAndEvent } = require('../helpers/teamMovementHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
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

    const directionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`north_${selectedTeam}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`south_${selectedTeam}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`west_${selectedTeam}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`east_${selectedTeam}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `You selected ${selectedTeam}. Choose a direction to move:`,
      components: [directionButtons],
      ephemeral: true,
    });
  },

  async handleButton(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();
    const direction = interaction.customId.split('_')[0];

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      const currentLocation = team.currentLocation;
      const newTile = calculateNewTile(currentLocation, direction);

      if (!newTile) {
        return interaction.editReply({ content: 'Invalid move. The team cannot move in that direction.' });
      }

      await databaseHelper.updateTeamLocation(selectedTeam, newTile);
      const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      await sendMapAndEvent(selectedTeam, newTile, interaction, channel);
    } catch (error) {
      console.error(`Error moving team ${selectedTeam}:`, error);
      await interaction.editReply({ content: 'Failed to move the team. Please try again later.' });
    }
  },
};
