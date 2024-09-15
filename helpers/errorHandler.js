// errorHandler.js

const logger = require('./logger');

// Centralized error handling for consistent logging and interaction replies
async function handleError(error, interaction, customMessage = 'An error occurred') {
    logger.error(customMessage, error);

    // Ensure the interaction supports replying/editing (like slash commands and button interactions)
    if (!interaction.isCommand() && !interaction.isButton()) {
        logger.error('Unsupported interaction type');
        return;
    }

    try {
        if (interaction.deferred || interaction.replied) {
            // If interaction was already deferred or replied to, use editReply
            await interaction.editReply({ content: customMessage, ephemeral: true });
        } else if (interaction.isButton()) {
            // For buttons, we use update instead of reply
            await interaction.update({ content: customMessage, ephemeral: true });
        } else {
            // Otherwise, reply to the interaction normally
            await interaction.reply({ content: customMessage, ephemeral: true });
        }
    } catch (err) {
        logger.error('Failed to handle interaction error', err);
    }
}

module.exports = {
    handleError,
};
