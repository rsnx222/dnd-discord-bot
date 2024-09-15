const { handleError } = require('../helpers/errorHandler');

// showexploredmap.js

const { SlashCommandBuilder } = require('discord.js');
const { generateMapImage } = require('../helpers/mapGenerator');
const { isAdmin } = require('../helpers/permissionHelper');  // Import the helper check

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showexploredmap')
    .setDescription('Show a fully explored map without any team locations'),

  async execute(interaction) {
    // Check if the user is an helper
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      // Generate the fully explored map (without team icons)
      const imagePath = await generateMapImage([], false);  // Pass an empty array and false to show the fully explored map

      await interaction.editReply({ files: [imagePath] });
    } catch (error) {
      handleError('Error generating explored map:', error);
      await interaction.editReply({ content: 'Failed to generate the explored map.' });
    }
  }
};
