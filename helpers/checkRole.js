// checkRole.js

const ownerId = '839236111054143508'; // Nick's Discord ID

// Centralized role checks for various permissions
function checkRole(member, role) {
    switch(role) {
        case 'owner':
            return isOwner(member);
        case 'admin':
            return isAdmin(member);
        case 'helper':
            return isHelper(member);
        default:
            return false;
    }
}

// Check if the user is the owner
function isOwner(member) {
  return member.id === ownerId;
}

// Check if the user has the 'event-admin' role or is the owner
function isAdmin(member) {
  return isOwner(member) || member.roles.cache.some(role => role.name === 'event-admin');
}

// Check if the user has the 'event-helper' role or is an admin/owner
function isHelper(member) {
  return isAdmin(member) || member.roles.cache.some(role => role.name === 'event-helper');
}

module.exports = {
  isOwner,
  isAdmin,
  isHelper,
  checkRole,
};
