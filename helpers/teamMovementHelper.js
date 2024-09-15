// teamMovementHelper.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const databaseHelper = require('./databaseHelper');

// Function to generate event buttons for multiple event types
function generateEventButtons(eventTypes, teamName) {
  const buttons = [];

  eventTypes.forEach(eventType => {
    let eventButtons;

    switch (eventType.toLowerCase()) {
      case 'boss':
        eventButtons = new ButtonBuilder().setCustomId(`complete_boss_${teamName}`).setLabel('Mark Boss as Complete').setStyle(ButtonStyle.Success);
        buttons.push(eventButtons);
        buttons.push(new ButtonBuilder().setCustomId(`forfeit_boss_${teamName}`).setLabel('Forfeit Boss').setStyle(ButtonStyle.Danger));
        break;
      case 'challenge':
        eventButtons = new ButtonBuilder().setCustomId(`complete_challenge_${teamName}`).setLabel('Complete Challenge').setStyle(ButtonStyle.Success);
        buttons.push(eventButtons);
        buttons.push(new ButtonBuilder().setCustomId(`forfeit_challenge_${teamName}`).setLabel('Forfeit Challenge').setStyle(ButtonStyle.Danger));
        break;
      case 'puzzle':
        eventButtons = new ButtonBuilder().setCustomId(`submit_puzzle_${teamName}`).setLabel('Submit Puzzle Answer').setStyle(ButtonStyle.Success);
        buttons.push(eventButtons);
        buttons.push(new ButtonBuilder().setCustomId(`forfeit_puzzle_${teamName}`).setLabel('Forfeit Puzzle').setStyle(ButtonStyle.Danger));
        break;
      case 'transport link':
        eventButtons = new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport Link').setStyle(ButtonStyle.Success);
        buttons.push(eventButtons);
        buttons.push(new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary));
        break;
      case 'quest':
        eventButtons = new ButtonBuilder().setCustomId(`start_quest_${teamName}`).setLabel('Start Quest').setStyle(ButtonStyle.Success);
        buttons.push(eventButtons);
        buttons.push(new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary));
        break;
      default:
        buttons.push(new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary));
    }
  });

  const actionRows = new ActionRowBuilder().addComponents(buttons);
  return actionRows;
}

// Function to generate the event embed for multiple events
function generateEventEmbed(tileData) {
  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const eventDescriptions = eventTypes.map(eventType => `${eventType}: ${tileData.description}`);

  return new EmbedBuilder()
    .setTitle(`Events on this tile`)
    .setDescription(eventDescriptions.join('\n'))
    .setColor('Random');
}

// Function to send map and event information to the team channel for multiple events
async function sendMapAndEvent(selectedTeam, newTile, interaction, channel) {
  try {
    const tileData = await databaseHelper.getTileData(newTile);
    const eventMessage = generateEventMessage(tileData);

    // Generate updated map
    const teamData = await databaseHelper.getTeamData();
    const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
    const mapImagePath = await generateMapImage(filteredTeamData, false);

    // Send event message, map, and buttons
    await channel.send(eventMessage);
    await channel.send({ files: [mapImagePath] });

    if (tileData && tileData.event_type) {
      const eventEmbed = generateEventEmbed(tileData);
      const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
      const eventButtons = generateEventButtons(eventTypes, selectedTeam);
      await channel.send({ embeds: [eventEmbed], components: [eventButtons] });
    }

    await interaction.editReply({
      content: `Team ${selectedTeam} moved to ${newTile}. The update has been posted to the team's channel.`,
    });
  } catch (error) {
    console.error('Error sending map and event:', error);
    throw error;
  }
}

module.exports = {
  generateEventButtons,
  generateEventEmbed,
  sendMapAndEvent,
};
