// commands/use_skip_coin.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTeamRewardsPenalties, removeTeamRewardPenalty, getTeamTasks, markTaskAsCompleted } = require('../helpers/databaseHelper');
const { getTeamNameFromInteraction } = require('../helpers/getTeamNameFromInteraction');
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use_skip_coin')
    .setDescription('Use a Skip Coin to complete a task of your choice.'),
  async execute(interaction) {
    const teamName = await getTeamNameFromInteraction(interaction);

    // Check if the team has a 'Skip Coin'
    const rewardsPenalties = await getTeamRewardsPenalties(teamName);
    const hasSkipCoin = rewardsPenalties.some(rp => rp.item_name === 'Skip Coin' && rp.type === 'reward');

    if (!hasSkipCoin) {
      return interaction.reply({ content: 'You do not have a Skip Coin.', ephemeral: true });
    }

    // Fetch the team's current tasks
    const tasks = await getTeamTasks(teamName); // Implement this function in databaseHelper.js

    if (tasks.length === 0) {
      return interaction.reply({ content: 'You have no tasks to skip.', ephemeral: true });
    }

    // Present a selection menu to choose a task
    const taskOptions = tasks.map((task, index) => ({
      label: task.name,
      value: task.id.toString(),
    }));

    const row = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId('select_task_to_skip')
        .setPlaceholder('Select a task to skip')
        .addOptions(taskOptions)
    );

    await interaction.reply({ content: 'Select a task to skip:', components: [row], ephemeral: true });
  },

  async handleComponent(interaction) {
    if (interaction.customId === 'select_task_to_skip') {
      const taskId = interaction.values[0];
      const teamName = await getTeamNameFromInteraction(interaction);

      // Mark the task as completed
      await markTaskAsCompleted(teamName, taskId);

      // Remove the 'Skip Coin' from inventory
      await removeTeamRewardPenalty(teamName, 'Skip Coin');

      await interaction.update({ content: 'You have used a Skip Coin to complete the selected task.', components: [] });
    }
  },
};
