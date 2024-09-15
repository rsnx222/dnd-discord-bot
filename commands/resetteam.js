// resetteam.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { generateEventMessage, handleEventCompletion } = require('../helpers/eventManager');
const { generateMapImage } = require('../helpers/mapGenerator');
const teamManager = require('../helpers/teamManager');
const { isOwner } = require('../helpers/permissionHelper');  // Use isOwner for permission check

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetteam')
    .setDescription('Reset the position of a specific team to A5')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Team to reset')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())
    ),  // Dynamically generate team options

  async execute(interaction) {
    if (!isOwner(interaction.user)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');
    const modal = createConfirmationModal(`reset_team_modal_${selectedTeam}`, `confirm_team_name`, `Type the team name (${selectedTeam}) to confirm:`);
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.customId.startsWith('reset_team_modal_')) {
      const selectedTeam = interaction.customId.split('_').pop();  // Extract the team name
      const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');

      // Check if the entered team name matches the selected one
      if (enteredTeamName.toLowerCase() === selectedTeam.toLowerCase()) {
        console.log(`Team name matches. Resetting team ${selectedTeam}.`);

        // Update the team's location and explored tiles
        await databaseHelper.updateTeamLocation(selectedTeam, 'A5');
        await databaseHelper.updateExploredTiles(selectedTeam, ['A5']);

        // Generate the map for the selected team
        const teamData = await databaseHelper.getTeamData();
        const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
        const mapImagePath = await generateMapImage(filteredTeamData, false);

        const channelId = await databaseHelper.getTeamChannelId(selectedTeam);

        if (channelId) {
          const channel = await interaction.client.channels.fetch(channelId);

          if (channel) {
            // Send the map and a welcome message
            const welcomeMessage = `
              Your team wakes up and finds themselves in a strange land... Some things look similar to Gielinor... is this an alternate reality?! 
              You find a crumpled note on the ground - you can barely make out the sentence:
              
              "*I can't believe we're finally here! Gone on ahead of you to the East - I'll meet you at the lair!* - **L**"

              (P.S. The first tile to the east holds a challenge...)
            `;
            await channel.send(welcomeMessage);
            await channel.send({ files: [mapImagePath] });
          }
        }

        // Event completion or penalty logic, if necessary
        const tileData = await databaseHelper.getTileData('A5');
        if (tileData && tileData.event_type) {
          const completionMessage = await handleEventCompletion(tileData, teamData.find(t => t.teamName === selectedTeam));
          await interaction.followUp({ content: completionMessage, ephemeral: true });
        }

        await interaction.editReply({ content: `${selectedTeam} has been reset to A5 with only A5 as explored.`, ephemeral: true });
      } else {
        console.log('Team name mismatch.');
        await interaction.editReply({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
      }
    }
  }
};

// Helper function to create a confirmation modal
function createConfirmationModal(customId, inputId, labelText) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Confirm Reset');

  const textInput = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(labelText)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(textInput);
  modal.addComponents(actionRow);

  return modal;
}
