# Dungeon Delight Dash - Battle Simulator

This document provides a detailed overview of the `BattleSimulator.tsx` component, a comprehensive tool for simulating turn-based combat scenarios between two teams of players.

## Overview

The Battle Simulator is a React-based single-page application that allows users to select two teams from the database and pit them against each other. It dynamically calculates player stats based on equipped artifact set bonuses, allows for turn-based actions (attacking), and provides a live log of all events.

## Features

*   **Team Selection**: Select any two distinct teams from the database to simulate a battle.
*   **Dynamic Stat Calculation**: Player stats (Health, Attack, Defense) are automatically calculated at the start of the battle, factoring in complex bonuses from equipped artifact sets.
*   **Artifact Set Bonuses**: The system correctly applies 2-piece and 4-piece set bonuses, including self-buffs (e.g., "Gains ATK +50") and team-wide buffs (e.g., "increases allies' ATK by 15%").
*   **Turn-based Combat**: Select an attacker from one team and a defender from the other to simulate an action.
*   **Damage Preview**: Before committing to an attack, the UI displays a detailed breakdown of the damage calculation, including the effects of any special bonuses like defense penetration.
*   **Live Battle Log**: All actions, including attacks and manual entries, are recorded in a chronological battle log.
*   **Interactive Stat Management**: Manually adjust any player's current Health and Mana via input fields on their card for flexible "what-if" scenarios.
*   **Team Summaries**: View aggregated and average stats for each team to quickly assess their overall power.

## Architecture & Core Logic

The entire simulation is encapsulated within the `BattleCalculator` component.

### Data Flow

1.  **Fetch Data**: On initial load, the component fetches all `teams` (with their `players`) and the entire `inventory` from the Supabase database.
2.  **Team Selection**: The user selects two teams. This triggers the main calculation and setup process.
3.  **Calculate Final Stats**: For each player on the selected teams, the `calculateFinalStats` function is run. This is a critical step that:
    *   Checks the player's `equipped_artifacts`.
    *   Cross-references them with the `inventory` to count pieces from each artifact set.
    *   Applies stat modifications from active 2-set and 4-set bonuses. It correctly handles both self-buffs and buffs that affect allies.
    *   The result is a "final stats" version of each player.
4.  **Initialize Battle State**: The players with their final stats are used to create the "battle state," where each player is also given `currentHealth` and `currentMana` properties, initialized to their maximums.
5.  **User Interaction**:
    *   The user clicks on a player to select them as an `attacker`.
    *   The user clicks on another player to select them as a `defender`.
6.  **Damage Calculation**: A `useEffect` hook observes the `attackerId` and `defenderId`. When both are set, it calculates the potential damage, factoring in the attacker's final ATK and the defender's final DEF, as well as any special effects (like the Lion's Set 4-piece defense ignore).
7.  **Perform Attack**: When the "Perform Attack" button is clicked, the calculated damage is subtracted from the defender's `currentHealth`, a message is added to the battle log, and the attacker/defender selections are reset for the next turn.

### Key Functions

*   `calculateFinalStats(player, teamPlayers, inventory)`: The engine for applying artifact set bonuses. It parses the bonus descriptions (e.g., "Gains ATK +50") using regular expressions to determine the stat, value, and target.
*   `getActiveSetBonuses(player, inventory)`: A helper function that determines which 2-piece and 4-piece bonuses are active for a given player.
*   `handlePlayerClick(player)`: Manages the state for selecting and deselecting attackers and defenders.
*   `handlePerformAttack()`: Applies the final damage to the defender and logs the action.

### Components

*   **`BattleCalculator`**: The main component that holds all state and logic.
*   **`PlayerCard`**: A sub-component responsible for displaying a single player's information, including their final stats, current HP/MP bars, and selection highlight (attacker/defender).
*   **`TeamSummaryCard`**: A display card showing the aggregate and average stats for a team.

## Areas for Improvement & Future Development

While the simulator is functional, the following areas could be improved for better maintainability and extensibility.

### 1. Refactor Artifact Set Logic

The current implementation in `calculateFinalStats` relies on parsing natural language strings with regular expressions to determine stat effects.

**Problem**: This is brittle. A small typo or change in the description text in the `artifactSets` object (e.g., changing "ATK +50" to "ATK + 50") will break the calculation logic.

**Solution**: Refactor the `artifactSets` object to be a structured data format. Instead of a string, the bonus should be an object or an array of effect objects.

**Example:**

```javascript
// Instead of this:
"2-set": "Gains ATK +50"

// Use this:
"2-set": {
  description: "Gains ATK +50",
  effects: [
    { stat: 'attack', value: 50, type: 'flat', target: 'self' }
  ]
}
```

This would make the `calculateFinalStats` function much more robust, readable, and easier to extend with new types of effects.

### 2. Add Skill Functionality

The simulator currently only supports basic attacks. The next logical step is to implement the usage of equipped skills.

**Implementation Steps:**

1.  Fetch the `skills` table from Supabase.
2.  In `PlayerCard`, display the skills listed in the player's `equipped_skills` array.
3.  Add a "Use" button for each skill, which is enabled only if the player is the selected attacker and has enough mana.
4.  Create a `handleUseSkill` function that applies the skill's effect (e.g., damage, healing, buffs), subtracts the mana cost, and logs the action.
5.  Implement a tracking system (e.g., a `usedSkills` state array) to ensure skills can only be used once per battle.

### 3. Component and Logic Separation

The `BattleSimulator.tsx` file is very large. To improve maintainability, the core logic could be extracted into custom hooks or utility files.

*   **`useBattleState.ts`**: A custom hook to manage the state for teams, players, selections, and logs.
*   **`utils/stat-calculator.ts`**: A utility file to house the `calculateFinalStats` and `getActiveSetBonuses` functions.

By separating concerns, the main `BattleCalculator` component would become much cleaner and focused solely on rendering the UI and handling user events.

---