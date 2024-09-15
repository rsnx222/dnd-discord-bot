// permissionHelper.js

const ownerId = '839236111054143508'; // Nick's Discord ID

// Check if the user is the owner
function checkUserPermissions(user) {
  return user.id === ownerId;
}

// Check if the user has the 'event-admin' role or is the owner
function checkUserPermissions(user) {
  return checkUserPermissions(user) || user.roles.cache.some(role => role.name === 'event-admin');
}

// Check if the user has the 'event-helper' role or is an admin/owner
function checkUserPermissions(user) {
  return checkUserPermissions(user) || user.roles.cache.some(role => role.name === 'event-helper');
}

module.exports = {
  checkUserPermissions,
  checkUserPermissions,
  checkUserPermissions,
};
