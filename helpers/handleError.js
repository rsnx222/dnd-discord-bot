// handleError.js

const logger = require('./logger');

// Centralized error handling for consistent logging and interaction replies
async function handleError(error, interaction, customMessage = 'An error occurred') {
    logger.error(customMessage, error);

    try {
        // Log the interaction type and its available methods for debugging
        logger.error('Interaction type:', interaction.constructor.name);
        logger.error('Interaction methods:', Object.keys(interaction));

        // Check if the interaction has been deferred or replied to
        if (interaction.deferred || interaction.replied) {
            // If already replied, use editReply to update the message
            await interaction.editReply({ content: customMessage, ephemeral: true });
        } else if (typeof interaction.update === 'function') {
            // For interactions like buttons, use update instead of reply
            await interaction.update({ content: customMessage, ephemeral: true });
        } else if (typeof interaction.reply === 'function') {
            // Otherwise, use reply if available
            await interaction.reply({ content: customMessage, ephemeral: true });
        } else {
            // Log an error if interaction is unsupported or missing reply function
            logger.error('Unsupported interaction type or missing reply function');
        }
    } catch (err) {
        logger.error('Failed to handle interaction error', err);
    }
}

module.exports = {
    handleError,
};
