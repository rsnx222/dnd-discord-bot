// tiles.js

module.exports = {
  "tiles": {
    "B1": {
      "event": "quest",
      "description": "You find yourself at the edge of a bustling town. A local points you to the east, where a legendary dungeon awaits.",
      "event_type": "quest",
      "reward": "Map Fragment (reveals a secret route to a hidden dungeon)",
      "penalty": "The next puzzle you encounter will be more difficult."
    },
    "C1": {
      "event": "challenge",
      "description": "An arena of legendary warriors awaits you. Only the strongest can survive the challenge ahead.",
      "event_type": "challenge",
      "reward": "Combat Boost (the next boss fight will be easier)",
      "penalty": "A mysterious curse makes the next puzzle more complex."
    },
    "D1": {
      "event": "dungeon",
      "description": "The entrance to an ancient dungeon looms before you. Inside lies the key to unlocking further secrets.",
      "event_type": "dungeon",
      "reward": "Dungeon Key (unlocks access to the next region)",
      "penalty": "Lose access to the transport link for one turn."
    },
    "C2": {
      "event": "boss",
      "description": "An ominous figure blocks your path. Defeat this boss to gain access to new regions.",
      "event_type": "boss",
      "reward": "Boss Drop (required to progress to the final region)",
      "penalty": "The team’s movement is restricted to westward tiles."
    },
    "D2": {
      "event": "boss",
      "description": "A fearsome beast guards this territory. Only through defeating it can you progress.",
      "event_type": "boss",
      "reward": "Golden Amulet (grants the ability to bypass a challenge)",
      "penalty": "Your team is blocked from moving north."
    },
    "B3": {
      "event": "boss",
      "description": "A powerful boss resides here, known for its dangerous attacks. Defeat it to collect the necessary drop.",
      "event_type": "boss",
      "reward": "Mystic Artifact (used to unlock a hidden tile)",
      "penalty": "The next boss encounter will be more difficult."
    },
    "C3": {
      "event": "transport",
      "description": "A shimmering portal connects this area to a distant part of the island.",
      "event_type": "transport",
      "reward": "Teleportation Rune (can be used to skip one transport tile)",
      "penalty": "The portal malfunctions and sends you back to a previous tile."
    },
    // Continue defining other tiles...
  }
};
