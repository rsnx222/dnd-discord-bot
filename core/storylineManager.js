// storylineManager.js

function generateEventMessage(tileData) {
  if (!tileData || !tileData.event_type) {
    return 'You have arrived at a new tile, but there is no information available about it.';
  }

  switch (tileData.event_type.toLowerCase()) {
    case 'quest':
      return `You have discovered a quest on this tile. ${tileData.description}`;
    case 'challenge':
      return `Prepare yourself! This tile contains a challenge: ${tileData.description}`;
    case 'boss':
      return `A fearsome boss awaits on this tile. ${tileData.description}`;
    case 'dungeon':
      return `You have entered a dungeon. Beware of what lies ahead: ${tileData.description}`;
    case 'transport link':
      return `This tile has a transport link. ${tileData.description}`;
    default:
      return `You have encountered something on this tile: ${tileData.description}`;
  }
}

module.exports = {
  generateEventMessage,
};