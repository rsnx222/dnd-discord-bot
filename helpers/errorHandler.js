// errorHandler.js

const logger = require('./logger');

// Centralized error handling for consistent logging and interaction replies
async function handleError(error, interaction, customMessage = 'An error occurred') {
    logger.error(customMessage, error);
    if (interaction && interaction.deferred || interaction.replied) {
        // If interaction was already deferred or replied to, use editReply
        return interaction.editReply({ content: customMessage, ephemeral: true }).catch(err => logger.error('Failed to reply to interaction', err));
    } else {
        // Otherwise, reply to the interaction normally
        return interaction.reply({ content: customMessage, ephemeral: true }).catch(err => logger.error('Failed to reply to interaction', err));
    }
}

module.exports = {
    handleError,
};
