// movementLogic.js

// Function to calculate the new tile after moving in a direction
function calculateNewTile(currentTile, direction) {
  if (!currentTile || currentTile.length < 2) {
    console.error('Invalid current tile format');
    return null;
  }

  const col = currentTile.charAt(0); // Extract the letter (column)
  const row = parseInt(currentTile.slice(1)); // Extract the number (row)

  if (isNaN(row)) {
    console.error('Invalid row number in the tile');
    return null;
  }

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0); // Convert letter to index (A=0, B=1, etc.)
  let newColIndex = colIndex;
  let newRow = row;

  switch (direction.toLowerCase()) { // Handling case-insensitive direction input
    case 'north': newRow -= 1; break; // Move north (up)
    case 'south': newRow += 1; break; // Move south (down)
    case 'west': newColIndex -= 1; break; // Move west (left)
    case 'east': newColIndex += 1; break; // Move east (right)
    default: 
      console.error('Invalid direction');
      return null;
  }

  // Define boundaries of the map (e.g., A-F columns and 1-10 rows)
  const MIN_COL_INDEX = 0; // Corresponds to 'A'
  const MAX_COL_INDEX = 5; // Corresponds to 'F'
  const MIN_ROW = 1;
  const MAX_ROW = 10;

  if (newColIndex < MIN_COL_INDEX || newColIndex > MAX_COL_INDEX || newRow < MIN_ROW || newRow > MAX_ROW) {
    console.error('New position is out of bounds');
    return null;
  }

  // Convert column index back to a letter (A=0, B=1, etc.)
  const newCol = String.fromCharCode('A'.charCodeAt(0) + newColIndex);

  return `${newCol}${newRow}`; // Return the new tile (e.g., 'C7')
}

// Function to check if the tile is valid
function isValidTile(tile) {
  return tile !== null && /^[A-F][1-9]$|^[A-F]10$/.test(tile); // Ensure tile is a valid format within range (A-F, 1-10)
}

module.exports = {
  calculateNewTile,
  isValidTile,
};
