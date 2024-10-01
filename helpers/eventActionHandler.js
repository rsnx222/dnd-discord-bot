const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logger } = require('./logger');
const { applyPenalty, applyReward } = require('./rewardsPenaltiesHandler');
const { markEventAsCompleted, markEventAsForfeited } = require('./databaseHelper');

// Handle forfeiting an event, with eventIndex
async function handleForfeitEvent(interaction, teamName, eventType, eventIndex) {
  const modal = new ModalBuilder()
    .setCustomId(`forfeit_event_modal_${teamName}_${eventIndex}`)
    .setTitle('Confirm Forfeiture');

  const input = new TextInputBuilder()
    .setCustomId('confirm_forfeit')
    .setLabel('Type "FORFEIT" to confirm')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Handle completing an event, with eventIndex
async function handleCompleteEvent(interaction, teamName, eventType, eventIndex) {
  const modal = new ModalBuilder()
    .setCustomId(`complete_event_modal_${teamName}_${eventIndex}`)
    .setTitle('Confirm Completion');

  const input = new TextInputBuilder()
    .setCustomId('confirm_complete')
    .setLabel('Type "COMPLETE" to confirm')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Handle puzzle submission, with eventIndex
async function handleSubmitPuzzleEvent(interaction, teamName, eventIndex) {
  const modal = new ModalBuilder()
    .setCustomId(`submit_puzzle_modal_${teamName}_${eventIndex}`)
    .setTitle('Submit Puzzle Answer');

  const input = new TextInputBuilder()
    .setCustomId('submit_answer')
    .setLabel('Enter your answer')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

// Handle modal submissions for completion, forfeiture, and puzzle
async function handleModalSubmit(interaction) {
  const { customId } = interaction;
  const customIdParts = customId.split('_');
  const action = customIdParts[0];
  const teamName = customIdParts[customIdParts.length - 2];
  const eventIndex = customIdParts[customIdParts.length - 1];
  const eventType = customIdParts.slice(2, -2).join('_');

  if (action === 'forfeit') {
    const confirmation = interaction.fields.getTextInputValue('confirm_forfeit').toUpperCase();
    if (confirmation === 'FORFEIT') {
      await markEventAsForfeited(teamName, eventType);
      await applyPenalty(teamName, eventType, interaction);
      await interaction.reply({ content: `${teamName} forfeited the ${eventType} and received a penalty.`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Forfeiture not confirmed.', ephemeral: true });
    }
  } else if (action === 'complete') {
    const confirmation = interaction.fields.getTextInputValue('confirm_complete').toUpperCase();
    if (confirmation === 'COMPLETE') {
      await markEventAsCompleted(teamName, eventType);
      await applyReward(teamName, eventType, interaction);
      await interaction.reply({ content: `${eventType} successfully completed for ${teamName}. Rewards applied!`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Completion not confirmed.', ephemeral: true });
    }
  } else if (action === 'submit') {
    const answer = interaction.fields.getTextInputValue('submit_answer');
    const isCorrect = await checkPuzzleAnswer(teamName, eventType, answer);

    if (isCorrect) {
      await markEventAsCompleted(teamName, eventType);
      await applyReward(teamName, eventType, interaction);
      await interaction.reply({ content: `Correct answer! The puzzle event is completed for ${teamName}.`, ephemeral: true });
    } else {
      await applyPenalty(teamName, eventType, interaction);
      await interaction.reply({ content: `Incorrect answer. A penalty has been applied to ${teamName}.`, ephemeral: true });
    }
  }
}

// Check the puzzle answer (implement your own logic)
async function checkPuzzleAnswer(teamName, eventType, answer) {
  const puzzles = require('../config/puzzles'); // Assuming you have this file
  const puzzle = puzzles[eventType];

  if (!puzzle) {
    logger(`No puzzle found for event type: ${eventType}`);
    return false;
  }

  const correctAnswer = puzzle.answer;
  return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

module.exports = {
  handleForfeitEvent,
  handleCompleteEvent,
  handleSubmitPuzzleEvent,
  handleModalSubmit,
};
