// Simplified logging and error handler

async function logger(message, error = null, interaction = null) {
  const timestamp = new Date().toISOString();
  const isError = !!error;  // Determine if this is an error based on whether an error object is provided
  const logType = isError ? '[ERROR]' : '[LOG]';

  // Log the message and the error (if provided)
  console[isError ? 'error' : 'log'](`[${timestamp}] ${logType} ${message}`);
  if (isError && error) {
    console.error(error);
  }

  // If interaction is provided, handle the interaction response
  if (interaction) {
    try {
      // Check if the interaction has been deferred or replied to
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message, ephemeral: true });
      } else if (typeof interaction.update === 'function') {
        await interaction.update({ content: message, ephemeral: true });
      } else if (typeof interaction.reply === 'function') {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        console.error(`[${timestamp}] [ERROR] Unsupported interaction type or missing reply function.`);
      }
    } catch (err) {
      console.error(`[${timestamp}] [ERROR] Failed to handle interaction error:`, err);
    }
  }
}

module.exports = {
  logger,
};
