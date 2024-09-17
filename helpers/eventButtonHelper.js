// eventButtonHelper.js

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../helpers/logger');

// Function to generate event buttons based on event type
function generateEventButtons(eventTypes, teamName, isEventCompleted = false) {
    const eventTypeArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes]; // Handle multiple event types

    if (isEventCompleted || eventTypeArray.every(type => type === 'transport link')) {
        // Show "Choose Direction" or "Use Transport" button only if events are completed or if the tile only has transport
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport').setStyle(ButtonStyle.Secondary)
        );
    }

    // Event-specific buttons for incomplete events
    const eventButtons = new ActionRowBuilder();

    eventTypeArray.forEach(eventType => {
        switch (eventType.toLowerCase()) {
            case 'boss':
                eventButtons.addComponents(
                    new ButtonBuilder().setCustomId(`complete_boss_${teamName}`).setLabel('Mark Boss as Complete').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`forfeit_boss_${teamName}`).setLabel('Forfeit Boss').setStyle(ButtonStyle.Danger)
                );
                break;
            case 'challenge':
                eventButtons.addComponents(
                    new ButtonBuilder().setCustomId(`complete_challenge_${teamName}`).setLabel('Complete Challenge').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`forfeit_challenge_${teamName}`).setLabel('Forfeit Challenge').setStyle(ButtonStyle.Danger)
                );
                break;
            case 'puzzle':
                eventButtons.addComponents(
                    new ButtonBuilder().setCustomId(`submit_puzzle_${teamName}`).setLabel('Submit Puzzle Answer').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`forfeit_puzzle_${teamName}`).setLabel('Forfeit Puzzle').setStyle(ButtonStyle.Danger)
                );
                break;
            default:
                logger(`Unknown event type for button generation: ${eventType}`);
        }
    });

    return eventButtons;
}

module.exports = {
    generateEventButtons,
};
