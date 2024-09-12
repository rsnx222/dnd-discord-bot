// showexploredmap.js

const { SlashCommandBuilder } = require('discord.js');
const { generateMapImage } = require('../core/mapGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showexploredmap')
    .setDescription('Show a fully explored map without any team locations'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Generate the fully explored map (without team icons)
      const imagePath = await generateMapImage([], false);  // Pass an empty array and false to show the fully explored map

      await interaction.editReply({ files: [imagePath] });
    } catch (error) {
      console.error('Error generating explored map:', error);
      await interaction.editReply({ content: 'Failed to generate the explored map.' });
    }
  }
};
