// approveRejectScreenshot.js

const { logger } = require('./logger');
const { updateApprovedScreenshots, getApprovedScreenshots, updateApprovedItems } = require('./databaseHelper');

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

      await interaction.reply({ content: `Screenshot approved for ${teamName}. Total approved: ${updatedApproved}/${requiredScreenshots}`, ephemeral: true });

      if (updatedApproved >= requiredScreenshots) {
        await markTaskAsCompleted(teamName, eventName);
        await interaction.followUp({ content: `Event ${eventName} completed for ${teamName}!`, ephemeral: true });
      }

    } else if (requiredItems) {
      currentApproved = await getApprovedItems(teamName, eventName);  // Track item approvals separately
      const updatedApproved = currentApproved + 1;

      await updateApprovedItems(teamName, eventName, updatedApproved);

      await interaction.reply({ content: `Item approved for ${teamName}. Total approved: ${updatedApproved}/${requiredItems}`, ephemeral: true });

      if (updatedApproved >= requiredItems) {
        await markTaskAsCompleted(teamName, eventName);
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

async function rejectScreenshot(interaction, teamName, eventName) {
  try {
    await interaction.reply({ content: `Screenshot rejected for ${teamName}.`, ephemeral: true });
  } catch (error) {
    logger('Error rejecting screenshot:', error);
    await interaction.reply({ content: 'Failed to reject screenshot.', ephemeral: true });
  }
}

module.exports = {
  approveScreenshot,
  rejectScreenshot,
};
