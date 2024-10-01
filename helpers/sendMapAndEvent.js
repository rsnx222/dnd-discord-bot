// sendMapAndEvent.js

const { generateMapImage } = require('./mapGenerator');
const { generateEventButtons } = require('./eventButtonHelper');
const { getTeamData, getEventProgressStatus, getTeamRewardsPenalties, removeTeamRewardPenalty, markEventAsCompleted } = require('./databaseHelper');
const { logger } = require('./logger');
const tiles = require('../config/tiles');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to generate the message for the current event/task
async function generateEventMessage(teamName, tileData, eventIndex = 0, interaction) {
  const events = tileData.tasks || [tileData]; // Support for both tasks array and single event
  const currentTask = events[eventIndex];

  if (!currentTask) {
    return 'You have completed all events on this tile.';
  }

  let message = `**You have encountered a ${currentTask.event_type} event on this tile.**`;

  if (currentTask.description) {
    message += `\n\n**${currentTask.description}**`;
  }

  if (currentTask.task) {
    message += `\n\n> **Task:** ${currentTask.task}`;
  }

  const rewardsPenalties = await getTeamRewardsPenalties(teamName);
  const hasSwiftBoots = rewardsPenalties.some(rp => rp.item_name === 'Swift Boots' && rp.event_type === 'reward');

  if (hasSwiftBoots) {
    await markEventAsCompleted(teamName, tileData.tile);
    await removeTeamRewardPenalty(teamName, 'Swift Boots');
    message += `\n\n**Your 'Swift Boots' have auto-completed the event on this tile!**`;
  }

  return message;
}

async function sendMapAndEvent(teamName, newTile, interaction, channel, eventIndex = 0, isEventComplete = false, teamData = null) {
  try {
    if (!newTile || typeof newTile !== 'string' || newTile.length < 2) {
      logger('Invalid tile format detected:', newTile);
      await interaction.editReply({ content: 'Invalid tile format detected. Please check the movement logic.' });
      return;
    }

    logger(`sendMapAndEvent called for team ${teamName}, tile ${newTile}`);

    // If teamData is null, fetch the team data
    if (!teamData) {
      teamData = await getTeamData(teamName); // Fetch the specific team data
      if (!teamData) {
        throw new Error(`No team data found for team ${teamName}`);
      }
    }

    const mapImagePath = await generateMapImage([teamData], false);

    // Fetch the tileData from the tiles.js config file
    const tileData = tiles[newTile];
    if (!tileData) {
      logger(`No tile data found for tile: ${newTile}`);
      await interaction.editReply({ content: 'No data available for this tile.' });
      return;
    }

    // Handle reset event early before checking for tasks
    if (tileData.event_type === 'reset') {
      await channel.send({
        content: `**Team ${teamName} has been transported to a strange new land reminiscent of Gielinor.**\n\nAfter a mysterious force reset your progress, you find yourselves back at the starting point, ${newTile}. The air is thick with mystery, and the land before you is vast and untamed.`,
      });
      await channel.send({
        files: [{ attachment: mapImagePath, name: 'map.png' }],
      });
      await channel.send({
        content: `Choose a direction to begin your journey:`,
        components: [createDirectionButtons(teamName)],
      });
      await interaction.editReply({ content: `Team ${teamName} reset.` });
      return;
    }

    // Handle empty tiles with no events
    if ((!tileData.tasks || tileData.tasks.length === 0) && !tileData.task) {
      const directionButtons = createDirectionButtons(teamName);
      await channel.send({
        content: `You've arrived at an empty tile... your team takes the opportunity to set up camp and rest. When ready, select your next direction!`,
        components: [directionButtons],
      });

      await interaction.editReply({ content: `No events on this tile. Choose your next direction.` });
      return;
    }

    // Send the map first
    await channel.send({
      files: [{ attachment: mapImagePath, name: 'map.png' }],
      content: `Team ${teamName} has moved to tile ${newTile}.`,
    });

    logger(`Map generated for team ${teamName} at tile ${newTile}, image path: ${mapImagePath}`);

    // Handle events
    const events = tileData.tasks || [{ ...tileData }];
    for (const event of events) {
      const eventType = event.event_type;

      // Check if the tile has a transport link event and prompt for usage
      if (eventType === 'transport') {
        const transportDestination = event.destination;
        if (transportDestination) {
          logger(`Transport link found on tile ${newTile}. Offering choice to use or ignore.`);
          
          const transportButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`use_transport_${teamName}`).setLabel('Use Transport').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`ignore_transport_${teamName}`).setLabel('Ignore Transport').setStyle(ButtonStyle.Secondary)
          );
          
          await channel.send({
            content: `You have discovered a transport link on tile ${newTile}. Would you like to use it to travel to ${transportDestination}?`,
            components: [transportButtons]
          });

          await interaction.editReply({ content: 'Transport link found. Choose your option.' });
          return; // Exit to wait for the player's decision on the transport
        }
      }

      const eventStatus = await getEventProgressStatus(teamName, newTile);
      if (eventStatus !== 'completed' && !isEventComplete) {
        const eventMessage = await generateEventMessage(teamName, tileData, eventIndex, interaction);
        await channel.send(`Event starts for team ${teamName} at tile ${newTile}!\n\n${eventMessage}\n\n`);

        const eventButtons = generateEventButtons(eventType, teamName, false);

        // Add a forfeit button for boss tasks
        if (eventType === 'boss') {
          const forfeitButton = new ButtonBuilder()
            .setCustomId(`forfeit_${teamName}_${eventIndex}`)
            .setLabel('Forfeit')
            .setStyle(ButtonStyle.Danger);
          eventButtons.addComponents(forfeitButton);
        }

        if (eventButtons.components.length > 0) {
          await channel.send({ components: [eventButtons] });
        }

        await interaction.editReply({ content: `Complete the task before proceeding.` });
        return; // Exit after handling the first incomplete event
      }
    }

    // All events completed, show direction buttons
    const directionButtons = createDirectionButtons(teamName);
    await channel.send({
      content: 'Choose a direction to move:',
      components: [directionButtons],
    });
    await interaction.editReply({ content: `Map and event sent for team ${teamName} at tile ${newTile}.` });

  } catch (error) {
    logger(`Error sending map and event for team ${teamName} at tile ${newTile}:`, error);
    await interaction.editReply({ content: 'Failed to send the map and event. Please try again later.' });
  }
}

// Create direction buttons for the user to choose movement
function createDirectionButtons(teamName) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
  );
}

module.exports = {
  sendMapAndEvent,
  createDirectionButtons,
};
