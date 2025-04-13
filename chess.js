// chess.js - Core chess logic
class Chess {
    constructor() {
        // Board representation: 8x8 array
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.check = false;
        this.checkmate = false;
        this.stalemate = false;
        this.initializeBoard();
    }

    copyState(otherChess) {
        // Копируем доску
        this.board = JSON.parse(JSON.stringify(otherChess.board));
        
        // Копируем остальные свойства
        this.currentPlayer = otherChess.currentPlayer;
        this.moveHistory = [...otherChess.moveHistory];
        this.capturedPieces = JSON.parse(JSON.stringify(otherChess.capturedPieces));
        this.castlingRights = JSON.parse(JSON.stringify(otherChess.castlingRights));
        this.enPassantTarget = otherChess.enPassantTarget ? {...otherChess.enPassantTarget} : null;
        this.halfMoveClock = otherChess.halfMoveClock;
        this.fullMoveNumber = otherChess.fullMoveNumber;
        this.check = otherChess.check;
        this.checkmate = otherChess.checkmate;
        this.stalemate = otherChess.stalemate;
    }

    initializeBoard() {
        // Place pawns
        for (let i = 0; i < 8; i++) {
            this.board[1][i] = { type: 'pawn', color: 'black', hasMoved: false };
            this.board[6][i] = { type: 'pawn', color: 'white', hasMoved: false };
        }

        // Place rooks
        this.board[0][0] = { type: 'rook', color: 'black', hasMoved: false };
        this.board[0][7] = { type: 'rook', color: 'black', hasMoved: false };
        this.board[7][0] = { type: 'rook', color: 'white', hasMoved: false };
        this.board[7][7] = { type: 'rook', color: 'white', hasMoved: false };

        // Place knights
        this.board[0][1] = { type: 'knight', color: 'black' };
        this.board[0][6] = { type: 'knight', color: 'black' };
        this.board[7][1] = { type: 'knight', color: 'white' };
        this.board[7][6] = { type: 'knight', color: 'white' };

        // Place bishops
        this.board[0][2] = { type: 'bishop', color: 'black' };
        this.board[0][5] = { type: 'bishop', color: 'black' };
        this.board[7][2] = { type: 'bishop', color: 'white' };
        this.board[7][5] = { type: 'bishop', color: 'white' };

        // Place queens
        this.board[0][3] = { type: 'queen', color: 'black' };
        this.board[7][3] = { type: 'queen', color: 'white' };

        // Place kings
        this.board[0][4] = { type: 'king', color: 'black', hasMoved: false };
        this.board[7][4] = { type: 'king', color: 'white', hasMoved: false };
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getValidMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.color !== this.currentPlayer) return [];

        let moves = [];
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, piece);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, piece);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, piece);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, piece);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, piece);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, piece);
                break;
        }

        // Filter out moves that would leave the king in check
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col));
    }

    getPawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        // Forward move
        if (this.isValidPosition(row + direction, col) && !this.getPiece(row + direction, col)) {
            moves.push({ row: row + direction, col: col });
            
            // Double forward move from starting position
            if (row === startRow && !this.getPiece(row + 2 * direction, col)) {
                moves.push({ row: row + 2 * direction, col: col });
            }
        }
        
        // Capture moves
        for (let colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            if (this.isValidPosition(row + direction, newCol)) {
                const targetPiece = this.getPiece(row + direction, newCol);
                
                // Normal capture
                if (targetPiece && targetPiece.color !== piece.color) {
                    moves.push({ row: row + direction, col: newCol });
                }
                
                // En passant capture
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === row + direction && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({ 
                        row: row + direction, 
                        col: newCol, 
                        isEnPassant: true 
                    });
                }
            }
        }
        
        return moves;
    }

    getRookMoves(row, col, piece) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Up, Down, Left, Right
        
        for (let [rowDir, colDir] of directions) {
            let newRow = row + rowDir;
            let newCol = col + colDir;
            
            while (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);
                
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break; // Stop in this direction after encountering a piece
                }
                
                newRow += rowDir;
                newCol += colDir;
            }
        }
        
        return moves;
    }

    getKnightMoves(row, col, piece) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (let [rowOffset, colOffset] of offsets) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            
            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);
                
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        
        return moves;
    }

    getBishopMoves(row, col, piece) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Diagonals
        
        for (let [rowDir, colDir] of directions) {
            let newRow = row + rowDir;
            let newCol = col + colDir;
            
            while (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);
                
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break; // Stop in this direction after encountering a piece
                }
                
                newRow += rowDir;
                newCol += colDir;
            }
        }
        
        return moves;
    }

    getQueenMoves(row, col, piece) {
        // Queen moves are a combination of rook and bishop moves
        return [...this.getRookMoves(row, col, piece), ...this.getBishopMoves(row, col, piece)];
    }

    getKingMoves(row, col, piece) {
        const moves = [];
        // Regular king moves (one square in any direction)
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            for (let colOffset = -1; colOffset <= 1; colOffset++) {
                if (rowOffset === 0 && colOffset === 0) continue;
                
                const newRow = row + rowOffset;
                const newCol = col + colOffset;
                
                if (this.isValidPosition(newRow, newCol)) {
                    const targetPiece = this.getPiece(newRow, newCol);
                    
                    if (!targetPiece || targetPiece.color !== piece.color) {
                        // Make sure the king won't be in check after the move
                        if (!this.isSquareUnderAttack(newRow, newCol, piece.color === 'white' ? 'black' : 'white')) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
        }
        
        // Castling moves
        if (!piece.hasMoved && !this.check) {
            const castlingRights = this.castlingRights[piece.color];
            const backRank = piece.color === 'white' ? 7 : 0;
            
            // King-side castling
            if (castlingRights.kingSide && 
                !this.getPiece(backRank, 5) && 
                !this.getPiece(backRank, 6) &&
                !this.isSquareUnderAttack(backRank, 5, piece.color === 'white' ? 'black' : 'white')) {
                
                const rookPiece = this.getPiece(backRank, 7);
                if (rookPiece && rookPiece.type === 'rook' && !rookPiece.hasMoved) {
                    moves.push({ row: backRank, col: 6, isCastling: 'kingside' });
                }
            }
            
            // Queen-side castling
            if (castlingRights.queenSide && 
                !this.getPiece(backRank, 3) && 
                !this.getPiece(backRank, 2) && 
                !this.getPiece(backRank, 1) &&
                !this.isSquareUnderAttack(backRank, 3, piece.color === 'white' ? 'black' : 'white')) {
                
                const rookPiece = this.getPiece(backRank, 0);
                if (rookPiece && rookPiece.type === 'rook' && !rookPiece.hasMoved) {
                    moves.push({ row: backRank, col: 2, isCastling: 'queenside' });
                }
            }
        }
        
        return moves;
    }

    isSquareUnderAttack(row, col, attackingColor) {
        // Check if a square is under attack by any piece of the attacking color
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece && piece.color === attackingColor) {
                    // Get all possible moves for this piece
                    let moves = [];
                    switch (piece.type) {
                        case 'pawn':
                            // For pawns, we only care about capture moves
                            const direction = piece.color === 'white' ? -1 : 1;
                            for (let colOffset of [-1, 1]) {
                                if (r + direction === row && c + colOffset === col) {
                                    return true;
                                }
                            }
                            break;
                        case 'rook':
                            moves = this.getRookMoves(r, c, piece);
                            break;
                        case 'knight':
                            moves = this.getKnightMoves(r, c, piece);
                            break;
                        case 'bishop':
                            moves = this.getBishopMoves(r, c, piece);
                            break;
                        case 'queen':
                            moves = this.getQueenMoves(r, c, piece);
                            break;
                        case 'king':
                            // For kings, we check one square in any direction
                            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                                for (let colOffset = -1; colOffset <= 1; colOffset++) {
                                    if (rowOffset === 0 && colOffset === 0) continue;
                                    if (r + rowOffset === row && c + colOffset === col) {
                                        return true;
                                    }
                                }
                            }
                            break;
                    }
                    
                    // Check if any of the moves target the square
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null; // Should never happen in a valid game
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Make a temporary move and check if the king would be in check
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece) return false;
        
        const targetPiece = this.getPiece(toRow, toCol);
        
        // Temporarily make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Check if the king is in check
        const inCheck = this.isInCheck(piece.color);
        
        // Undo the move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = targetPiece;
        
        return inCheck;
    }

    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece || piece.color !== this.currentPlayer) return false;
        
        // Check if the move is valid
        const validMoves = this.getValidMoves(fromRow, fromCol);
        const targetMove = validMoves.find(move => move.row === toRow && move.col === toCol);
        
        if (!targetMove) return false;
        
        // Handle capturing
        const targetPiece = this.getPiece(toRow, toCol);
        if (targetPiece) {
            this.capturedPieces[targetPiece.color].push(targetPiece);
        }
        
        // Special move handling
        if (piece.type === 'pawn') {
            // En passant capture
            if (targetMove.isEnPassant) {
                const capturedPawnRow = fromRow;
                const capturedPawnCol = toCol;
                const capturedPawn = this.getPiece(capturedPawnRow, capturedPawnCol);
                this.capturedPieces[capturedPawn.color].push(capturedPawn);
                this.board[capturedPawnRow][capturedPawnCol] = null;
            }
            
            // Set en passant target for double move
            if (Math.abs(fromRow - toRow) === 2) {
                const enPassantRow = (fromRow + toRow) / 2;
                this.enPassantTarget = { row: enPassantRow, col: fromCol };
            } else {
                this.enPassantTarget = null;
            }
            
            // Pawn promotion
            if ((piece.color === 'white' && toRow === 0) || (piece.color === 'black' && toRow === 7)) {
                if (!promotionPiece) {
                    promotionPiece = 'queen'; // Default promotion
                }
                piece.type = promotionPiece;
            }
        } else {
            this.enPassantTarget = null;
        }
        
        // Castling
        if (piece.type === 'king' && targetMove.isCastling) {
            const backRank = piece.color === 'white' ? 7 : 0;
            if (targetMove.isCastling === 'kingside') {
                // Move the rook for kingside castling
                const rook = this.getPiece(backRank, 7);
                this.board[backRank][5] = rook;
                this.board[backRank][7] = null;
                rook.hasMoved = true;
            } else if (targetMove.isCastling === 'queenside') {
                // Move the rook for queenside castling
                const rook = this.getPiece(backRank, 0);
                this.board[backRank][3] = rook;
                this.board[backRank][0] = null;
                rook.hasMoved = true;
            }
        }
        
        // Update castling rights
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        } else if (piece.type === 'rook') {
            if (fromCol === 0) { // Queen's rook
                this.castlingRights[piece.color].queenSide = false;
            } else if (fromCol === 7) { // King's rook
                this.castlingRights[piece.color].kingSide = false;
            }
        }
        
        // Update hasMoved flag
        if (piece.type === 'king' || piece.type === 'rook' || piece.type === 'pawn') {
            piece.hasMoved = true;
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Record the move
        this.moveHistory.push({
            piece: { ...piece },
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: targetPiece ? { ...targetPiece } : null,
            enPassant: targetMove.isEnPassant || false,
            castling: targetMove.isCastling || null,
            promotion: promotionPiece,
            check: false,
            checkmate: false
        });
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Update game state
        this.updateGameState();
        
        return true;
    }

    undoLastMove() {
        if (this.moveHistory.length === 0) return false;
        
        const lastMove = this.moveHistory.pop();
        
        // Switch back to previous player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Restore the piece to its original position
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        
        // Handle captured piece
        if (lastMove.captured) {
            this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
            // Remove from captured pieces list
            const capturedPieceIndex = this.capturedPieces[lastMove.captured.color].findIndex(
                p => p.type === lastMove.captured.type
            );
            if (capturedPieceIndex !== -1) {
                this.capturedPieces[lastMove.captured.color].splice(capturedPieceIndex, 1);
            }
        } else {
            this.board[lastMove.to.row][lastMove.to.col] = null;
        }
        
        // Handle en passant
        if (lastMove.enPassant) {
            const capturedPawnRow = lastMove.from.row;
            const capturedPawnCol = lastMove.to.col;
            this.board[capturedPawnRow][capturedPawnCol] = {
                type: 'pawn',
                color: this.currentPlayer === 'white' ? 'black' : 'white',
                hasMoved: true
            };
            
            // Remove from captured pieces list
            const capturedPieceIndex = this.capturedPieces[this.currentPlayer === 'white' ? 'black' : 'white'].findIndex(
                p => p.type === 'pawn'
            );
            if (capturedPieceIndex !== -1) {
                this.capturedPieces[this.currentPlayer === 'white' ? 'black' : 'white'].splice(capturedPieceIndex, 1);
            }
        }
        
        // Handle castling
        if (lastMove.castling) {
            const backRank = lastMove.piece.color === 'white' ? 7 : 0;
            if (lastMove.castling === 'kingside') {
                // Move the rook back
                const rook = this.board[backRank][5];
                this.board[backRank][7] = rook;
                this.board[backRank][5] = null;
                rook.hasMoved = false;
            } else if (lastMove.castling === 'queenside') {
                // Move the rook back
                const rook = this.board[backRank][3];
                this.board[backRank][0] = rook;
                this.board[backRank][3] = null;
                rook.hasMoved = false;
            }
        }
        
        // Handle promotion
        if (lastMove.promotion) {
            lastMove.piece.type = 'pawn';
        }
        
        // Restore piece state
        if (lastMove.piece.type === 'king' || lastMove.piece.type === 'rook' || lastMove.piece.type === 'pawn') {
            lastMove.piece.hasMoved = false; // This is a simplification, might need to be more accurate
        }
        
        // Update game state
        this.updateGameState();
        
        return true;
    }

    updateGameState() {
        // Check if the current player is in check
        this.check = this.isInCheck(this.currentPlayer);
        
        // Check if the current player is in checkmate or stalemate
        let hasValidMoves = false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === this.currentPlayer) {
                    const validMoves = this.getValidMoves(row, col);
                    if (validMoves.length > 0) {
                        hasValidMoves = true;
                        break;
                    }
                }
            }
            if (hasValidMoves) break;
        }
        
        if (!hasValidMoves) {
            if (this.check) {
                this.checkmate = true;
                // Update the last move to indicate checkmate
                if (this.moveHistory.length > 0) {
                    this.moveHistory[this.moveHistory.length - 1].checkmate = true;
                }
            } else {
                this.stalemate = true;
            }
        } else {
            this.checkmate = false;
            this.stalemate = false;
        }
        
        // Update the last move to indicate check
        if (this.check && this.moveHistory.length > 0) {
            this.moveHistory[this.moveHistory.length - 1].check = true;
        }
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            check: this.check,
            checkmate: this.checkmate,
            stalemate: this.stalemate,
            capturedPieces: this.capturedPieces,
            moveHistory: this.moveHistory
        };
    }

    getMoveNotation(move) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        const fromFile = files[move.from.col];
        const fromRank = ranks[move.from.row];
        const toFile = files[move.to.col];
        const toRank = ranks[move.to.row];
        
        let notation = '';
        
        if (move.castling === 'kingside') {
            notation = 'O-O';
        } else if (move.castling === 'queenside') {
            notation = 'O-O-O';
        } else {
            // Piece letter (except for pawns)
            if (move.piece.type !== 'pawn') {
                notation += move.piece.type.charAt(0).toUpperCase();
            }
            
            // Add from coordinate for disambiguation if needed
            // (simplified, would need more logic for proper disambiguation)
            
            // Capture indicator
            if (move.captured || move.enPassant) {
                if (move.piece.type === 'pawn') {
                    notation += fromFile;
                }
                notation += 'x';
            }
            
            // Destination square
            notation += toFile + toRank;
            
            // Promotion
            if (move.promotion) {
                notation += '=' + move.promotion.charAt(0).toUpperCase();
            }
        }
        
        // Check or checkmate
        if (move.checkmate) {
            notation += '#';
        } else if (move.check) {
            notation += '+';
        }
        
        return notation;
    }

    getFEN() {
        let fen = '';
        
        // Board position
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    const pieceChar = piece.type === 'knight' ? 'n' : piece.type[0];
                    fen += piece.color === 'white' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row < 7) fen += '/';
        }
        
        // Active color
        fen += ` ${this.currentPlayer === 'white' ? 'w' : 'b'}`;
        
        // Castling rights
        let castling = '';
        if (this.castlingRights.white.kingSide) castling += 'K';
        if (this.castlingRights.white.queenSide) castling += 'Q';
        if (this.castlingRights.black.kingSide) castling += 'k';
        if (this.castlingRights.black.queenSide) castling += 'q';
        fen += ` ${castling || '-'}`;
        
        // En passant target
        fen += ` ${this.enPassantTarget ? 
            String.fromCharCode(97 + this.enPassantTarget.col) + (8 - this.enPassantTarget.row) : 
            '-'}`;
        
        // Halfmove clock and fullmove number
        fen += ` ${this.halfMoveClock} ${this.fullMoveNumber}`;
        
        return fen;
    }
}