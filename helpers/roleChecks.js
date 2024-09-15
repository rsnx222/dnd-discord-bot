// roleChecks.js

const ownerId = '839236111054143508'; // Nick's Discord ID

// Centralized role checks for various permissions
function checkUserPermissions(user, role) {
    switch(role) {
        case 'owner':
            return isOwner(user);
        case 'admin':
            return isAdmin(user);
        case 'helper':
            return isHelper(user);
        default:
            return false;
    }
}

// Check if the user is the owner
function isOwner(user) {
  return user.id === ownerId;
}

// Check if the user has the 'event-admin' role or is the owner
function isAdmin(user) {
  return isOwner(user) || user.roles.cache.some(role => role.name === 'event-admin');
}

// Check if the user has the 'event-helper' role or is an admin/owner
function isHelper(user) {
  return isAdmin(user) || user.roles.cache.some(role => role.name === 'event-helper');
}

module.exports = {
  isOwner,
  isAdmin,
  isHelper,
  checkUserPermissions,
};
