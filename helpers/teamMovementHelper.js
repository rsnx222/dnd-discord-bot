// teamMovementHelper.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateEventMessage } = require('./eventManager');
const { generateMapImage } = require('./mapGenerator');
const databaseHelper = require('./databaseHelper');

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
        new ButtonBuilder().setCustomId(`forfeit_quest_${teamName}`).setLabel('Forfeit Quest').setStyle(ButtonStyle.Danger)
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
function generateEventEmbed(tileData, eventIndex = 0) {
  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const eventDescriptions = `${eventTypes[eventIndex]}: ${tileData.description}`;

  return new EmbedBuilder()
    .setTitle(`Event on this tile`)
    .setDescription(eventDescriptions)
    .setColor('Random');
}

// Function to send map and event information to the team channel
async function sendMapAndEvent(selectedTeam, newTile, interaction, channel, eventIndex = 0, isEventCompleted = false) {
  try {
    const tileData = await databaseHelper.getTileData(newTile);
    const eventMessage = generateEventMessage(tileData);

    // Generate updated map
    const teamData = await databaseHelper.getTeamData();
    const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
    const mapImagePath = await generateMapImage(filteredTeamData, false);

    // Send event message and map
    await channel.send(eventMessage);
    await channel.send({ files: [mapImagePath] });

    // Process events sequentially, show one at a time
    const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];

    if (eventIndex < eventTypes.length) {
      // Show the current event with buttons
      const eventEmbed = generateEventEmbed(tileData, eventIndex);
      const eventButtons = generateEventButtons(eventTypes[eventIndex], selectedTeam, isEventCompleted);
      await channel.send({ embeds: [eventEmbed], components: [eventButtons] });
    } else {
      // All events are completed, show direction or transport options
      const directionButtons = generateEventButtons('choose_direction', selectedTeam, true);
      await channel.send({ content: 'All events completed. Choose your next action.', components: [directionButtons] });
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
