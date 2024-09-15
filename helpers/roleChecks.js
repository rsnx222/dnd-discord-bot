
// roleChecks.js

const { checkUserPermissions, checkUserPermissions, checkUserPermissions } = require('./permissionHelper');

// Centralized role checks for various permissions
function checkUserPermissions(user, role) {
    switch(role) {
        case 'owner':
            return checkUserPermissions(user);
        case 'admin':
            return checkUserPermissions(user);
        case 'helper':
            return checkUserPermissions(user);
        default:
            return false;
    }
}

module.exports = {
    checkUserPermissions,
};
