
// errorHandler.js

const logger = require('./logger');

// Centralized error handling for consistent logging and interaction replies
function handleError(error, interaction, customMessage = 'An error occurred') {
    logger.error(customMessage, error);
    if (interaction) {
        return interaction.editReply({ content: customMessage, ephemeral: true }).catch(err => logger.error('Failed to reply to interaction', err));
    }
}

module.exports = {
    handleError,
};
