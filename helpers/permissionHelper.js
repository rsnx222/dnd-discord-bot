// permissionHelper.js

function isAdmin(user) {
  return user.roles.cache.some(role => role.name === 'event-admin');
}

module.exports = {
  isAdmin,
};
