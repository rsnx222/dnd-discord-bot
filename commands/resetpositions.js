// resetpositions.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { isOwner } = require('../helpers/permissionHelper');
const { generateMapImage } = require('../core/mapGenerator');

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName('resetposition')
      .setDescription('Reset the position of a specific team to A5')
      .addStringOption(option =>
        option.setName('team')
          .setDescription('Team to reset')
          .setRequired(true)
          .addChoices(...teamManager.getTeamOptions())),

    new SlashCommandBuilder()
      .setName('resetallpositions')
      .setDescription('Reset all team positions to A5')
  ],

  async execute(interaction) {
    // Check if the user is the owner
    if (!isOwner(interaction.user)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    // Handling the resetposition command
    if (interaction.commandName === 'resetposition') {
      const selectedTeam = interaction.options.getString('team');
      const modal = createConfirmationModal(`reset_team_modal_${selectedTeam}`, 'confirm_team_name', `Type the team name (${selectedTeam}) to confirm:`);
      await interaction.showModal(modal);
    
    // Handling the resetallpositions command
    } else if (interaction.commandName === 'resetallpositions') {
      const modal = createConfirmationModal('reset_all_teams_modal', 'confirm_reset_all', `Type "confirm" to reset all teams to A5`);
      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    // Log the customId to see which modal was submitted
    console.log(`Modal submitted: ${interaction.customId}`);
    await interaction.deferReply({ ephemeral: true });

    // Modal for resetting a specific team
    if (interaction.customId.startsWith('reset_team_modal_')) {
      const selectedTeam = interaction.customId.split('_').pop();  // Extract the team name
      const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');
      
      console.log(`Selected Team: ${selectedTeam}, Entered Team Name: ${enteredTeamName}`);

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
            // Send the cryptic, fun, welcoming message after the map is updated
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

        // Respond to the user once everything is completed
        await interaction.followUp({ content: `${selectedTeam} has been reset to A5 with only A5 as explored.`, ephemeral: true });
      } else {
        console.log('Team name mismatch.');
        await interaction.followUp({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
      }

    // Modal for resetting all teams
    } else if (interaction.customId === 'reset_all_teams_modal') {
      const confirmationText = interaction.fields.getTextInputValue('confirm_reset_all');
      console.log(`Reset all confirmation: ${confirmationText}`);

      // Check if the entered text is 'confirm'
      if (confirmationText.toLowerCase() === 'confirm') {
        const teamData = await databaseHelper.getTeamData();

        // Reset all teams to A5 and set explored tiles to ['A5']
        for (const team of teamData) {
          await databaseHelper.updateTeamLocation(team.teamName, 'A5');
          await databaseHelper.updateExploredTiles(team.teamName, ['A5']);

          // Generate the map for each team after the location is updated
          const filteredTeamData = teamData.filter(t => t.teamName === team.teamName);
          const mapImagePath = await generateMapImage(filteredTeamData, false);

          const channelId = await databaseHelper.getTeamChannelId(team.teamName);

          if (channelId) {
            const channel = await interaction.client.channels.fetch(channelId);

            if (channel) {
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
        }

        // Respond to the user after all teams are reset
        await interaction.followUp({ content: 'All teams have been reset to A5 with only A5 as explored.', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'Confirmation failed. You did not type "confirm".', ephemeral: true });
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
    .setCustomId(inputId)  // Ensure this ID matches what is retrieved in handleModal
    .setLabel(labelText)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(textInput);
  modal.addComponents(actionRow);

  return modal;
}
