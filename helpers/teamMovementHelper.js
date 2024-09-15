// teamMovementHelper.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateEventMessage, handleEventCompletion, handleEventFailure } = require('./eventManager');
const { generateMapImage } = require('./mapGenerator');
const databaseHelper = require('./databaseHelper');
const { isHelper } = require('./permissionHelper');

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

// Function to handle button interactions
async function handleButtonInteraction(interaction) {
  const [action, eventType, teamName] = interaction.customId.split('_');
  const teamData = await databaseHelper.getTeamData();
  const team = teamData.find(t => t.teamName === teamName);

  if (!team) {
    return interaction.reply({ content: `Could not find team ${teamName}`, ephemeral: true });
  }

  const currentTile = team.currentLocation;
  const tileData = await databaseHelper.getTileData(currentTile);
  const eventIndex = tileData.event_type.indexOf(eventType);

  if (action === 'complete') {
    if (!isHelper(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to complete this task.', ephemeral: true });
    }

    const completionMessage = await handleEventCompletion(tileData, eventIndex, team);
    await interaction.channel.send(completionMessage);
    await processNextEvent(teamName, eventIndex + 1, interaction);
  } else if (action === 'forfeit') {
    const failureMessage = await handleEventFailure(tileData, team);
    await interaction.channel.send(failureMessage);
    await processNextEvent(teamName, eventIndex + 1, interaction);
  }
}

// Function to process the next event or move
async function processNextEvent(teamName, eventIndex, interaction) {
  const teamData = await databaseHelper.getTeamData();
  const team = teamData.find(t => t.teamName === teamName);

  if (!team) {
    throw new Error(`Could not find team ${teamName}`);
  }

  const currentTile = team.currentLocation;
  const tileData = await databaseHelper.getTileData(currentTile);

  if (eventIndex < tileData.event_type.length) {
    // Show the next event
    const channelId = await databaseHelper.getTeamChannelId(teamName);
    const channel = await interaction.client.channels.fetch(channelId);
    await sendMapAndEvent(teamName, currentTile, interaction, channel, eventIndex);
  } else {
    // All events completed, prompt for next move
    const channelId = await databaseHelper.getTeamChannelId(teamName);
    const channel = await interaction.client.channels.fetch(channelId);
    const directionButtons = generateEventButtons('choose_direction', teamName, true);
    await channel.send({ content: 'All events completed. Choose your next action.', components: [directionButtons] });
  }
}

// Function to send map and event information to the team channel
async function sendMapAndEvent(selectedTeam, newTile, interaction, channel, eventIndex = 0, isEventCompleted = false) {
  try {
    const tileData = await databaseHelper.getTileData(newTile);
    
    if (!tileData) {
      console.error(`No data found for tile ${newTile}`);
      return interaction.editReply({ content: 'Failed to load the tile data. Please try again later.', ephemeral: true });
    }

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
    await interaction.editReply({ content: 'Failed to send map and event. Please try again later.', ephemeral: true });
  }
}


// Handler for task completion (boss, challenge, etc.)
async function handleCompleteTask(interaction, selectedTeam, tileData, eventIndex) {
  try {
    // Defer reply early to avoid interaction timeout errors
    await interaction.deferReply({ ephemeral: true });

    // Check if the user is a helper/admin
    if (!isHelper(interaction.member)) {
      return interaction.editReply({ content: 'You do not have permission to complete this task.', ephemeral: true });
    }

    // Mark the task as complete (e.g., boss, challenge)
    let completionMessage;
    const eventType = tileData.event_type[eventIndex];

    // Custom handling based on the type of event (boss, challenge, puzzle)
    if (eventType === 'boss') {
      completionMessage = await handleEventCompletion(tileData, eventIndex, selectedTeam); // Handle boss completion
    } else if (eventType === 'challenge') {
      completionMessage = `The challenge has been marked as complete!`;
    } else if (eventType === 'puzzle') {
      completionMessage = `The puzzle has been marked as complete!`;
    } else {
      completionMessage = `The ${eventType} task has been marked as complete!`;
    }

    // Apply any rewards for task completion
    const rewardMessage = await handleEventCompletion(tileData, eventIndex, selectedTeam);

    // Combine task completion and reward messages into one final response
    let finalMessage = `${completionMessage}\n${rewardMessage || 'No rewards earned this time.'}`;

    // Update the event index or move to the next event
    eventIndex++;
    if (eventIndex < tileData.event_type.length) {
      // Send the next event on the tile
      await sendMapAndEvent(selectedTeam, tileData.location, interaction, interaction.channel, eventIndex);
    } else {
      // All events are completed, allow direction choice
      await sendMapAndEvent(selectedTeam, tileData.location, interaction, interaction.channel, eventIndex, true);
    }

    // Send the combined final message as a single update
    await interaction.editReply({ content: finalMessage, ephemeral: true });
  } catch (error) {
    console.error('Error handling task completion:', error);
    await interaction.editReply({ content: 'Failed to complete the task. Please try again later.', ephemeral: true });
  }
}




module.exports = {
  generateEventButtons,
  generateEventEmbed,
  sendMapAndEvent,
  handleButtonInteraction,
  handleCompleteTask,
};
