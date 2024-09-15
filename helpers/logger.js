// logger.js

function getCurrentTimestamp() {
  const now = new Date();
  return now.toISOString(); // ISO format provides a good standard format
}

module.exports = {
  log: function (message) {
    console.log(`[${getCurrentTimestamp()}] [LOG] ${message}`);
  },
  
  error: function (message, error = null) {
    console.error(`[${getCurrentTimestamp()}] [ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
