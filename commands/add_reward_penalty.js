// commands/add_reward_penalty.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { addTeamRewardPenalty } = require('../helpers/databaseHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_reward_penalty')
    .setDescription('Admin: Add a reward or penalty to a team.')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The team name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Reward or Penalty')
        .setRequired(true)
        .addChoices(
          { name: 'Reward', value: 'reward' },
          { name: 'Penalty', value: 'penalty' }
        ))
    .addStringOption(option =>
      option.setName('item_name')
        .setDescription('Name of the reward or penalty')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description of the reward or penalty')
        .setRequired(false)),
  async execute(interaction) {
    const teamName = interaction.options.getString('team');
    const type = interaction.options.getString('type');
    const itemName = interaction.options.getString('item_name');
    const description = interaction.options.getString('description') || '';

    try {
      await addTeamRewardPenalty(teamName, type, itemName, description);
      await interaction.reply({ content: `${type.charAt(0).toUpperCase() + type.slice(1)} "${itemName}" added to team "${teamName}".`, ephemeral: true });
    } catch (error) {
      logger('Error adding reward/penalty:', error);
      await interaction.reply({ content: 'Failed to add reward or penalty.', ephemeral: true });
    }
  },
};
