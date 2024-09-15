
// roleChecks.js

const { isOwner, isAdmin, isHelper } = require('./permissionHelper');

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

module.exports = {
    checkUserPermissions,
};
