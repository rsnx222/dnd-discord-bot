// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleDirectionMove } = require('../helpers/movementLogic');  // Import the new handler
const { getTeams } = require('../helpers/getTeams');
const { logger } = require('../helpers/logger');
const { checkRole } = require('../helpers/checkRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...getTeams())
    ),

  async execute(interaction) {
    if (!checkRole(interaction.member, 'admin')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const selectedTeam = interaction.options.getString('team');

      // Present direction buttons for the selected team
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`north_${selectedTeam}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`south_${selectedTeam}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`west_${selectedTeam}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`east_${selectedTeam}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        content: `You selected ${selectedTeam}. Choose a direction to move:`,
        components: [directionButtons],
      });
    } catch (error) {
      logger('Error handling movement options:', error, interaction);
      await interaction.editReply({ content: 'Failed to handle the command. Please try again later.' });
    }
  },

  async handleButton(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();
    const direction = interaction.customId.split('_')[0];  // Extract the direction (north, south, west, east)

    // Use the refactored `handleDirectionMove` function from movementLogic.js
    if (['north', 'south', 'west', 'east'].includes(direction)) {
      await handleDirectionMove(interaction, selectedTeam, direction);  // Delegate movement handling
    } else if (direction === 'complete') {
      // Task completion logic (if applicable)
      // If you need to complete a task, implement that here
    }
  }
};
