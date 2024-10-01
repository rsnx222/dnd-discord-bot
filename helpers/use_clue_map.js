// commands/use_clue_map.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTeamRewardsPenalties, removeTeamRewardPenalty, updateExploredTiles, getTeamData } = require('../helpers/databaseHelper');
const { getTeamNameFromInteraction } = require('../helpers/getTeamNameFromInteraction');
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use_clue_map')
    .setDescription('Use a Clue Map to reveal a hidden tile.')
    .addStringOption(option =>
      option.setName('tile')
        .setDescription('The tile to reveal (e.g., B5)')
        .setRequired(true)),
  async execute(interaction) {
    const teamName = await getTeamNameFromInteraction(interaction);
    const tile = interaction.options.getString('tile').toUpperCase();

    // Validate tile format
    if (!/^[A-F][1-9]$|^[A-F]10$/.test(tile)) {
      return interaction.reply({ content: 'Invalid tile format. Please enter a valid tile (e.g., B5).', ephemeral: true });
    }

    // Check if the team has a 'Clue Map'
    const rewardsPenalties = await getTeamRewardsPenalties(teamName);
    const hasClueMap = rewardsPenalties.some(rp => rp.item_name === 'Clue Map' && rp.type === 'reward');

    if (!hasClueMap) {
      return interaction.reply({ content: 'You do not have a Clue Map.', ephemeral: true });
    }

    // Update the team's explored tiles
    const teamData = await getTeamData();
    const team = teamData.find(t => t.teamName === teamName);
    const updatedExploredTiles = [...new Set([...team.exploredTiles, tile])];
    await updateExploredTiles(teamName, updatedExploredTiles);

    // Remove the 'Clue Map' from inventory
    await removeTeamRewardPenalty(teamName, 'Clue Map');

    // Notify the team
    await interaction.reply({ content: `You have used a Clue Map to reveal tile **${tile}**.`, ephemeral: true });
  },
};
