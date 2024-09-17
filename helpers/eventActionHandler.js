// eventActionsHandler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logger } = require('./logger');
const { applyPenalty, applyReward } = require('./rewardsPenaltiesHandler');

// Function to handle event forfeiture
async function handleForfeitEvent(interaction, teamName, eventType) {
  const modal = new ModalBuilder()
    .setCustomId(`forfeit_event_modal_${teamName}`)
    .setTitle('Confirm Event Forfeiture');

  const input = new TextInputBuilder()
    .setCustomId('confirm_forfeit')
    .setLabel(`Type "FORFEIT" to confirm forfeiture of the ${eventType}`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Function to handle event completion by an Event Helper
async function handleCompleteEvent(interaction, teamName, eventType) {
  const modal = new ModalBuilder()
    .setCustomId(`complete_event_modal_${teamName}`)
    .setTitle('Confirm Event Completion');

  const input = new TextInputBuilder()
    .setCustomId('confirm_complete')
    .setLabel(`Type "COMPLETE" to confirm the completion of the ${eventType}`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Modal interaction handling
async function handleModalSubmit(interaction) {
  const teamName = interaction.customId.split('_').pop();
  const action = interaction.customId.split('_')[0];

  if (action === 'forfeit') {
    const confirmation = interaction.fields.getTextInputValue('confirm_forfeit').toUpperCase();
    if (confirmation === 'FORFEIT') {
      await applyPenalty(teamName, 'forfeit');
      await interaction.reply({ content: `${teamName} forfeited the event and received a penalty.`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Forfeiture not confirmed.', ephemeral: true });
    }
  } else if (action === 'complete') {
    const confirmation = interaction.fields.getTextInputValue('confirm_complete').toUpperCase();
    if (confirmation === 'COMPLETE') {
      await applyReward(teamName, eventType);
      await interaction.reply({ content: `Event successfully completed for ${teamName}. Rewards applied!`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Completion not confirmed.', ephemeral: true });
    }
  }
}

module.exports = {
  handleForfeitEvent,
  handleCompleteEvent,
  handleModalSubmit,
};
