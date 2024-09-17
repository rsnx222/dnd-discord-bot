// eventActionHandler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logger } = require('./logger');
const { applyPenalty, applyReward } = require('./rewardsPenaltiesHandler');

// Function to handle event forfeiture
async function handleForfeitEvent(interaction, teamName, eventType) {
  const modal = new ModalBuilder()
    .setCustomId(`forfeit_event_modal_${teamName}`)
    .setTitle('Confirm Forfeiture');

  const input = new TextInputBuilder()
    .setCustomId('confirm_forfeit')
    .setLabel('Type "FORFEIT" to confirm')  // Shortened label
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
    .setTitle('Confirm Completion');

  const input = new TextInputBuilder()
    .setCustomId('confirm_complete')
    .setLabel('Type "COMPLETE" to confirm')  // Shortened label
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Function to handle event submission for puzzles
async function handleSubmitPuzzleEvent(interaction, teamName) {
  const modal = new ModalBuilder()
    .setCustomId(`submit_puzzle_modal_${teamName}`)
    .setTitle('Submit Puzzle Answer');

  const input = new TextInputBuilder()
    .setCustomId('submit_answer')
    .setLabel('Enter your answer')  // Shortened label
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Modal interaction handling
async function handleModalSubmit(interaction) {
  const customIdParts = interaction.customId.split('_');
  const action = customIdParts[0];
  const eventType = customIdParts[2];  // Extract event type from customId
  const teamName = customIdParts.pop();

  if (action === 'forfeit') {
    const confirmation = interaction.fields.getTextInputValue('confirm_forfeit').toUpperCase();
    if (confirmation === 'FORFEIT') {
      await applyPenalty(teamName, 'forfeit');
      await interaction.reply({ content: `${teamName} forfeited the ${eventType} and received a penalty.`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Forfeiture not confirmed.', ephemeral: true });
    }
  } else if (action === 'complete') {
    const confirmation = interaction.fields.getTextInputValue('confirm_complete').toUpperCase();
    if (confirmation === 'COMPLETE') {
      await applyReward(teamName, eventType);
      await interaction.reply({ content: `${eventType} successfully completed for ${teamName}. Rewards applied!`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Completion not confirmed.', ephemeral: true });
    }
  } else if (action === 'submit') {
    const answer = interaction.fields.getTextInputValue('submit_answer');
    // Logic to handle puzzle answer submission
    await interaction.reply({ content: `Puzzle answer submitted: ${answer}`, ephemeral: true });
  }
}

module.exports = {
  handleForfeitEvent,
  handleCompleteEvent,
  handleSubmitPuzzleEvent,
  handleModalSubmit,
};
