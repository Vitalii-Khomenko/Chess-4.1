# Browser-Based Chess Game

A fully functional chess game that runs in a web browser, featuring all standard chess rules including check and checkmate, with a brown-themed chessboard.

## Features

- Complete chess game logic with all rules implemented:
  - Regular piece movements
  - Special moves (castling, en passant, pawn promotion)
  - Check and checkmate detection
  - Stalemate detection
- Brown-themed chessboard with proper piece visualization
- Game controls:
  - New game button
  - Undo move functionality
- Move history display with standard chess notation
- Captured pieces display
- AI opponent with adjustable difficulty levels (1-4)

## Project Structure

- **index.html**: Main HTML file containing the layout for the chess game
- **styles.css**: CSS styles for the game, including the brown-themed chessboard
- **chess.js**: Core logic of the chess game, including the Chess class that handles game rules
- **stockfish.js**: AI opponent logic, with support for the Stockfish chess engine
- **ui.js**: User interface and event handling

## How to Play

1. Open `index.html` in a web browser
2. The game starts with white to move (player)
3. Click on a piece to select it, then click on a highlighted square to move
4. The AI will automatically make a move after you
5. Use the "New Game" button to start a new game
6. Use the "Undo Move" button to take back moves

## AI Opponent

The game includes an AI opponent with four difficulty levels:

- **Level 1**: Beginner level, makes basic moves
- **Level 2**: Intermediate level, slightly more challenging
- **Level 3**: Advanced level, more strategic play
- **Level 4**: Expert level, provides a good challenge

The AI uses either the Stockfish chess engine (if available) or a random move generator as a fallback.

## Running the Game

The game can be run directly in a browser by opening the `index.html` file. No internet connection is required after the initial load.

For development purposes, you can use a local server:

```
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Browser Compatibility

The game works in all modern browsers, including:
- Chrome
- Firefox
- Edge
- Safari

## License

This project is open source and available for personal and educational use.
http://localhost:8000
