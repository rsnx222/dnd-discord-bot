// logger.js

module.exports = {
  log: function (message) {
    console.log(`[LOG] ${message}`);
  },
  
  error: function (message, error = null) {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
