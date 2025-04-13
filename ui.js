// Регистрация Service Worker
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// ui.js - User interface and event handling
class ChessUI {
    constructor() {
        this.chess = new Chess();
        this.ai = new ChessAI();
        this.stockfish = null;
        this.selectedPiece = null;
        this.validMoves = [];
        this.playerColor = 'white';
        this.isPlayerTurn = true;
        this.isAIEnabled = true; // Добавляем флаг для состояния ИИ
        this.promotionCallback = null;
        
        // DOM elements
        this.boardElement = document.getElementById('board');
        this.statusElement = document.getElementById('status');
        this.movesElement = document.getElementById('moves');
        this.capturedWhiteElement = document.getElementById('captured-white');
        this.capturedBlackElement = document.getElementById('captured-black');
        this.difficultyElement = document.getElementById('difficulty');
        this.playerColorElement = document.getElementById('player-color');
        this.engineTypeElement = document.getElementById('engine-type');
        this.aiToggleButton = document.getElementById('ai-toggle');
        
        // Устанавливаем начальный уровень сложности на первый
        this.difficultyElement.value = '1';
        this.ai.setDifficulty(1);
        
        this.pieceImages = {
            'white': {
                'pawn': './images/pieces/white_pawn.svg',
                'rook': './images/pieces/white_rook.svg',
                'knight': './images/pieces/white_knight.svg',
                'bishop': './images/pieces/white_bishop.svg',
                'queen': './images/pieces/white_queen.svg',
                'king': './images/pieces/white_king.svg'
            },
            'black': {
                'pawn': './images/pieces/black_pawn.svg',
                'rook': './images/pieces/black_rook.svg',
                'knight': './images/pieces/black_knight.svg',
                'bishop': './images/pieces/black_bishop.svg',
                'queen': './images/pieces/black_queen.svg',
                'king': './images/pieces/black_king.svg'
            }
        };
        
        // Store a reference to this instance for the AI to access
        const container = document.querySelector('.container');
        if (container) {
            container.__chessUI = this;
        } else {
            console.error('Container element not found for AI reference');
            // Fallback to document
            document.__chessUI = this;
        }
        
        this.setupBoard();
        this.setupEventListeners();
        this.updateUI();
        
        // Initialize Stockfish if selected
        if (this.engineTypeElement.value === 'stockfish') {
            this.initializeStockfish();
        }
        
        // If player is black, let AI make the first move
        if (this.playerColor === 'black') {
            this.isPlayerTurn = false;
            this.makeAIMove();
        }
    }
    
    initializeStockfish() {
        // Проверяем протокол
        if (window.location.protocol === 'file:') {
            console.error('Stockfish не может работать через file:// протокол. Пожалуйста, запустите игру через веб-сервер.');
            this.statusElement.textContent = 'Ошибка: Stockfish требует веб-сервер';
            this.engineTypeElement.value = 'simple';
            return;
        }

        if (typeof Worker !== 'undefined') {
            try {
                this.stockfish = new Worker('stockfish-10.js');
                this.stockfish.postMessage('uci');
                this.stockfish.postMessage('setoption name MultiPV value 1');
                this.stockfish.postMessage('setoption name Threads value 4');
                this.stockfish.postMessage('setoption name Hash value 128');
                
                this.stockfish.onmessage = (e) => this.handleStockfishMessage(e);
                this.statusElement.textContent = 'Stockfish инициализирован';
            } catch (error) {
                console.error('Ошибка при инициализации Stockfish:', error);
                this.statusElement.textContent = 'Ошибка при загрузке Stockfish';
                this.engineTypeElement.value = 'simple';
            }
        } else {
            console.error('Web Workers не поддерживаются в этом браузере');
            this.statusElement.textContent = 'Web Workers не поддерживаются';
            this.engineTypeElement.value = 'simple';
        }
    }

    handleStockfishMessage(e) {
        const message = e.data;
        if (message.startsWith('bestmove')) {
            const move = message.split(' ')[1];
            if (move && move.length >= 4) {  // Проверяем, что ход корректный
                this.makeStockfishMove(move);
            } else {
                console.error('Некорректный ход от Stockfish:', move);
                // Возвращаемся к простому ИИ при ошибке
                this.engineTypeElement.value = 'simple';
                this.makeAIMove();
            }
        }
    }

    makeStockfishMove(move) {
        try {
            const fromCol = move.charCodeAt(0) - 'a'.charCodeAt(0);
            const fromRow = 8 - parseInt(move[1]);
            const toCol = move.charCodeAt(2) - 'a'.charCodeAt(0);
            const toRow = 8 - parseInt(move[3]);
            
            // Проверяем корректность координат
            if (this.isValidPosition(fromRow, fromCol) && 
                this.isValidPosition(toRow, toCol)) {
                
                // Проверяем наличие фигуры
                const piece = this.chess.getPiece(fromRow, fromCol);
                if (!piece) {
                    throw new Error('Нет фигуры на начальной позиции');
                }
                
                // Проверяем, является ли ход допустимым
                const validMoves = this.chess.getValidMoves(fromRow, fromCol);
                const isValidMove = validMoves.some(m => m.row === toRow && m.col === toCol);
                
                if (!isValidMove) {
                    throw new Error('Недопустимый ход');
                }
                
                // Проверяем на превращение пешки
                let promotion = null;
                if (move.length > 4) {
                    const promotionPiece = move[4].toLowerCase();
                    if ('qrbn'.includes(promotionPiece)) {
                        switch(promotionPiece) {
                            case 'q': promotion = 'queen'; break;
                            case 'r': promotion = 'rook'; break;
                            case 'b': promotion = 'bishop'; break;
                            case 'n': promotion = 'knight'; break;
                        }
                    }
                }
                
                this.makeMove(
                    {row: fromRow, col: fromCol},
                    {row: toRow, col: toCol},
                    promotion
                );
            } else {
                throw new Error('Некорректные координаты хода');
            }
        } catch (error) {
            console.error('Ошибка при выполнении хода Stockfish:', error);
            // Возвращаемся к простому ИИ при ошибке
            this.engineTypeElement.value = 'simple';
            this.makeAIMove();
        }
    }

    makeMove(from, to, promotionPiece = null) {
        // Защита от множественных ходов
        if (this.isProcessingMove) {
            console.log('Ход уже обрабатывается');
            return false;
        }

        this.isProcessingMove = true;

        try {
            // Проверяем, что переданы объекты с координатами
            if (!from || !to || 
                typeof from.row === 'undefined' || typeof from.col === 'undefined' ||
                typeof to.row === 'undefined' || typeof to.col === 'undefined') {
                console.error('Некорректные координаты для хода:', from, to);
                return false;
            }

            // Проверяем валидность координат
            if (!this.isValidPosition(from.row, from.col) || !this.isValidPosition(to.row, to.col)) {
                console.error('Координаты хода вне диапазона:', from, to);
                return false;
            }

            // Создаем временную копию состояния для проверки хода
            const tempChess = new Chess();
            tempChess.copyState(this.chess);
            
            // Проверяем ход на временной копии
            if (tempChess.makeMove(from.row, from.col, to.row, to.col, promotionPiece)) {
                // Если ход допустим, применяем его к основному состоянию
                if (this.chess.makeMove(from.row, from.col, to.row, to.col, promotionPiece)) {
                    // Обновляем UI
                    this.setupBoard();
                    this.updateUI();
                    
                    // Если игра не закончена, проверяем чей ход
                    if (!this.chess.checkmate && !this.chess.stalemate) {
                        // Обновляем статус хода игрока
                        this.isPlayerTurn = this.chess.currentPlayer === this.playerColor;
                        
                        // Делаем ход ИИ только если сейчас его очередь
                        if (!this.isPlayerTurn && this.chess.currentPlayer !== this.playerColor) {
                            // Очищаем выделение перед ходом ИИ
                            this.clearSelection();
                            // Делаем ход ИИ с небольшой задержкой
                            setTimeout(() => {
                                this.makeAIMove();
                            }, 100);
                        }
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Ошибка при выполнении хода:', error);
            return false;
        } finally {
            this.isProcessingMove = false;
        }
    }
    
    setupBoard() {
        // Clear the board
        this.boardElement.innerHTML = '';
        
        // Create squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Add rank and file labels
                if (col === 0) {
                    const rankLabel = document.createElement('div');
                    rankLabel.className = 'rank-label';
                    rankLabel.textContent = 8 - row;
                    square.appendChild(rankLabel);
                }
                
                if (row === 7) {
                    const fileLabel = document.createElement('div');
                    fileLabel.className = 'file-label';
                    fileLabel.textContent = String.fromCharCode(97 + col); // 'a' to 'h'
                    square.appendChild(fileLabel);
                }
                
                // Add piece if there is one
                const piece = this.chess.getPiece(row, col);
                if (piece) {
                    this.addPieceToSquare(square, piece);
                }
                
                this.boardElement.appendChild(square);
            }
        }
    }
    
    addPieceToSquare(square, piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        pieceElement.style.backgroundImage = `url(${this.pieceImages[piece.color][piece.type]})`;
        pieceElement.dataset.type = piece.type;
        pieceElement.dataset.color = piece.color;
        square.appendChild(pieceElement);
    }
    
    setupEventListeners() {
        // Board click event
        this.boardElement.addEventListener('click', (e) => {
            this.handleBoardInteraction(e);
        });

        // Удаляем обработчики тач-событий, так как они создают проблемы с перетаскиванием
        this.boardElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element) {
                const square = element.closest('.square');
                if (square) {
                    this.handleBoardInteraction({ target: square });
                }
            }
        });

        this.boardElement.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element) {
                const square = element.closest('.square');
                if (square) {
                    this.handleBoardInteraction({ target: square });
                }
            }
        });
        
        // New game button
        document.getElementById('new-game').addEventListener('click', () => {
            this.chess = new Chess();
            this.setupBoard();
            this.updateUI();
            
            // Reset player turn based on selected color
            this.playerColor = this.playerColorElement.value;
            this.isPlayerTurn = this.playerColor === this.chess.currentPlayer;
            
            // Reset AI toggle button
            this.isAIEnabled = true;
            this.aiToggleButton.textContent = 'AI Off';
            this.aiToggleButton.classList.remove('active');
            
            // If AI's turn, make a move
            if (!this.isPlayerTurn && this.isAIEnabled) {
                this.makeAIMove();
            }
        });
        
        // Undo move button
        document.getElementById('undo-move').addEventListener('click', () => {
            // Undo both the AI's move and the player's move
            if (this.chess.undoLastMove()) {
                if (!this.isPlayerTurn) {
                    this.chess.undoLastMove();
                    this.isPlayerTurn = true;
                } else {
                    // If it's the player's turn, undo one more move to get back to the player's turn
                    this.chess.undoLastMove();
                }
                this.setupBoard();
                this.updateUI();
                this.isPlayerTurn = this.chess.currentPlayer === this.playerColor;
            }
        });
        
        // Difficulty select
        this.difficultyElement.addEventListener('change', () => {
            const newDifficulty = parseInt(this.difficultyElement.value);
            if (newDifficulty !== this.ai.difficulty) {
                this.ai.setDifficulty(newDifficulty);
            }
        });
        
        // Player color select
        this.playerColorElement.addEventListener('change', () => {
            // Get the new player color
            const newPlayerColor = this.playerColorElement.value;
            
            // If the color has changed, update the game
            if (newPlayerColor !== this.playerColor) {
                this.playerColor = newPlayerColor;
                
                // Reset the game
                this.chess = new Chess();
                this.setupBoard();
                this.updateUI();
                
                // Set player turn based on the new color
                this.isPlayerTurn = this.playerColor === this.chess.currentPlayer;
                
                // If it's AI's turn, make a move
                if (!this.isPlayerTurn) {
                    this.makeAIMove();
                }
            }
        });
        
        // Engine type select
        this.engineTypeElement.addEventListener('change', () => {
            const newEngineType = this.engineTypeElement.value;
            if (newEngineType === 'stockfish') {
                this.initializeStockfish();
            } else if (this.stockfish) {
                this.stockfish.terminate();
                this.stockfish = null;
            }
        });
        
        // AI Toggle button
        this.aiToggleButton.addEventListener('click', () => {
            if (this.chess.moveHistory.length === 0) {
                this.isAIEnabled = !this.isAIEnabled;
                this.aiToggleButton.textContent = this.isAIEnabled ? 'AI Off' : 'AI On';
                this.aiToggleButton.classList.toggle('active', !this.isAIEnabled);
            }
        });
        
        // Initialize AI difficulty
        this.ai.setDifficulty(parseInt(this.difficultyElement.value));
    }
    
    selectPiece(row, col) {
        // Проверяем, не закончена ли игра
        if (this.chess.checkmate || this.chess.stalemate) {
            return;
        }

        const piece = this.chess.getPiece(row, col);
        
        // Проверяем, принадлежит ли фигура текущему игроку или ИИ выключен
        if (!piece || (piece.color !== this.chess.currentPlayer && this.isAIEnabled)) {
            return;
        }

        // Если фигура уже выбрана, снимаем выделение
        if (this.selectedPiece) {
            const square = this.getSquareElement(this.selectedPiece.row, this.selectedPiece.col);
            if (square) {
                square.classList.remove('selected');
            }
            this.validMoves.forEach(move => {
                if (move && this.isValidPosition(move.row, move.col)) {
                    const moveSquare = this.getSquareElement(move.row, move.col);
                    if (moveSquare) {
                        moveSquare.classList.remove('valid-move');
                    }
                }
            });
        }

        // Выбираем новую фигуру
        this.selectedPiece = { row, col };
        const square = this.getSquareElement(row, col);
        
        if (square) {
            square.classList.add('selected');
            
            // Get and highlight valid moves
            this.validMoves = this.chess.getValidMoves(row, col) || [];
            this.validMoves.forEach(move => {
                if (move && this.isValidPosition(move.row, move.col)) {
                    const moveSquare = this.getSquareElement(move.row, move.col);
                    if (moveSquare) {
                        moveSquare.classList.add('valid-move');
                    }
                }
            });
        }
    }
    
    clearSelection() {
        if (this.selectedPiece && this.isValidPosition(this.selectedPiece.row, this.selectedPiece.col)) {
            const square = this.getSquareElement(this.selectedPiece.row, this.selectedPiece.col);
            if (square) {
                square.classList.remove('selected');
            }
            
            // Очищаем подсветку допустимых ходов
            if (Array.isArray(this.validMoves)) {
                this.validMoves.forEach(move => {
                    if (move && this.isValidPosition(move.row, move.col)) {
                        const moveSquare = this.getSquareElement(move.row, move.col);
                        if (moveSquare) {
                            moveSquare.classList.remove('valid-move');
                        }
                    }
                });
            }
        }
        
        this.selectedPiece = null;
        this.validMoves = [];
    }
    
    getSquareElement(row, col) {
        return this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    makeAIMove() {
        // Если ИИ выключен, не делаем ход
        if (!this.isAIEnabled) {
            this.isPlayerTurn = true;
            return;
        }

        // Проверяем, что сейчас действительно ход ИИ
        if (this.isPlayerTurn || this.chess.currentPlayer === this.playerColor) {
            console.error('Попытка хода ИИ в неправильный момент');
            return;
        }

        this.statusElement.textContent = 'AI is thinking...';
        
        if (this.engineTypeElement.value === 'stockfish' && this.stockfish) {
            // Convert current position to FEN
            const fen = this.chess.getFEN();
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage('go depth 20');
        } else {
            // Use simple AI
            this.ai.makeMove((from, to, promotion) => {
                if (from === null || to === null) {
                    console.error('AI could not make a move');
                    return;
                }

                // Проверяем, что ход все еще актуален
                if (this.isPlayerTurn || this.chess.currentPlayer === this.playerColor) {
                    console.error('Состояние игры изменилось во время размышления ИИ');
                    return;
                }

                // Создаем временную копию состояния для проверки хода
                const tempChess = new Chess();
                tempChess.copyState(this.chess);
                
                if (tempChess.makeMove(from.row, from.col, to.row, to.col, promotion)) {
                    // Если ход допустим, применяем его к основному состоянию
                    if (this.chess.makeMove(from.row, from.col, to.row, to.col, promotion)) {
                        this.setupBoard();
                        this.updateUI();
                        
                        // Обновляем статус хода игрока после хода ИИ
                        this.isPlayerTurn = this.chess.currentPlayer === this.playerColor;
                    } else {
                        console.error('Не удалось применить ход ИИ к основному состоянию');
                    }
                } else {
                    console.error('Недопустимый ход ИИ');
                }
            });
        }
    }
    
    showPromotionDialog(fromRow, fromCol, toRow, toCol) {
        const promotionDialog = document.createElement('div');
        promotionDialog.className = 'promotion-dialog';
        
        const promotionOptions = document.createElement('div');
        promotionOptions.className = 'promotion-options';
        
        const pieceColor = this.chess.getPiece(fromRow, fromCol).color;
        
        const pieces = ['queen', 'rook', 'bishop', 'knight'];
        pieces.forEach(pieceType => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'promotion-piece';
            pieceElement.style.backgroundImage = `url(${this.pieceImages[pieceColor][pieceType]})`;
            pieceElement.addEventListener('click', () => {
                this.makeMove(fromRow, fromCol, toRow, toCol, pieceType);
                document.body.removeChild(promotionDialog);
            });
            promotionOptions.appendChild(pieceElement);
        });
        
        promotionDialog.appendChild(promotionOptions);
        document.body.appendChild(promotionDialog);
        promotionDialog.style.display = 'flex';
    }
    
    updateUI() {
        // Update status
        let status = '';
        if (this.chess.checkmate) {
            status = `Checkmate! ${this.chess.currentPlayer === 'white' ? 'Black' : 'White'} wins`;
        } else if (this.chess.stalemate) {
            status = 'Stalemate! Game is a draw';
        } else if (this.chess.check) {
            status = `${this.chess.currentPlayer === 'white' ? 'White' : 'Black'} is in check`;
        } else {
            status = `${this.chess.currentPlayer === 'white' ? 'White' : 'Black'} to move`;
        }
        
        // Add AI difficulty to status
        status += ` (AI Level: ${this.ai.difficulty})`;
        
        this.statusElement.textContent = status;
        
        // Update captured pieces
        this.updateCapturedPieces();
        
        // Update move history
        this.updateMoveHistory();
        
        // Highlight king in check
        this.highlightCheck();
    }
    
    updateCapturedPieces() {
        this.capturedWhiteElement.innerHTML = '';
        this.capturedBlackElement.innerHTML = '';
        
        this.chess.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            pieceElement.style.backgroundImage = `url(${this.pieceImages['white'][piece.type]})`;
            this.capturedWhiteElement.appendChild(pieceElement);
        });
        
        this.chess.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            pieceElement.style.backgroundImage = `url(${this.pieceImages['black'][piece.type]})`;
            this.capturedBlackElement.appendChild(pieceElement);
        });
    }
    
    updateMoveHistory() {
        this.movesElement.innerHTML = '';
        
        for (let i = 0; i < this.chess.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.chess.moveHistory[i];
            const blackMove = i + 1 < this.chess.moveHistory.length ? this.chess.moveHistory[i + 1] : null;
            
            const moveNumberElement = document.createElement('div');
            moveNumberElement.className = 'move-number';
            moveNumberElement.textContent = `${moveNumber}.`;
            
            const whiteMoveElement = document.createElement('div');
            whiteMoveElement.className = 'move';
            whiteMoveElement.textContent = this.chess.getMoveNotation(whiteMove);
            
            this.movesElement.appendChild(moveNumberElement);
            this.movesElement.appendChild(whiteMoveElement);
            
            if (blackMove) {
                const blackMoveElement = document.createElement('div');
                blackMoveElement.className = 'move';
                blackMoveElement.textContent = this.chess.getMoveNotation(blackMove);
                this.movesElement.appendChild(blackMoveElement);
            }
        }
        
        // Scroll to the bottom of the move history
        this.movesElement.scrollTop = this.movesElement.scrollHeight;
    }
    
    highlightCheck() {
        if (this.chess.check) {
            const kingPos = this.chess.findKing(this.chess.currentPlayer);
            const kingSquare = this.getSquareElement(kingPos.row, kingPos.col);
            kingSquare.classList.add('check');
        }
    }

    handleBoardInteraction(e) {
        // Защита от множественных кликов
        if (this.isProcessingMove) {
            return;
        }

        // Проверяем, не закончена ли игра
        if (this.chess.checkmate || this.chess.stalemate) {
            console.log('Игра уже закончена');
            return;
        }

        // Проверяем, чей сейчас ход
        if (!this.isPlayerTurn && this.isAIEnabled) {
            console.log('Сейчас не ваш ход');
            return;
        }
        
        const square = e.target.closest('.square');
        if (!square) return;
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        // Проверяем валидность координат
        if (!this.isValidPosition(row, col)) {
            console.error('Некорректные координаты клетки');
            return;
        }
        
        // Если фигура уже выбрана
        if (this.selectedPiece && this.isValidPosition(this.selectedPiece.row, this.selectedPiece.col)) {
            const fromRow = this.selectedPiece.row;
            const fromCol = this.selectedPiece.col;
            
            // Проверяем, является ли выбранная клетка допустимым ходом
            const validMove = this.validMoves.find(move => 
                move && this.isValidPosition(move.row, move.col) && 
                move.row === row && move.col === col
            );
            
            if (validMove) {
                // Проверяем на превращение пешки
                const piece = this.chess.getPiece(fromRow, fromCol);
                if (piece && piece.type === 'pawn' && 
                    ((piece.color === 'white' && row === 0) || 
                     (piece.color === 'black' && row === 7))) {
                    this.showPromotionDialog(fromRow, fromCol, row, col);
                } else {
                    // Проверяем, не находится ли король под шахом
                    if (this.chess.check) {
                        // Если король под шахом, проверяем, защищает ли ход короля
                        const tempChess = new Chess();
                        tempChess.copyState(this.chess);
                        if (tempChess.makeMove(fromRow, fromCol, row, col)) {
                            if (!tempChess.check) {
                                this.makeMove(
                                    {row: fromRow, col: fromCol},
                                    {row: row, col: col}
                                );
                            } else {
                                console.log('Этот ход не защищает короля от шаха');
                            }
                        }
                    } else {
                        this.makeMove(
                            {row: fromRow, col: fromCol},
                            {row: row, col: col}
                        );
                    }
                }
            } else {
                // Если клетка не является допустимым ходом, пробуем выбрать новую фигуру
                const newPiece = this.chess.getPiece(row, col);
                if (newPiece && newPiece.color === this.chess.currentPlayer && (!this.isAIEnabled || newPiece.color === this.playerColor)) {
                    this.clearSelection();
                    this.selectPiece(row, col);
                } else {
                    this.clearSelection();
                }
            }
        } else {
            // Пытаемся выбрать фигуру
            const piece = this.chess.getPiece(row, col);
            if (piece && piece.color === this.chess.currentPlayer && (!this.isAIEnabled || piece.color === this.playerColor)) {
                this.selectPiece(row, col);
            }
        }
    }

    handleSquareHover(row, col) {
        // Проверяем, что все параметры определены и корректны
        if (!this.isPlayerTurn || 
            typeof row !== 'number' || typeof col !== 'number' || 
            !this.isValidPosition(row, col)) {
            return;
        }

        // Если нет выбранной фигуры или её координаты некорректны, выходим
        if (!this.selectedPiece || 
            !this.isValidPosition(this.selectedPiece.row, this.selectedPiece.col)) {
            return;
        }
        
        const square = this.getSquareElement(row, col);
        if (!square) return;
        
        // Проверяем, что это допустимый ход
        const isValidMove = Array.isArray(this.validMoves) && this.validMoves.some(move => 
            move && typeof move.row === 'number' && typeof move.col === 'number' &&
            move.row === row && move.col === col
        );
        
        if (!isValidMove) return;
        
        // Выделяем клетку как возможный ход
        square.classList.add('hover');
    }

    // Добавляем вспомогательный метод для проверки координат
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessUI();
});
