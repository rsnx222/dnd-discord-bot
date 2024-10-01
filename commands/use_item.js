// commands/use_item.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTeamRewardsPenalties, removeTeamRewardPenalty, getTeamChannelId } = require('../helpers/databaseHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use_item')
    .setDescription('Use a one-off item from your inventory.')
    .addStringOption(option =>
      option.setName('item_name')
        .setDescription('The name of the item to use')
        .setRequired(true)),
  async execute(interaction) {
    const teamName = await getTeamNameFromInteraction(interaction);
    const itemName = interaction.options.getString('item_name');

    try {
      // Get team's items
      const rewardsPenalties = await getTeamRewardsPenalties(teamName);
      const item = rewardsPenalties.find(rp => rp.item_name === itemName && rp.type === 'reward');

      if (!item) {
        return await interaction.reply({ content: 'You do not have that item or it has already been used.', ephemeral: true });
      }

      // Apply item effect
      await applyItemEffect(teamName, item, interaction.client);

      // Remove the item from the team's inventory
      await removeTeamRewardPenalty(teamName, itemName);

      await interaction.reply({ content: `You have used ${itemName}.`, ephemeral: true });
    } catch (error) {
      logger('Error using item:', error);
      await interaction.reply({ content: 'Failed to use item.', ephemeral: true });
    }
  },
};

async function applyItemEffect(teamName, item, client) {
  switch (item.item_name) {
    case 'Skip Coin':
      // Logic to skip an event requirement
      break;
    case 'Clue Map':
      // Logic to reveal a hidden tile
      break;
    // Add cases for other items
    default:
      logger(`No effect implemented for item: ${item.item_name}`);
  }
}

// Helper function to get team name from interaction
async function getTeamNameFromInteraction(interaction) {
  // Implement logic to determine team name based on interaction
  // This may involve checking channel IDs or user roles
  // For now, return a placeholder
  return 'TeamNamePlaceholder';
}
