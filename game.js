const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const characterSelect = document.getElementById('characterSelect');

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
let player = null;
let enemies = [];
let bullets = [];
let selectedCharacter = '';
let score = 0;
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
const colors = {
    'Ohe': '#FF4444',
    'Bilel': '#44FF44',
    'Abdel': '#4444FF',
    'Flouzi': '#FFFF44'
};

// Création du bouton Try Again
const tryAgainButton = document.createElement('button');
tryAgainButton.textContent = 'Try Again';
tryAgainButton.style.position = 'absolute';
tryAgainButton.style.bottom = '20px';
tryAgainButton.style.left = '50%';
tryAgainButton.style.transform = 'translateX(-50%)';
tryAgainButton.style.padding = '10px 20px';
tryAgainButton.style.fontSize = '20px';
tryAgainButton.style.backgroundColor = '#4CAF50';
tryAgainButton.style.color = 'white';
tryAgainButton.style.border = 'none';
tryAgainButton.style.borderRadius = '5px';
tryAgainButton.style.cursor = 'pointer';
tryAgainButton.style.display = 'none';
document.body.appendChild(tryAgainButton);

tryAgainButton.addEventListener('click', () => {
    gameOver = false;
    tryAgainButton.style.display = 'none';
    resetGame();
});

function resetGame() {
    // Réinitialiser le joueur
    player.health = 100;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    score = 0;

    // Réinitialiser les ennemis
    const remainingCharacters = characters.filter(c => c !== selectedCharacter);
    enemies = remainingCharacters.map(enemyName => createEnemy(enemyName));
    
    // Réinitialiser les balles
    bullets = [];
    
    // Redémarrer le jeu
    gameLoop();
}

function createEnemy(enemyName) {
    // Trouver une position valide pour l'ennemi (loin du joueur et des autres ennemis)
    let x, y;
    let validPosition = false;
    
    while (!validPosition) {
        x = Math.random() * (canvas.width - PLAYER_SIZE * 2) + PLAYER_SIZE;
        y = Math.random() * (canvas.height - PLAYER_SIZE * 2) + PLAYER_SIZE;
        
        // Vérifier la distance avec le joueur
        if (player) {
            const distToPlayer = Math.sqrt(
                Math.pow(x - player.x, 2) + 
                Math.pow(y - player.y, 2)
            );
            if (distToPlayer < PLAYER_SIZE * 4) continue;
        }
        
        // Vérifier la distance avec les autres ennemis
        let tooClose = false;
        for (const enemy of enemies) {
            const distToEnemy = Math.sqrt(
                Math.pow(x - enemy.x, 2) + 
                Math.pow(y - enemy.y, 2)
            );
            if (distToEnemy < PLAYER_SIZE * 3) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) validPosition = true;
    }
    
    return {
        x: x,
        y: y,
        dx: 0,
        dy: 0,
        color: colors[enemyName],
        name: enemyName,
        initial: enemyName[0],
        health: 100,
        lastShot: 0,
        moveDirection: { 
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1
        }
    };
}

function selectCharacter(character) {
    selectedCharacter = character;
    const remainingCharacters = characters.filter(c => c !== character);
    
    // Création du joueur
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        color: colors[character],
        name: character,
        initial: character[0],
        health: 100,
        dx: 0,
        dy: 0
    };

    // Création des ennemis initiaux
    enemies = remainingCharacters.map(enemyName => createEnemy(enemyName));

    characterSelect.classList.add('hidden');
    gameStarted = true;
    score = 0;
    gameStartTime = Date.now();
    lastDifficultyIncrease = gameStartTime;
    gameLoop();
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
        
        if (distance > 0) {
            enemy.x += (dx / distance) * ENEMY_SPEED;
            enemy.y += (dy / distance) * ENEMY_SPEED;
        }
        
        // Collision avec le joueur
        if (checkCollision(enemy, player)) {
            player.health -= 0.5; // Dégâts continus
        }

        // Tir automatique
        if (!enemy.lastShot) enemy.lastShot = 0;
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
    bullets.forEach((bullet, bulletIndex) => {
        if (bullet.isPlayerBullet) {
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(bullet, enemy)) {
                    bullets.splice(bulletIndex, 1);
                    enemies.splice(enemyIndex, 1);
                    score += 10;
                    killCount++;
                    
                    // Spawn une banane tous les 5 kills
                    if (killCount % 5 === 0) {
                        spawnHealItem();
                    }

                    // Réapparition d'un nouvel ennemi après 1 seconde
                    setTimeout(() => {
                        const availableCharacters = characters.filter(c => c !== selectedCharacter);
                        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
                        const newEnemy = {
                            x: Math.random() < 0.5 ? 0 : canvas.width,
                            y: Math.random() * canvas.height,
                            width: PLAYER_SIZE * 2,
                            height: PLAYER_SIZE * 2,
                            health: 100,
                            name: randomCharacter,
                            lastShot: 0
                        };
                        enemies.push(newEnemy);
                    }, 1000);
                }
            });
        }
    });

    // Ajouter un nouvel ennemi toutes les 30 secondes
    const currentTime = Date.now();
    if (!lastEnemySpawn) lastEnemySpawn = currentTime;
    if (currentTime - lastEnemySpawn >= 30000) {
        const availableCharacters = characters.filter(c => c !== selectedCharacter);
        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        const newEnemy = {
            x: Math.random() < 0.5 ? 0 : canvas.width,
            y: Math.random() * canvas.height,
            width: PLAYER_SIZE * 2,
            height: PLAYER_SIZE * 2,
            health: 100,
            name: randomCharacter,
            lastShot: 0
        };
        enemies.push(newEnemy);
        lastEnemySpawn = currentTime;
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
        
        // Vérification des collisions avec les joueurs
        if (bullet.isPlayerBullet) {
            enemies.forEach(enemy => {
                if (enemy.health <= 0) return;
                if (checkCollision(bullet, enemy, BULLET_SIZE, PLAYER_SIZE)) {
                    enemy.health -= 34; 
                    bullets.splice(i, 1);
                }
            });
        } else {
            if (checkCollision(bullet, player, BULLET_SIZE, PLAYER_SIZE)) {
                player.health -= 10;
                bullets.splice(i, 1);
            }
        }
    }
}

function checkCollision(bullet, target, bulletSize, targetSize) {
    return Math.hypot(bullet.x - target.x, bullet.y - target.y) < bulletSize + targetSize;
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
    if (!gameStarted) return;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    
    // Dessiner les éléments
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawItems();
    drawHealthBar();
    
    // Afficher le score
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    // Vérifier les collisions avec les items
    checkItemCollision();
    
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
                healthBarWidth * (enemy.health / 100),
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
