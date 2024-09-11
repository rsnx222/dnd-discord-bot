// movementLogic.js

// Function to calculate the new tile after moving in a direction
function calculateNewTile(currentTile, direction) {
  const col = currentTile.charAt(0);
  const row = parseInt(currentTile.slice(1));

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
  let newColIndex = colIndex;
  let newRow = row;

  switch (direction) {
    case 'north': newRow -= 1; break;
    case 'south': newRow += 1; break;
    case 'west': newColIndex -= 1; break;
    case 'east': newColIndex += 1; break;
    default: 
      console.error('Invalid direction');
      return null;
  }

  if (newColIndex < 0 || newColIndex > 5 || newRow < 1 || newRow > 10) {
    console.error('New position is out of bounds');
    return null;
  }

  return `${String.fromCharCode('A'.charCodeAt(0) + newColIndex)}${newRow}`;
}

function isValidTile(tile) {
  return tile !== null;
}

module.exports = {
  calculateNewTile,
  isValidTile,
};
