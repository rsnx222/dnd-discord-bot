// permissionHelper.js

// Check if the user has the 'event-admin' role
function isAdmin(user) {
  return user.roles.cache.some(role => role.name === 'event-admin');
}

// Check if the user is the owner
function isOwner(user) {
  const ownerId = '839236111054143508'; // Nick's Discord ID
  return user.id === ownerId;
}

module.exports = {
  isAdmin,
  isOwner, // Export the new function
};
