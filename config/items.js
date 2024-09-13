// items.js

smodule.exports = {
  "boosts": {
    "coinOfLuck": {
      "name": "Coin of Luck",
      "effect": "Skip tile requirements.",
      "description": "This enchanted coin can be flipped to avoid a tile’s requirement. There is a 50% chance it will succeed, granting the team a free pass."
    },
    "crystalOfInsight": {
      "name": "Crystal of Insight",
      "effect": "Reveal the solution to a puzzle.",
      "description": "A glowing crystal that reveals the solution to the next puzzle encountered. Best used when the team is stuck."
    },
    "amuletOfResilience": {
      "name": "Amulet of Resilience",
      "effect": "Prevent the next penalty.",
      "description": "This protective amulet shields the team from any one penalty, whether from failing a puzzle, combat, or a trap."
    },
    "teleportScroll": {
      "name": "Teleport Scroll",
      "effect": "Move to any unlocked tile.",
      "description": "A powerful scroll that allows the team to teleport to any previously explored tile, bypassing movement restrictions."
    },
    "mapFragment": {
      "name": "Map Fragment",
      "effect": "Reveal adjacent tiles.",
      "description": "An ancient piece of the map that shows the team what lies on the adjacent tiles, giving them a strategic advantage."
    },
    "elixirOfSpeed": {
      "name": "Elixir of Speed",
      "effect": "Extra movement turn.",
      "description": "A mystical elixir that allows the team to move again immediately, speeding up their progress across the map."
    }
  },
  "penalties": {
    "timeDelay": {
      "name": "Time Delay",
      "effect": "Lose 1-3 turns.",
      "description": "The team is stuck on this tile for 1-3 turns, losing precious time to explore and progress across the map."
    },
    "trapOfConfusion": {
      "name": "Trap of Confusion",
      "effect": "Move back to the previous tile.",
      "description": "A magical trap ensnares the team, sending them back to the last tile they explored, losing their progress."
    },
    "curseOfTheLost": {
      "name": "Curse of the Lost",
      "effect": "Lock an adjacent tile for several turns.",
      "description": "A powerful curse renders one of the unexplored adjacent tiles impassable for the next few turns, preventing further exploration."
    },
    "deathsToll": {
      "name": "Death's Toll",
      "effect": "Lose one collected reward.",
      "description": "An unfortunate incident results in the team losing one of their hard-earned rewards, diminishing their strategic advantage."
    },
    "teleportationTrap": {
      "name": "Teleportation Trap",
      "effect": "Random teleport to an unexplored tile.",
      "description": "A teleportation trap sends the team to a random unexplored tile, throwing off their plans and potentially putting them in danger."
    },
    "weakenedSpirit": {
      "name": "Weakened Spirit",
      "effect": "Limit movement to adjacent tiles for 3 turns.",
      "description": "After a major setback, the team's movement is limited to adjacent tiles for the next three turns, slowing their exploration."
    }
  }
};
