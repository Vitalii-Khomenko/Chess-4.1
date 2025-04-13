const https = require('https');
const fs = require('fs');
const path = require('path');

const pieces = {
    'white': {
        'pawn': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        'rook': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        'knight': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        'bishop': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        'queen': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        'king': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
    },
    'black': {
        'pawn': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        'rook': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        'knight': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        'bishop': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        'queen': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        'king': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    }
};

const downloadFile = (url, filename) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filename);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(filename, () => reject(err));
            });
        }).on('error', reject);
    });
};

const downloadAllPieces = async () => {
    const dir = path.join(__dirname, 'images', 'pieces');
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const downloads = [];
    
    for (const [color, colorPieces] of Object.entries(pieces)) {
        for (const [piece, url] of Object.entries(colorPieces)) {
            const filename = path.join(dir, `${color}_${piece}.svg`);
            downloads.push(downloadFile(url, filename));
        }
    }

    try {
        await Promise.all(downloads);
        console.log('All pieces downloaded successfully!');
    } catch (error) {
        console.error('Error downloading pieces:', error);
    }
};

downloadAllPieces(); 