// logger.js

function logError(message, error) {
  console.error(`${message}:`, error);
}

function logInfo(message) {
  console.log(message);
}

module.exports = {
  logError,
  logInfo,
};
