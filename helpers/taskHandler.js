
// taskHandler.js

const { handleError } = require('../helpers/errorHandler');
const { handleEventCompletion } = require('./eventManager');

// Function to handle task completion for various event types
async function handleCompleteTask(eventType, tileData, eventIndex, selectedTeam, interaction) {
    try {
        let finalMessage = '';

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

        eventIndex++;
        if (Array.isArray(tileData.event_type) && eventIndex < tileData.event_type.length) {
            // Send the next event on the tile
            await sendMapAndEvent(selectedTeam, tileData.location || 'A5', interaction, interaction.channel, eventIndex);
        } else {
            // All events are completed, allow direction choice
            if (!tileData.location) {
                handleError('Tile location is undefined.');
                return interaction.editReply({ content: 'Error: Tile location is missing. Please contact an admin.', ephemeral: true });
            }
            await sendMapAndEvent(selectedTeam, tileData.location, interaction, interaction.channel, eventIndex, true);
            finalMessage += 'All tasks completed! You can now choose a direction.';
        }

        await interaction.editReply({ content: finalMessage, ephemeral: true });
    } catch (error) {
        handleError('Error handling task completion:', error);
        await interaction.editReply({ content: 'Failed to complete the task. Please try again later.', ephemeral: true });
    }
}

module.exports = {
    handleCompleteTask,
};
