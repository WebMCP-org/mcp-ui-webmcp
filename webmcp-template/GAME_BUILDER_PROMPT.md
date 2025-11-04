# Game Builder Prompt

This document contains a prompt you can use with AI assistants to help scaffold new games in the WebMCP template.

## How to Use

1. Copy the prompt below
2. Paste it to your AI assistant (Claude, etc.)
3. Specify what game you want to build
4. The AI will help scaffold the complete implementation!

## The Prompt

```
I want to build a game using the WebMCP template. The WebMCP template provides:

- A React app in src/App.tsx
- An MCP server in worker/mcpServer.ts
- WebMCP integration via the useWebMCP hook
- Tailwind CSS for styling

Project structure:
- src/App.tsx - Main React component
- src/main.tsx - Entry point (already set up)
- src/index.css - Styles (already has Tailwind)
- worker/mcpServer.ts - MCP server with tools
- worker/index.ts - Worker routing (already set up)

The template pattern is:
1. Build game logic and UI in src/App.tsx
2. Register WebMCP tools with useWebMCP() hook
3. Add an MCP tool in worker/mcpServer.ts to display the game
4. Both UI buttons and WebMCP tools should call the same game logic functions

Requirements:
- Use React hooks for state management
- Use Tailwind CSS for styling
- Register WebMCP tools that allow the AI to interact with the game
- Tools and UI should share the same game logic (single source of truth)
- Include proper error handling and validation
- Make the UI responsive and accessible

Before you start implementing, please ASK ME:
1. What game would you like to build? (e.g., Chess, Connect Four, Wordle, Hangman, Memory, etc.)
2. Any specific requirements or features you want?
3. Should it be single-player, two-player, or AI vs player?

After I tell you what game I want, please:
1. Explain the game rules and implementation plan
2. List the WebMCP tools you'll create
3. Provide the complete implementation for src/App.tsx
4. Provide the updated worker/mcpServer.ts
5. Explain how to test it

Let's start - what game would you like to build?
```

## Example Usage

**User:** "I want to build Connect Four"

**AI:** "Great! Let me help you build Connect Four. Here's the plan:

**Game Rules:**
- 6 rows x 7 columns grid
- Players alternate dropping pieces
- First to get 4 in a row (horizontal, vertical, diagonal) wins

**WebMCP Tools:**
1. `connectfour_get_state` - View board state
2. `connectfour_make_move` - AI makes a move
3. `connectfour_reset` - Start new game

**Implementation:**

[AI provides complete code]

**Testing:**
1. Run `pnpm dev`
2. Ask AI to show the game
3. Make moves via UI and tools
"

## Common Games You Can Build

### Simple Games (Good Starting Points)

1. **Tic-Tac-Toe** (Already in remote-mcp-with-ui-starter!)
   - 3x3 grid, simple win conditions
   - Good for learning the basics

2. **Rock Paper Scissors**
   - Very simple state
   - Good for understanding tool registration

3. **Coin Flip**
   - Minimal state, great starter
   - Focus on styling and animations

### Intermediate Games

4. **Connect Four**
   - 6x7 grid, gravity mechanics
   - Win detection in 4 directions

5. **Memory / Concentration**
   - Card matching game
   - Timer, score tracking

6. **Hangman**
   - Word guessing with lives
   - Letter tracking, ASCII art

7. **Wordle Clone**
   - 5-letter word guessing
   - Color-coded feedback

8. **Minesweeper**
   - Grid with hidden mines
   - Number hints, flagging

### Advanced Games

9. **Chess**
   - Complex rules and piece movement
   - Move validation, check/checkmate
   - Consider using a library like chess.js

10. **Checkers**
    - 8x8 board, piece movement
    - Jumping, kinging

11. **Battleship**
    - Two grids, ship placement
    - Hit/miss tracking

12. **Sudoku**
    - 9x9 grid with constraints
    - Puzzle generation and solving

## Implementation Tips

### Tip 1: Start with State

Define your game state first:

```typescript
interface GameState {
  board: string[][];
  currentPlayer: 'X' | 'O';
  winner: string | null;
  // ...
}

const [gameState, setGameState] = useState<GameState>({ /* ... */ });
```

### Tip 2: Shared Logic

Create functions that both UI and tools call:

```typescript
const makeMove = useCallback((position: number) => {
  // Validation
  if (!isValidMove(position)) {
    throw new Error('Invalid move');
  }

  // Update state
  setGameState(prev => ({
    ...prev,
    board: updateBoard(prev.board, position),
    currentPlayer: switchPlayer(prev.currentPlayer),
  }));

  return 'Move successful';
}, []);

// UI calls it
<button onClick={() => makeMove(5)}>

// Tool calls it
useWebMCP({
  name: 'make_move',
  handler: async ({ position }) => makeMove(position),
});
```

### Tip 3: Good Tool Names

Follow these naming conventions:
- `{game}_get_state` - Read game state
- `{game}_make_move` - Make a move
- `{game}_reset` - Reset game
- `{game}_undo` - Undo last move (optional)

### Tip 4: Rich Responses

Make tool responses informative:

```typescript
useWebMCP({
  name: 'game_make_move',
  handler: async ({ position }) => {
    const result = makeMove(position);

    return `# Move Result

**Position:** ${position}
**Player:** ${currentPlayer}
**Board State:**
\`\`\`
${formatBoard(board)}
\`\`\`
**Status:** ${winner ? `${winner} wins!` : `${nextPlayer}'s turn`}`;
  },
});
```

## Prompt Variations

### For Complete Beginners

"I'm new to WebMCP. Can you help me build a simple game step by step? Please explain each part as you go."

### For Specific Features

"I want to build Chess, but I want these specific features:
- Move history
- Undo/redo
- Time controls
- Save/load games"

### For Learning

"I want to build a game to learn WebMCP patterns. What game would you recommend, and why?"

---

**Ready to build your game?** Copy the prompt above and start building! 🎮
