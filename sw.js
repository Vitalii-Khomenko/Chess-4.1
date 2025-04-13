const CACHE_NAME = 'chess-game-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './chess.js',
    './ui.js',
    './stockfish.js',
    './stockfish-10.js',
    './images/pieces/white_pawn.svg',
    './images/pieces/white_rook.svg',
    './images/pieces/white_knight.svg',
    './images/pieces/white_bishop.svg',
    './images/pieces/white_queen.svg',
    './images/pieces/white_king.svg',
    './images/pieces/black_pawn.svg',
    './images/pieces/black_rook.svg',
    './images/pieces/black_knight.svg',
    './images/pieces/black_bishop.svg',
    './images/pieces/black_queen.svg',
    './images/pieces/black_king.svg'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Кэшируем каждый файл отдельно с обработкой ошибок
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url => 
                        cache.add(url).catch(error => {
                            console.warn(`Не удалось кэшировать ${url}:`, error);
                        })
                    )
                );
            })
            .catch(error => {
                console.error('Ошибка при открытии кэша:', error);
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                            .catch(error => {
                                console.warn(`Не удалось удалить кэш ${cacheName}:`, error);
                            });
                    }
                })
            );
        })
        .catch(error => {
            console.error('Ошибка при активации Service Worker:', error);
        })
    );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
}); 