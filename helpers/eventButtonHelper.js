const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../helpers/logger');

// Function to generate event buttons based on event type
function generateEventButtons(eventTypes, teamName, isEventCompleted = false) {
    const eventTypeArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes]; // Handle multiple event types
    const eventButtons = new ActionRowBuilder();

    if (isEventCompleted) {
        // If all events are completed, handle transport link or direction
        if (eventTypeArray.includes('transport link')) {
            eventButtons.addComponents(
                new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport').setStyle(ButtonStyle.Secondary)
            );
        } else {
            // Show "Choose Direction" when no transport links are present
            eventButtons.addComponents(
                new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
            );
        }
        return eventButtons;
    }

    // Event-specific buttons for incomplete events
    eventTypeArray.forEach(eventType => {
        if (typeof eventType === 'string') {  // Check if eventType is defined and is a string
            switch (eventType.toLowerCase()) {
                case 'boss':
                    eventButtons.addComponents(
                        new ButtonBuilder().setCustomId(`forfeit_boss_${teamName}`).setLabel('Forfeit Boss').setStyle(ButtonStyle.Danger)
                    );
                    break;
                case 'challenge':
                    eventButtons.addComponents(
                        new ButtonBuilder().setCustomId(`forfeit_challenge_${teamName}`).setLabel('Forfeit Challenge').setStyle(ButtonStyle.Danger)
                    );
                    break;
                case 'puzzle':
                    eventButtons.addComponents(
                        new ButtonBuilder().setCustomId(`submit_puzzle_${teamName}`).setLabel('Submit Puzzle Answer').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`forfeit_puzzle_${teamName}`).setLabel('Forfeit Puzzle').setStyle(ButtonStyle.Danger)
                    );
                    break;
                case 'quest':
                    eventButtons.addComponents(
                        new ButtonBuilder().setCustomId(`start_quest_${teamName}`).setLabel('Start Quest').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`ignore_quest_${teamName}`).setLabel('Ignore Quest').setStyle(ButtonStyle.Secondary)
                    );
                    break;
                case 'transport link':
                    eventButtons.addComponents(
                        new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport Link').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`ignore_transport_${teamName}`).setLabel('Ignore Transport Link').setStyle(ButtonStyle.Secondary)
                    );
                    break;
                default:
                    logger(`Unknown event type for button generation: ${eventType}`);
            }
        } else {
            logger(`Invalid event type: ${eventType}`);
        }
    });

    // Ensure the number of components is within the limit of 1-5
    if (eventButtons.components.length > 5) {
        logger('Too many buttons generated. Trimming to 5 buttons.');
        eventButtons.components = eventButtons.components.slice(0, 5); // Trim to 5 components if exceeded
    }

    return eventButtons;
}

module.exports = {
    generateEventButtons,
};
