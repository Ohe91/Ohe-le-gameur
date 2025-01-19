const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const characterSelect = document.getElementById('characterSelect');
const tryAgainButton = document.getElementById('tryAgainButton');

// Configuration du canvas
canvas.width = 1200;
canvas.height = 800;

// Configuration du jeu
const PLAYER_SIZE = 30;
const BULLET_SIZE = 5;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 1.5; // Vitesse réduite
const SHOTGUN_SPREAD = 30;
const ENEMY_RESPAWN_TIME = 1000; // 1 seconde
const DIFFICULTY_INCREASE_INTERVAL = 30000; // 30 secondes
const COLLISION_BOUNCE = 2; // Force de rebond lors des collisions

let gameStarted = false;
let gameOver = false;
let score = 0;
let scoreSubmitted = false;
let backgroundImage = new Image();
backgroundImage.src = 'images/space.jpg';
let stars = [];

// Création des étoiles pour le parallax
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 2,
        size: 1 + Math.random() * 2
    });
}

let player = null;
let enemies = [];
let bullets = [];
let selectedCharacter = '';
let lastDifficultyIncrease = 0;
let gameStartTime = 0;
let items = [];
let killCount = 0;
let lastEnemySpawn = 0;

// Chargement des images
const characterImages = {
    'Ohe': new Image(),
    'Bilel': new Image(),
    'Abdel': new Image(),
    'Flouzi': new Image()
};

characterImages['Ohe'].src = 'assets/Ohe.jpg';
characterImages['Bilel'].src = 'assets/Bilel.jpg';
characterImages['Abdel'].src = 'assets/Abdel.jpg';
characterImages['Flouzi'].src = 'assets/Flouzi.jpg';

const characters = ['Ohe', 'Bilel', 'Abdel', 'Flouzi'];
const characterColors = {
    'Ohe': '#FF4444',
    'Bilel': '#44FF44',
    'Abdel': '#4444FF',
    'Flouzi': '#FFFF44'
};

tryAgainButton.style.display = 'none';

function startGame() {
    gameStarted = true;
    characterSelect.classList.add('hidden');
    tryAgainButton.style.display = 'none';
    gameOver = false;
    player.health = 100;
    score = 0;
    killCount = 0;
    enemies = [];
    bullets = [];
    items = [];
    lastEnemySpawn = Date.now();
    
    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
        const availableCharacters = characters.filter(c => c !== selectedCharacter);
        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        const newEnemy = createEnemy(randomCharacter);
        enemies.push(newEnemy);
    }
    
    gameLoop();
}

function resetGame() {
    // Réinitialiser les variables du jeu
    gameOver = false;
    gameStarted = true;
    player.health = 100;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    enemies = [];
    bullets = [];
    items = [];
    score = 0;
    killCount = 0;
    scoreSubmitted = false;
    lastEnemySpawn = 0;
    
    // Cacher le bouton Try Again
    tryAgainButton.style.display = 'none';
    
    // Créer les ennemis initiaux
    const availableCharacters = characters.filter(c => c !== selectedCharacter);
    for (let i = 0; i < 3; i++) {
        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        const enemy = createEnemy(randomCharacter);
        enemies.push(enemy);
    }

    // Redémarrer la boucle de jeu
    requestAnimationFrame(gameLoop);
}

tryAgainButton.addEventListener('click', resetGame);

function selectCharacter(character) {
    selectedCharacter = character;
    const remainingCharacters = characters.filter(c => c !== character);
    
    // Création du joueur
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        color: characterColors[character],
        name: character,
        initial: character[0],
        health: 100,
        dx: 0,
        dy: 0
    };

    // Création des ennemis initiaux
    enemies = remainingCharacters.map(enemyName => createEnemy(enemyName));

    startGame();
}

function createEnemy(enemyName) {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -PLAYER_SIZE : canvas.width + PLAYER_SIZE;
    const y = Math.random() * canvas.height;
    
    return {
        x: x,
        y: y,
        name: enemyName,
        color: characterColors[enemyName],
        initial: enemyName[0].toUpperCase(),
        lastShot: Date.now(),
        health: 50  // 2 coups pour tuer (25 dégâts par balle)
    };
}

function updatePlayer() {
    if (keys['z'] || keys['ArrowUp']) player.y = Math.max(PLAYER_SIZE, player.y - PLAYER_SPEED);
    if (keys['s'] || keys['ArrowDown']) player.y = Math.min(canvas.height - PLAYER_SIZE, player.y + PLAYER_SPEED);
    if (keys['q'] || keys['ArrowLeft']) player.x = Math.max(PLAYER_SIZE, player.x - PLAYER_SPEED);
    if (keys['d'] || keys['ArrowRight']) player.x = Math.min(canvas.width - PLAYER_SIZE, player.x + PLAYER_SPEED);
}

function updateEnemies() {
    // Déplacement des ennemis
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Ne pas se rapprocher trop près du joueur
        if (distance > PLAYER_SIZE * 2) {
            enemy.x += (dx / distance) * ENEMY_SPEED;
            enemy.y += (dy / distance) * ENEMY_SPEED;
        } else {
            // Si trop près, s'éloigner légèrement
            enemy.x -= (dx / distance) * ENEMY_SPEED * 0.5;
            enemy.y -= (dy / distance) * ENEMY_SPEED * 0.5;
        }
        
        // Collision avec le joueur
        if (checkCollision(enemy, player)) {
            player.health -= 0.5;
        }

        // Tir automatique
        if (Date.now() - enemy.lastShot > 2000) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            bullets.push({
                x: enemy.x,
                y: enemy.y,
                dx: Math.cos(angle) * BULLET_SPEED,
                dy: Math.sin(angle) * BULLET_SPEED,
                isPlayerBullet: false
            });
            enemy.lastShot = Date.now();
        }
    });
    
    // Vérifier les collisions avec les balles
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (bullet.isPlayerBullet) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision(bullet, enemy)) {
                    bullets.splice(i, 1);
                    enemy.health -= 25; // 2 coups pour tuer
                    
                    if (enemy.health <= 0) {
                        enemies.splice(j, 1);
                        score += 10;
                        
                        // Réapparition d'un nouvel ennemi après 1 seconde
                        setTimeout(() => {
                            if (!gameOver) {
                                const availableCharacters = characters.filter(c => c !== selectedCharacter);
                                const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
                                const newEnemy = createEnemy(randomCharacter);
                                enemies.push(newEnemy);
                            }
                        }, 1000);
                    }
                    break;
                }
            }
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        
        // Vérification des collisions avec les murs
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Vérification des collisions avec les ennemis
        if (bullet.isPlayerBullet) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision(bullet, enemy)) {
                    bullets.splice(i, 1);
                    enemy.health -= 25; // 2 coups pour tuer
                    console.log('Enemy hit! Health:', enemy.health); // Debug
                    
                    if (enemy.health <= 0) {
                        enemies.splice(j, 1);
                        score += 10;
                        
                        // Réapparition d'un nouvel ennemi après 1 seconde
                        setTimeout(() => {
                            if (!gameOver) {
                                const availableCharacters = characters.filter(c => c !== selectedCharacter);
                                const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
                                const newEnemy = createEnemy(randomCharacter);
                                enemies.push(newEnemy);
                            }
                        }, 1000);
                    }
                    break;
                }
            }
        } else if (checkCollision(bullet, player)) {
            player.health -= 10;
            bullets.splice(i, 1);
        }
    }
}

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < PLAYER_SIZE;
}

function updateBackground() {
    // Mise à jour des étoiles
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawBackground() {
    // Fond spatial
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Étoiles en parallax
    ctx.fillStyle = '#FFF';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawHealthBar() {
    const barWidth = 200;
    const barHeight = 20;
    const x = (canvas.width - barWidth) / 2;
    const y = 20;
    
    // Fond de la barre de vie
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Barre de vie
    const healthPercent = player.health / 100;
    let barColor;
    
    if (healthPercent > 0.6) barColor = '#2ecc71';
    else if (healthPercent > 0.3) barColor = '#f1c40f';
    else barColor = '#e74c3c';
    
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    
    // Texte de la vie
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.health)} / 100`, x + barWidth/2, y + 15);
}

function gameLoop() {
    if (!gameStarted || gameOver) return;
    
    // Mise à jour
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateBackground();
    
    // Dessin
    drawBackground();
    drawPlayer();
    drawEnemies();
    drawBullets();
    drawHealthBar();
    
    // Afficher le score
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    
    if (player.health <= 0) {
        showScoreboard();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

function drawPlayer() {
    // Créer un chemin circulaire pour le clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.clip();

    // Dessiner l'image du personnage
    const image = characterImages[player.name];
    if (image.complete) {
        const size = PLAYER_SIZE * 2;
        ctx.drawImage(image, player.x - size/2, player.y - size/2, size, size);
    } else {
        // Fallback si l'image n'est pas chargée
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.initial, player.x, player.y);
    }
    ctx.restore();
    
    // Barre de vie au-dessus du personnage
    const healthBarWidth = PLAYER_SIZE * 2;
    const healthBarHeight = 5;
    const healthBarY = player.y - PLAYER_SIZE - 15;
    
    // Fond de la barre de vie
    ctx.fillStyle = '#333';
    ctx.fillRect(
        player.x - healthBarWidth / 2,
        healthBarY,
        healthBarWidth,
        healthBarHeight
    );
    
    // Barre de vie
    ctx.fillStyle = player.health > 30 ? '#0f0' : '#f00';
    ctx.fillRect(
        player.x - healthBarWidth / 2,
        healthBarY,
        healthBarWidth * (player.health / 100),
        healthBarHeight
    );
    
    // Nom du personnage
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, player.x, healthBarY - 5);
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.isPlayerBullet ? '#fff' : '#ff0';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            // Créer un chemin circulaire pour le clipping
            ctx.save();
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, PLAYER_SIZE, 0, Math.PI * 2);
            ctx.clip();

            // Dessiner l'image du personnage
            const image = characterImages[enemy.name];
            if (image.complete) {
                const size = PLAYER_SIZE * 2;
                ctx.drawImage(image, enemy.x - size/2, enemy.y - size/2, size, size);
            } else {
                // Fallback si l'image n'est pas chargée
                ctx.fillStyle = enemy.color;
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(enemy.initial, enemy.x, enemy.y);
            }
            ctx.restore();
            
            // Barre de vie au-dessus du personnage
            const healthBarWidth = PLAYER_SIZE * 2;
            const healthBarHeight = 5;
            const healthBarY = enemy.y - PLAYER_SIZE - 15;
            
            // Fond de la barre de vie
            ctx.fillStyle = '#333';
            ctx.fillRect(
                enemy.x - healthBarWidth / 2,
                healthBarY,
                healthBarWidth,
                healthBarHeight
            );
            
            // Barre de vie
            ctx.fillStyle = enemy.health > 30 ? '#0f0' : '#f00';
            ctx.fillRect(
                enemy.x - healthBarWidth / 2,
                healthBarY,
                healthBarWidth * (enemy.health / 50),
                healthBarHeight
            );
            
            // Nom du personnage
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.name, enemy.x, healthBarY - 5);
        }
    });
}

function drawItems() {
    items.forEach(item => {
        if (item.type === 'heal') {
            // Dessiner une banane
            ctx.fillStyle = '#FFE135';
            ctx.beginPath();
            ctx.ellipse(item.x + 15, item.y + 15, 15, 7, Math.PI / 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function checkItemCollision() {
    items = items.filter(item => {
        const dx = (player.x + player.width/2) - (item.x + item.width/2);
        const dy = (player.y + player.height/2) - (item.y + item.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width + item.width) / 2) {
            if (item.type === 'heal') {
                player.health = Math.min(100, player.health + item.healAmount);
            }
            return false;
        }
        return true;
    });
}

function showScoreboard() {
    gameOver = true;
    const boardWidth = 400;
    const boardHeight = 500;
    const boardX = (canvas.width - boardWidth) / 2;
    const boardY = (canvas.height - boardHeight) / 2;
    
    // Fond du tableau
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
    
    // Bordure
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);
    
    // Score actuel
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${score}`, boardX + boardWidth/2, boardY + 50);
    
    // Titre du tableau
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Meilleurs Scores', boardX + boardWidth/2, boardY + 100);
    
    // En-têtes
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Rang', boardX + 20, boardY + 140);
    ctx.fillText('Joueur', boardX + 80, boardY + 140);
    ctx.fillText('Score', boardX + 250, boardY + 140);
    ctx.fillText('Date', boardX + 320, boardY + 140);
    
    // Ligne de séparation
    ctx.beginPath();
    ctx.moveTo(boardX + 10, boardY + 150);
    ctx.lineTo(boardX + boardWidth - 10, boardY + 150);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    
    // Sauvegarder le score avant d'afficher la liste
    if (!scoreSubmitted) {
        saveScore(player.name, score);
        scoreSubmitted = true;
    }
    
    // Liste des scores
    ctx.font = '16px Arial';
    highScores.forEach((scoreData, index) => {
        const y = boardY + 180 + index * 30;
        const date = new Date(scoreData.date).toLocaleDateString();
        
        // Highlight du score actuel
        if (scoreData.score === score && scoreData.name === player.name) {
            ctx.fillStyle = '#f1c40f';
        } else {
            ctx.fillStyle = '#fff';
        }
        
        ctx.textAlign = 'left';
        ctx.fillText(`${index + 1}`, boardX + 20, y);
        ctx.fillText(scoreData.name, boardX + 80, y);
        ctx.fillText(scoreData.score, boardX + 250, y);
        ctx.fillText(date, boardX + 320, y);
    });

    // Afficher le bouton Try Again
    tryAgainButton.style.display = 'block';
}

function saveScore(playerName, score) {
    highScores.push({ name: playerName, score: score, date: new Date().toISOString() });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); // Garder uniquement les 10 meilleurs scores

    fetch('scores.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(highScores)
    }).catch(error => {
        console.error('Erreur lors de la sauvegarde des scores:', error);
    });
}

function spawnHealItem() {
    const item = {
        x: Math.random() * (canvas.width - 30),
        y: Math.random() * (canvas.height - 30),
        width: 30,
        height: 30,
        type: 'heal',
        healAmount: 25
    };
    items.push(item);
}

// Gestion des touches
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

canvas.addEventListener('click', (e) => {
    if (!gameStarted || gameOver || !player) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (player.name === 'Flouzi') {
        shootShotgun(player.x, player.y, mouseX, mouseY);
    } else {
        shootNormal(player.x, player.y, mouseX, mouseY);
    }
});

function shootNormal(startX, startY, targetX, targetY) {
    const angle = Math.atan2(targetY - startY, targetX - startX);
    bullets.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * BULLET_SPEED,
        dy: Math.sin(angle) * BULLET_SPEED,
        isPlayerBullet: true
    });
}

function shootShotgun(startX, startY, targetX, targetY) {
    const angle = Math.atan2(targetY - startY, targetX - startX);
    
    // Créer 3 balles avec des angles légèrement différents
    for (let i = -1; i <= 1; i++) {
        const spreadAngle = angle + (i * SHOTGUN_SPREAD * Math.PI / 180);
        const bullet = {
            x: startX,
            y: startY,
            dx: Math.cos(spreadAngle) * BULLET_SPEED,
            dy: Math.sin(spreadAngle) * BULLET_SPEED,
            isPlayerBullet: true
        };
        bullets.push(bullet);
    }
}

// Chargement des meilleurs scores
let highScores = [];
fetch('scores.json')
    .then(response => response.json())
    .then(data => {
        highScores = data;
    })
    .catch(error => {
        console.error('Erreur lors du chargement des scores:', error);
    });
