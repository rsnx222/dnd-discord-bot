// permissionHelper.js

// Check if the user has the 'event-helper' role
function isHelper(user) {
  return user.roles.cache.some(role => role.name === 'event-helper');
}

// Check if the user is the owner
function isOwner(user) {
  const ownerId = '839236111054143508'; // Nick's Discord ID
  return user.id === ownerId;
}

module.exports = {
  isHelper,
  isOwner, // Export the new function
};
