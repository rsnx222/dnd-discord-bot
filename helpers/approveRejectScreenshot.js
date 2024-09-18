// approveRejectScreenshot.js

const { logger } = require('./logger');
const { updateApprovedScreenshots, markEventAsCompleted, getApprovedScreenshots } = require('./databaseHelper');

// Helper to fetch event data from tiles.js based on event name
function getEventData(eventName) {
  const event = tiles.find(tile => tile.eventName === eventName);
  return event ? event : null;
}

// Approve screenshot based on event requirements (items or screenshots)
async function approveScreenshot(interaction, teamName, eventName) {
  try {
    const eventData = getEventData(eventName);  // Fetch event data from tiles.js
    const { requiredItems, requiredScreenshots } = eventData;

    let currentApproved;

    if (requiredScreenshots) {
      currentApproved = await getApprovedScreenshots(teamName, eventName);
      const updatedApproved = currentApproved + 1;

      await updateApprovedScreenshots(teamName, eventName, updatedApproved);

      // Add tick emoji to the original message
      await interaction.targetMessage.react('✅');

      await interaction.reply({ content: `Screenshot approved for ${teamName}. Total approved: ${updatedApproved}/${requiredScreenshots}`, ephemeral: true });

      if (updatedApproved >= requiredScreenshots) {
        await markEventAsCompleted(teamName, eventName);
        await interaction.followUp({ content: `Event ${eventName} completed for ${teamName}!`, ephemeral: true });
      }

    } else if (requiredItems) {
      currentApproved = await getApprovedItems(teamName, eventName);  // Track item approvals separately
      const updatedApproved = currentApproved + 1;

      await updateApprovedItems(teamName, eventName, updatedApproved);

      // Add tick emoji to the original message
      await interaction.targetMessage.react('✅');

      await interaction.reply({ content: `Item approved for ${teamName}. Total approved: ${updatedApproved}/${requiredItems}`, ephemeral: true });

      if (updatedApproved >= requiredItems) {
        await markEventAsCompleted(teamName, eventName);
        await interaction.followUp({ content: `Event ${eventName} completed for ${teamName}!`, ephemeral: true });
      }
    } else {
      await interaction.reply({ content: `No specific requirements found for this event.`, ephemeral: true });
    }

  } catch (error) {
    logger('Error approving screenshot:', error);
    await interaction.reply({ content: 'Failed to approve screenshot.', ephemeral: true });
  }
}

// Reject screenshot and respond with cross emoji
async function rejectScreenshot(interaction, teamName, eventName) {
  try {
    // Add cross emoji to the original message
    await interaction.targetMessage.react('❌');

    await interaction.reply({ content: `Screenshot rejected for ${teamName} in event ${eventName}.`, ephemeral: true });
  } catch (error) {
    logger('Error rejecting screenshot:', error);
    await interaction.reply({ content: 'Failed to reject screenshot.', ephemeral: true });
  }
}

module.exports = {
  approveScreenshot,
  rejectScreenshot,
};
