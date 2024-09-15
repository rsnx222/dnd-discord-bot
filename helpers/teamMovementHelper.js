// teamMovementHelper.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const databaseHelper = require('./databaseHelper');

// Function to generate event buttons based on event type
function generateEventButtons(eventType, teamName) {
  let eventButtons;

  switch (eventType.toLowerCase()) {
    case 'boss':
      eventButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`complete_boss_${teamName}`).setLabel('Mark Boss as Complete').setStyle(ButtonStyle.Success),
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
    case 'transport link':
      eventButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport Link').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
      );
      break;
    case 'quest':
      eventButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`start_quest_${teamName}`).setLabel('Start Quest').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
      );
      break;
    default:
      eventButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`choose_direction_${teamName}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
      );
  }

  return eventButtons;
}

// Function to generate the event embed
function generateEventEmbed(tileData) {
  return new EmbedBuilder()
    .setTitle(`Event: ${tileData.event_type}`)
    .setDescription(tileData.description || 'An event awaits...')
    .setColor('Random');
}

// Function to send map and event information to the team channel
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
      const eventButtons = generateEventButtons(tileData.event_type, selectedTeam);
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
