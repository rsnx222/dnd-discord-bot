
// eventButtonHelper.js

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Function to generate event buttons based on event type
function generateEventButtons(eventType, teamName, isEventCompleted = false) {
    if (isEventCompleted) {
        // Show the "Choose Direction" or "Use Transport" buttons after events are completed
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
        );
    }

    // Event-specific buttons
    let eventButtons;
    switch (eventType.toLowerCase()) {
        case 'boss':
            eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`complete_boss_${teamName}`).setLabel('Mark Task as Complete').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_boss_${teamName}`).setLabel('Forfeit Boss').setStyle(ButtonStyle.Danger)
            );
            break;
        case 'challenge':
            eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`complete_challenge_${teamName}`).setLabel('Complete Challenge').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_challenge_${teamName}`).setLabel('Forfeit Challenge').setStyle(ButtonStyle.Danger)
            );
            break;
        case 'puzzle':
            eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit_puzzle_${teamName}`).setLabel('Submit Puzzle Answer').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_puzzle_${teamName}`).setLabel('Forfeit Puzzle').setStyle(ButtonStyle.Danger)
            );
            break;
        default:
            console.error('Unknown event type for button generation.');
    }

    return eventButtons;
}

module.exports = {
    generateEventButtons,
};
