// taskHandler.js

const { logger } = require('../helpers/logger');
const { handleEventCompletion } = require('./eventManager');
const { sendMapAndEvent } = require('./sendMapAndEvent');

// Function to handle task completion for various event types
async function handleCompleteTask(eventType, tileData, eventIndex, selectedTeam, interaction) {
    try {
        let finalMessage = '';

        // Mark the event as complete
        if (eventType === 'puzzle') {
            finalMessage += `The puzzle has been marked as complete!\n`;
        } else {
            finalMessage += `The ${eventType} has been marked as complete!\n`;
        }

        // Apply rewards for task completion
        const rewardMessage = await handleEventCompletion(tileData, eventIndex, selectedTeam);
        if (rewardMessage) {
            finalMessage += `Reward: ${rewardMessage}\n`;
        } else {
            finalMessage += 'No rewards earned this time.\n';
        }

        // Increment event index to move to the next event
        eventIndex++;

        // If more events exist on the tile, trigger the next event
        if (Array.isArray(tileData.event_type) && eventIndex < tileData.event_type.length) {
            await sendMapAndEvent(selectedTeam, tileData.location || 'A5', interaction, interaction.channel, eventIndex);
        } else {
            // All events on this tile are complete, allow direction choice
            if (!tileData.location) {
                logger('Tile location is undefined.');
                return interaction.editReply({ content: 'Error: Tile location is missing. Please contact an admin.', ephemeral: true });
            }
            await sendMapAndEvent(selectedTeam, tileData.location, interaction, interaction.channel, eventIndex, true);
            finalMessage += 'All tasks completed! You can now choose a direction.';
        }

        // Send the final completion message
        await interaction.editReply({ content: finalMessage, ephemeral: true });
    } catch (error) {
        logger('Error handling task completion:', error, interaction);
        await interaction.editReply({ content: 'Failed to complete the task. Please try again later.', ephemeral: true });
    }
}

module.exports = {
    handleCompleteTask,
};
