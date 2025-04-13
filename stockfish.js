/**
 * Chess AI Engine
 * 
 * Enhanced minimax algorithm with alpha-beta pruning for chess AI
 */
class ChessAI {
    constructor() {
        this.difficulty = 4; // Default difficulty level (1-4)
        
        // Piece values for evaluation
        this.pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };
        
        // Position value modifiers for each piece type
        this.positionValues = {
            'pawn': [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            'knight': [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            'bishop': [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5,  5,  5,  5,  5,-10],
                [-10,  0,  5,  0,  0,  5,  0,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            'rook': [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            'queen': [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            'king': [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ],
            // Endgame king position values - encourage king to move to center in endgame
            'king_endgame': [
                [-50,-40,-30,-20,-20,-30,-40,-50],
                [-30,-20,-10,  0,  0,-10,-20,-30],
                [-30,-10, 20, 30, 30, 20,-10,-30],
                [-30,-10, 30, 40, 40, 30,-10,-30],
                [-30,-10, 30, 40, 40, 30,-10,-30],
                [-30,-10, 20, 30, 30, 20,-10,-30],
                [-30,-30,  0,  0,  0,  0,-30,-30],
                [-50,-30,-30,-30,-30,-30,-30,-50]
            ]
        };
        
        // Center squares for center control evaluation
        this.centerSquares = [
            {row: 3, col: 3}, {row: 3, col: 4},
            {row: 4, col: 3}, {row: 4, col: 4}
        ];
        
        // Extended center squares
        this.extendedCenterSquares = [
            {row: 2, col: 2}, {row: 2, col: 3}, {row: 2, col: 4}, {row: 2, col: 5},
            {row: 3, col: 2}, {row: 3, col: 5},
            {row: 4, col: 2}, {row: 4, col: 5},
            {row: 5, col: 2}, {row: 5, col: 3}, {row: 5, col: 4}, {row: 5, col: 5}
        ];
        
        // Development pieces (for opening evaluation)
        this.developmentPieces = ['knight', 'bishop'];
    }
    
    // Set the difficulty level (1-4)
    setDifficulty(level) {
        this.difficulty = Math.max(1, Math.min(4, parseInt(level) || 4));
        console.log(`AI difficulty set to level ${this.difficulty}`);
    }
    
    // Make a move for the AI
    makeMove(onMove) {
        if (!onMove) return;
        
        // Get reference to the chess instance from the UI
        let chessUI = null;
        
        // Try different ways to get the chess instance
        const container = document.querySelector('.container');
        if (container && container.__chessUI) {
            chessUI = container.__chessUI;
        } else if (document.__chessUI) {
            chessUI = document.__chessUI;
        }
        
        if (!chessUI || !chessUI.chess) {
            console.error('Could not find chess instance for AI move');
            // Signal to the UI that we couldn't make a move
            onMove(null, null, null);
            return;
        }
        
        const chess = chessUI.chess;
        
        // Add a small delay to simulate "thinking"
        setTimeout(() => {
            const bestMove = this.findBestMove(chess);
            if (bestMove) {
                onMove({ row: bestMove.fromRow, col: bestMove.fromCol }, { row: bestMove.toRow, col: bestMove.toCol }, bestMove.promotion);
            } else {
                this.makeRandomMove(onMove);
            }
        }, 1000);
    }
    
    // Find the best move using minimax with alpha-beta pruning
    findBestMove(chess) {
        // Get all possible moves
        const moves = this.getAllPossibleMoves(chess);
        
        if (moves.length === 0) return null;
        
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Set depth based on difficulty
        let depth = 3;
        switch (this.difficulty) {
            case 1: depth = 3; break;
            case 2: depth = 4; break;
            case 3: depth = 5; break;
            case 4: depth = 6; break;
        }

        // Проверяем наличие прямого мата
        for (const move of moves) {
            const chessCopy = this.copyChessState(chess);
            chessCopy.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotion);
            
            // Проверяем мат после хода
            if (this.isCheckmate(chessCopy, chess.currentPlayer === 'white' ? 'black' : 'white')) {
                return move;
            }
        }
        
        // Evaluate each move
        for (const move of moves) {
            // Create a copy of the chess game
            const chessCopy = this.copyChessState(chess);
            
            // Make the move
            chessCopy.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotion);
            
            // Evaluate the position using minimax
            const score = this.minimax(chessCopy, depth - 1, -Infinity, Infinity, false, chess.currentPlayer);
            
            // Update best move if this move is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // Fallback to random move if minimax fails
    makeRandomMove(onMove) {
        if (!onMove) return;
        
        // Get reference to the chess instance from the UI
        let chessUI = null;
        
        // Try different ways to get the chess instance
        const container = document.querySelector('.container');
        if (container && container.__chessUI) {
            chessUI = container.__chessUI;
        } else if (document.__chessUI) {
            chessUI = document.__chessUI;
        }
        
        if (!chessUI || !chessUI.chess) {
            console.error('Could not find chess instance for random move');
            // Signal to the UI that we couldn't make a move
            onMove(null, null, null);
            return;
        }
        
        const chess = chessUI.chess;
        console.log('Making random move');
        
        // Find all pieces of the current player that have valid moves
        const validPieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && piece.color === chess.currentPlayer) {
                    const moves = chess.getValidMoves(row, col);
                    if (moves.length > 0) {
                        validPieces.push({
                            row,
                            col,
                            moves
                        });
                    }
                }
            }
        }
        
        if (validPieces.length > 0) {
            // Select a random piece
            const randomPieceIndex = Math.floor(Math.random() * validPieces.length);
            const randomPiece = validPieces[randomPieceIndex];
            
            // Select a random move for that piece
            const randomMoveIndex = Math.floor(Math.random() * randomPiece.moves.length);
            const randomMove = randomPiece.moves[randomMoveIndex];
            
            // Make the move
            onMove(
                { row: randomPiece.row, col: randomPiece.col },
                { row: randomMove.row, col: randomMove.col },
                null
            );
        } else {
            // No valid moves
            onMove(null, null, null);
        }
    }
    
    // Находит позицию короля заданного цвета
    findKing(chess, color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    // Create a deep copy of the chess game state
    copyChessState(chess) {
        // Create a new Chess instance
        const copy = new Chess();
        
        // Copy board state
        copy.board = JSON.parse(JSON.stringify(chess.board));
        
        // Copy game state
        copy.currentPlayer = chess.currentPlayer;
        copy.check = chess.check;
        copy.checkmate = chess.checkmate;
        copy.stalemate = chess.stalemate;
        
        // Copy castling rights
        copy.castlingRights = JSON.parse(JSON.stringify(chess.castlingRights));
        
        // Copy move history
        copy.moveHistory = [...chess.moveHistory];
        
        return copy;
    }
    
    // Evaluate the board position for a given player
    evaluateBoard(chess, color) {
        let score = 0;
        let materialScore = 0;
        let positionScore = 0;
        let mobilityScore = 0;
        let centerControlScore = 0;
        let developmentScore = 0;
        let kingSafetyScore = 0;
        
        // Подсчитываем материал
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    if (piece.color === color) {
                        materialScore += value;
                    } else {
                        materialScore -= value;
                    }
                }
            }
        }
        
        // Оцениваем позиции фигур
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece) {
                    const value = this.positionValues[piece.type][piece.color === 'white' ? row : 7 - row][col];
                    if (piece.color === color) {
                        positionScore += value;
                    } else {
                        positionScore -= value;
                    }
                }
            }
        }
        
        // Оцениваем мобильность (количество возможных ходов)
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && piece.color === color) {
                    const moves = chess.getValidMoves(row, col);
                    mobilityScore += moves.length * 10;
                }
            }
        }
        
        // Оцениваем контроль центра
        for (const square of this.centerSquares) {
            const piece = chess.getPiece(square.row, square.col);
            if (piece && piece.color === color) {
                centerControlScore += 30;
            }
        }
        
        // Оцениваем развитие фигур в дебюте
        if (this.isOpening(chess)) {
            for (const pieceType of this.developmentPieces) {
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = chess.getPiece(row, col);
                        if (piece && piece.type === pieceType && piece.color === color) {
                            if (piece.color === 'white' && row < 6) {
                                developmentScore += 50;
                            } else if (piece.color === 'black' && row > 1) {
                                developmentScore += 50;
                            }
                        }
                    }
                }
            }
        }
        
        // Оцениваем безопасность короля
        const king = this.findKing(chess, color);
        if (king) {
            const kingMoves = chess.getValidMoves(king.row, king.col);
            kingSafetyScore += kingMoves.length * 20;
            
            // Штраф за открытые линии перед королем
            if (chess.isInCheck(color)) {
                kingSafetyScore -= 100;
            }
        }
        
        // Комбинируем все оценки с весами
        score = materialScore * 1.0 +
                positionScore * 0.3 +
                mobilityScore * 0.1 +
                centerControlScore * 0.2 +
                developmentScore * 0.2 +
                kingSafetyScore * 0.3;
        
        return score;
    }
    
    // Minimax algorithm with alpha-beta pruning
    minimax(chess, depth, alpha, beta, maximizingPlayer, color) {
        // Base case: if depth is 0 or game is over, evaluate the board
        if (depth === 0 || chess.checkmate || chess.stalemate) {
            return this.evaluateBoard(chess, color);
        }
        
        // Get all possible moves
        const moves = this.getAllPossibleMoves(chess);
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                // Create a copy of the chess game
                const chessCopy = this.copyChessState(chess);
                
                // Make the move
                chessCopy.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotion);
                
                // Recursively evaluate the position
                const evalScore = this.minimax(chessCopy, depth - 1, alpha, beta, false, color);
                
                // Update max evaluation
                maxEval = Math.max(maxEval, evalScore);
                
                // Update alpha
                alpha = Math.max(alpha, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                // Create a copy of the chess game
                const chessCopy = this.copyChessState(chess);
                
                // Make the move
                chessCopy.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotion);
                
                // Recursively evaluate the position
                const evalScore = this.minimax(chessCopy, depth - 1, alpha, beta, true, color);
                
                // Update min evaluation
                minEval = Math.min(minEval, evalScore);
                
                // Update beta
                beta = Math.min(beta, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            return minEval;
        }
    }
    
    // Helper function to determine if the game is in the opening phase
    isOpening(chess) {
        // Count the number of developed pieces
        let developedPieces = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && this.developmentPieces.includes(piece.type)) {
                    // Check if piece has moved from its starting position
                    const startRow = piece.color === 'white' ? 7 : 0;
                    const startCol = piece.type === 'knight' ? (col === 1 || col === 6 ? col : -1) : (col === 2 || col === 5 ? col : -1);
                    
                    if (startRow !== -1 && startCol !== -1 && (row !== startRow || col !== startCol)) {
                        developedPieces++;
                    }
                }
            }
        }
        
        // Also count the number of moves made
        const moveCount = chess.moveHistory.length;
        
        // Consider it opening if less than 10 moves have been made and not all pieces are developed
        return moveCount < 20 && developedPieces < 6;
    }
    
    // Helper function to determine if the game is in the endgame phase
    isEndgame(chess) {
        let whiteMaterial = 0;
        let blackMaterial = 0;
        
        // Count material for each side
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && piece.type !== 'king' && piece.type !== 'pawn') {
                    if (piece.color === 'white') {
                        whiteMaterial += this.pieceValues[piece.type];
                    } else {
                        blackMaterial += this.pieceValues[piece.type];
                    }
                }
            }
        }
        
        // Consider it endgame if either side has less than a rook + bishop worth of material
        return whiteMaterial < 830 || blackMaterial < 830;
    }
    
    // Get all possible moves for the current player
    getAllPossibleMoves(chess) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                
                if (piece && piece.color === chess.currentPlayer) {
                    const validMoves = chess.getValidMoves(row, col);
                    
                    for (const move of validMoves) {
                        // Check for pawn promotion
                        if (piece.type === 'pawn' && 
                            ((piece.color === 'white' && move.row === 0) || 
                             (piece.color === 'black' && move.row === 7))) {
                            // Add all promotion options
                            for (const promotion of ['queen', 'rook', 'bishop', 'knight']) {
                                moves.push({
                                    fromRow: row,
                                    fromCol: col,
                                    toRow: move.row,
                                    toCol: move.col,
                                    promotion: promotion
                                });
                            }
                        } else {
                            moves.push({
                                fromRow: row,
                                fromCol: col,
                                toRow: move.row,
                                toCol: move.col,
                                promotion: null
                            });
                        }
                    }
                }
            }
        }
        
        return moves;
    }

    // Добавляем функцию проверки мата
    isCheckmate(chess, color) {
        // Проверяем, находится ли король под шахом
        if (!chess.isInCheck(color)) {
            return false;
        }

        // Проверяем все возможные ходы
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chess.getPiece(row, col);
                if (piece && piece.color === color) {
                    const moves = chess.getValidMoves(row, col);
                    if (moves.length > 0) {
                        return false; // Есть хотя бы один легальный ход
                    }
                }
            }
        }
        
        return true; // Нет легальных ходов и король под шахом
    }
}

// Make the ChessAI class available globally
window.ChessAI = ChessAI;