const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const characterSelect = document.getElementById('characterSelect');
const tryAgainButton = document.getElementById('tryAgainButton');
const soundButton = document.getElementById('soundButton');
const selectCharacterButton = document.getElementById('selectCharacterButton');

// Configuration du canvas
canvas.width = 1200;
canvas.height = 800;

// Configuration du jeu
const PLAYER_SIZE = 30;
const BULLET_SIZE = 5;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 1.5;
const SHOTGUN_SPREAD = 30;
const INITIAL_ENEMY_SPAWN_RATE = 3500; // 3.5 secondes au premier round
const ENEMY_SPAWN_RATE_DECREASE = 300; // Diminution par round
const ROUND_DURATION = 30000; // 30 secondes par round
const ENEMY_SHOOT_INTERVAL_START = 2000; // Intervalle de tir initial (2 secondes)
const ENEMY_SHOOT_INTERVAL_DECREASE = 200; // Réduction de l'intervalle par round
const COLLISION_BOUNCE = 2; // Force de rebond lors des collisions

// Configuration du boss
const BOSS_SIZE = 100;
const BOSS_SPEED = 3;
const BOSS_SHOOT_INTERVAL = 800;
const BOSS_ROUNDS = [5, 10, 15, 20];
const BOSS_HEALTH = {
    5: 50,
    10: 200,
    15: 200,
    20: 200
};

// Sons du jeu
const sounds = {
    shoot: new Audio('sounds/laser.mp3'),
    hit: new Audio('sounds/hit.mp3'),
    explosion: new Audio('sounds/explosion.mp3'),
    powerUp: new Audio('sounds/powerup.mp3'),
    enemyShoot: new Audio('sounds/enemy-laser.mp3'),
    ambience: new Audio('sounds/ambience.mp3'),
    popboss: new Audio('sounds/popboss.mp3'),
    hitboss: new Audio('sounds/hitboss.mp3')
};

// Configuration des sons
sounds.ambience.loop = true;
sounds.ambience.volume = 0.3;
sounds.shoot.volume = 0.4;
sounds.hit.volume = 0.5;
sounds.explosion.volume = 0.5;
sounds.powerUp.volume = 0.5;
sounds.enemyShoot.volume = 0.5;
sounds.popboss.volume = 0.6;
sounds.hitboss.volume = 0.5;

// État du son
let isSoundMuted = false;

// Gestion du bouton son
soundButton.addEventListener('click', toggleSound);

function toggleSound() {
    isSoundMuted = !isSoundMuted;
    
    // Mettre à jour l'apparence du bouton
    if (isSoundMuted) {
        soundButton.textContent = '✕';
        soundButton.classList.add('muted');
    } else {
        soundButton.textContent = '♫';
        soundButton.classList.remove('muted');
    }
    
    // Mettre à jour le volume de tous les sons
    Object.values(sounds).forEach(sound => {
        sound.muted = isSoundMuted;
    });
}

function playSound(soundName) {
    if (!isSoundMuted && sounds[soundName]) {
        const sound = sounds[soundName].cloneNode();
        sound.volume = soundName === 'ambience' ? 0.3 : 0.5;
        sound.play();
    }
}

let gameStarted = false;
let gameOver = false;
let score = 0;
let scoreSubmitted = false;
let backgroundImage = new Image();
backgroundImage.src = 'images/space.jpg';
let stars = [];
let particles = [];

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
let currentRound = 1;
let roundStartTime = 0;
let enemyShootInterval = ENEMY_SHOOT_INTERVAL_START;
let currentEnemySpawnRate = INITIAL_ENEMY_SPAWN_RATE;
let boss = null;
let isBossRound = false;

// Chargement des images
const characterImages = {
    'Ohe': new Image(),
    'Bilel': new Image(),
    'Abdel': new Image(),
    'Flouzi': new Image(),
    'Elies': new Image(),
    'boss': new Image()
};

characterImages['Ohe'].src = 'assets/Ohe.jpg';
characterImages['Bilel'].src = 'assets/Bilel.jpg';
characterImages['Abdel'].src = 'assets/Abdel.jpg';
characterImages['Flouzi'].src = 'assets/Flouzi.jpg';
characterImages['Elies'].src = 'assets/Elies.jpg';
characterImages['boss'].src = 'assets/boss.png';

const characters = ['Ohe', 'Bilel', 'Abdel', 'Flouzi', 'Elies'];
const characterColors = {
    'Ohe': '#FF4444',
    'Bilel': '#44FF44',
    'Abdel': '#4444FF',
    'Flouzi': '#FFFF44',
    'Elies': '#FF44FF'
};

tryAgainButton.style.display = 'none';
selectCharacterButton.style.display = 'none';

// Gestionnaire d'événements pour le bouton de sélection du personnage
selectCharacterButton.addEventListener('click', () => {
    gameOver = false;
    gameStarted = false;
    characterSelect.classList.remove('hidden');
    tryAgainButton.style.display = 'none';
    selectCharacterButton.style.display = 'none';
});

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
    gameStartTime = Date.now();
    lastDifficultyIncrease = gameStartTime;
    currentRound = 1;
    roundStartTime = Date.now();
    enemyShootInterval = ENEMY_SHOOT_INTERVAL_START;
    currentEnemySpawnRate = INITIAL_ENEMY_SPAWN_RATE;
    
    // Démarrer la musique d'ambiance
    if (!isSoundMuted) {
        sounds.ambience.play().catch(error => console.log('Erreur de lecture de la musique:', error));
    }
    
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
    currentRound = 1;
    roundStartTime = Date.now();
    enemyShootInterval = ENEMY_SHOOT_INTERVAL_START;
    currentEnemySpawnRate = INITIAL_ENEMY_SPAWN_RATE;
    
    // Cacher le bouton Try Again
    tryAgainButton.style.display = 'none';
    
    // Cacher le bouton de sélection du personnage
    selectCharacterButton.style.display = 'none';
    
    // Arrêter la musique d'ambiance
    sounds.ambience.pause();
    sounds.ambience.currentTime = 0;
    
    // Relancer la musique d'ambiance si le son n'est pas coupé
    if (!isSoundMuted) {
        sounds.ambience.play();
    }
    
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
    const side = Math.floor(Math.random() * 4); // 0: haut, 1: droite, 2: bas, 3: gauche
    let x, y;
    
    switch(side) {
        case 0: // haut
            x = Math.random() * canvas.width;
            y = -50;
            break;
        case 1: // droite
            x = canvas.width + 50;
            y = Math.random() * canvas.height;
            break;
        case 2: // bas
            x = Math.random() * canvas.width;
            y = canvas.height + 50;
            break;
        case 3: // gauche
            x = -50;
            y = Math.random() * canvas.height;
            break;
    }
    
    return {
        x,
        y,
        size: 40,
        health: 100,
        type: enemyName,
        lastShootTime: Date.now() - (Math.random() * enemyShootInterval) // Randomiser le premier tir
    };
}

function createBoss() {
    return {
        x: canvas.width - BOSS_SIZE * 2,
        y: canvas.height / 2,
        size: BOSS_SIZE,
        health: BOSS_HEALTH[currentRound],
        maxHealth: BOSS_HEALTH[currentRound],
        direction: 1,
        lastShot: 0,
        image: characterImages['boss']
    };
}

function updatePlayer() {
    if (keys['z'] || keys['ArrowUp']) player.y = Math.max(PLAYER_SIZE, player.y - PLAYER_SPEED);
    if (keys['s'] || keys['ArrowDown']) player.y = Math.min(canvas.height - PLAYER_SIZE, player.y + PLAYER_SPEED);
    if (keys['q'] || keys['ArrowLeft']) player.x = Math.max(PLAYER_SIZE, player.x - PLAYER_SPEED);
    if (keys['d'] || keys['ArrowRight']) player.x = Math.min(canvas.width - PLAYER_SIZE, player.x + PLAYER_SPEED);
}

function updateEnemies() {
    const now = Date.now();
    
    // Gestion du round et du boss
    if (now - roundStartTime >= ROUND_DURATION) {
        currentRound++;
        roundStartTime = now;
        
        // Faire exploser tous les ennemis restants
        enemies.forEach(enemy => {
            // Effet d'explosion pour chaque ennemi
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8;
                particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    dx: Math.cos(angle) * 3,
                    dy: Math.sin(angle) * 3,
                    size: 4,
                    alpha: 1,
                    color: '#e74c3c',
                    type: 'explosion'
                });
            }
            playSound('explosion');
        });
        
        // Vider le tableau des ennemis et des balles
        enemies = [];
        bullets = [];
        
        // Régénérer la santé du joueur
        player.health = 100;
        playSound('powerUp');
        
        // Effet visuel de guérison
        particles.push({
            x: player.x,
            y: player.y,
            size: PLAYER_SIZE * 2,
            alpha: 1,
            color: '#2ecc71',
            type: 'heal'
        });
        
        // Vérifier si c'est un round de boss
        if (BOSS_ROUNDS.includes(currentRound)) {
            isBossRound = true;
            boss = createBoss();
            playSound('popboss'); // Jouer le son d'apparition du boss
        } else {
            isBossRound = false;
            boss = null;
            // Mise à jour de la difficulté pour les rounds normaux
            enemyShootInterval = Math.max(500, ENEMY_SHOOT_INTERVAL_START - (currentRound - 1) * ENEMY_SHOOT_INTERVAL_DECREASE);
            currentEnemySpawnRate = Math.max(1000, INITIAL_ENEMY_SPAWN_RATE - (currentRound - 1) * ENEMY_SPAWN_RATE_DECREASE);
        }
    }

    // Si c'est un round de boss, ne pas spawner d'ennemis normaux
    if (isBossRound) {
        updateBoss();
        return;
    }
    
    // Spawn des ennemis
    if (now - lastEnemySpawn > currentEnemySpawnRate) {
        const availableCharacters = characters.filter(c => c !== selectedCharacter);
        const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        const newEnemy = createEnemy(randomCharacter);
        enemies.push(newEnemy);
        lastEnemySpawn = now;
    }

    // Mise à jour de chaque ennemi
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Logique de tir des ennemis
        if (now - enemy.lastShootTime > enemyShootInterval) {
            // Calculer la direction vers le joueur
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const angle = Math.atan2(dy, dx);
            
            // Créer la balle
            bullets.push({
                x: enemy.x,
                y: enemy.y,
                speed: BULLET_SPEED,
                dx: Math.cos(angle),
                dy: Math.sin(angle),
                isPlayerBullet: false,
                size: BULLET_SIZE
            });
            
            enemy.lastShootTime = now;
            playSound('enemyShoot');
        }
        
        // Déplacement des ennemis
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
            // Jouer le son de hit
            playSound('hit');
        }

        // Vérifier les collisions avec les balles
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (bullet.isPlayerBullet) {
                if (checkCollision(bullet, enemy)) {
                    bullets.splice(j, 1);
                    enemy.health -= 25; // 2 coups pour tuer
                    
                    if (enemy.health <= 0) {
                        enemies.splice(i, 1);
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

function updateBoss() {
    if (!boss) return;

    // Déplacement vertical
    boss.y += BOSS_SPEED * boss.direction;
    
    // Changement de direction aux bords
    if (boss.y <= BOSS_SIZE/2 || boss.y >= canvas.height - BOSS_SIZE/2) {
        boss.direction *= -1;
    }
    
    // Tir du boss
    const now = Date.now();
    if (now - boss.lastShot > BOSS_SHOOT_INTERVAL) {
        // Tir de 3 balles
        const angleSpread = 15; // degrés entre chaque balle
        const centerAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
        
        for (let i = -1; i <= 1; i++) {
            const angle = centerAngle + (i * angleSpread * Math.PI / 180);
            const bullet = {
                x: boss.x,
                y: boss.y,
                size: BULLET_SIZE,
                speed: BULLET_SPEED,
                dx: Math.cos(angle),
                dy: Math.sin(angle),
                fromEnemy: true
            };
            bullets.push(bullet);
        }
        
        playSound('enemyShoot');
        boss.lastShot = now;
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.speed * bullet.dx;
        bullet.y += bullet.speed * bullet.dy;
        
        // Vérification des collisions avec les murs
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Vérifier les collisions avec les ennemis
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
            // Jouer le son de hit
            playSound('hit');
        }
        
        // Vérifier les collisions avec le boss
        if (boss && !bullet.fromEnemy && checkCollision(bullet, boss)) {
            boss.health--;
            bullets.splice(i, 1);
            playSound('hitboss'); // Jouer le son quand le boss est touché
            
            // Si le boss est vaincu
            if (boss.health <= 0) {
                score += 1000; // Bonus pour avoir vaincu le boss
                boss = null;
                isBossRound = false;
                playSound('explosion');
                
                // Régénérer la santé du joueur
                player.health = 100;
                playSound('powerUp');
                
                // Effet visuel de guérison
                particles.push({
                    x: player.x,
                    y: player.y,
                    size: PLAYER_SIZE * 2,
                    alpha: 1,
                    color: '#2ecc71',
                    type: 'heal'
                });
                
                continue;
            }
            continue;
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
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Dessiner les particules
    particles = particles.filter(particle => {
        if (particle.type === 'heal') {
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            particle.size += 2;
            particle.alpha -= 0.05;
            
            return particle.alpha > 0;
        } else if (particle.type === 'explosion') {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            
            // Mettre à jour la position et l'état de la particule
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.alpha -= 0.02;
            
            return particle.alpha > 0;
        }
        return true;
    });
}

function drawHealthBar() {
    // Barre de vie du joueur
    const barWidth = 300;
    const barHeight = 30;
    const borderRadius = 15;
    const x = (canvas.width - barWidth) / 2;
    const y = 20;
    const healthPercent = player.health / 100;

    // Fond de la barre de vie avec coins arrondis
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, borderRadius);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Barre de vie avec coins arrondis
    let barColor;
    
    if (healthPercent > 0.6) {
        const gradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        gradient.addColorStop(0, '#2ecc71');
        gradient.addColorStop(1, '#27ae60');
        barColor = gradient;
    } else if (healthPercent > 0.3) {
        const gradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        gradient.addColorStop(0, '#f1c40f');
        gradient.addColorStop(1, '#f39c12');
        barColor = gradient;
    } else {
        const gradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
        barColor = gradient;
    }
    
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth * healthPercent, barHeight, borderRadius);
    ctx.fillStyle = barColor;
    ctx.fill();
    
    // Texte de la vie du joueur
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.health)} / 100`, x + barWidth/2, y + 20);

    // Barre de vie du boss (si présent)
    if (boss) {
        const bossY = y + barHeight + 10;
        const bossHealthPercentage = boss.health / boss.maxHealth;

        // Fond de la barre de vie du boss avec coins arrondis
        ctx.beginPath();
        ctx.roundRect(x, bossY, barWidth, barHeight, borderRadius);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Barre de vie du boss avec coins arrondis et gradient
        const bossGradient = ctx.createLinearGradient(x, bossY, x + barWidth * bossHealthPercentage, bossY);
        bossGradient.addColorStop(0, '#e74c3c');
        bossGradient.addColorStop(1, '#c0392b');

        ctx.beginPath();
        ctx.roundRect(x, bossY, barWidth * bossHealthPercentage, barHeight, borderRadius);
        ctx.fillStyle = bossGradient;
        ctx.fill();

        // Texte de la vie du boss
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Boss: ${Math.ceil(boss.health)} / ${boss.maxHealth}`, x + barWidth/2, bossY + 20);
    }
}

function drawBoss() {
    if (!boss) return;
    
    // Dessiner le boss
    ctx.save();
    if (boss.image && boss.image.complete) {
        ctx.drawImage(boss.image, boss.x - boss.size/2, boss.y - boss.size/2, boss.size, boss.size);
    } else {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(boss.x - boss.size/2, boss.y - boss.size/2, boss.size, boss.size);
    }
    
    // Barre de vie du boss
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarY = boss.y - boss.size/2 - 15;
    
    // Fond de la barre de vie
    ctx.fillStyle = '#333333';
    ctx.fillRect(boss.x - healthBarWidth/2, healthBarY, healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(boss.x - healthBarWidth/2, healthBarY, healthBarWidth * (boss.health / boss.maxHealth), healthBarHeight);
    
    ctx.restore();
}

function gameLoop() {
    if (!gameStarted || gameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateBackground();
    drawBackground();
    
    updatePlayer();
    drawPlayer();
    
    if (isBossRound) {
        updateBoss();
        drawBoss();
    } else {
        updateEnemies();
        drawEnemies();
    }
    
    updateBullets();
    drawBullets();
    
    drawHealthBar();
    
    // Afficher le score
    ctx.fillStyle = '#4a90e2';
    ctx.font = 'bold 24px Orbitron';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(74, 144, 226, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    // Afficher le meilleur score
    ctx.textAlign = 'right';
    const bestScore = highScores.length > 0 ? Math.max(...highScores.map(s => s.score)) : 0;
    ctx.fillText(`Meilleur Score: ${bestScore}`, canvas.width - 20, 40);
    
    // Afficher le round et le temps restant
    ctx.textAlign = 'left';
    ctx.fillText(`Round: ${currentRound}`, 20, 80);
    
    const timeLeft = Math.max(0, Math.ceil((ROUND_DURATION - (Date.now() - roundStartTime)) / 1000));
    ctx.fillText(`Temps: ${timeLeft}s`, 20, 120);
    
    ctx.shadowBlur = 0;
    
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
        ctx.fillStyle = bullet.isPlayerBullet ? '#ffff00' : '#fff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
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
            const image = characterImages[enemy.type];
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
            ctx.fillText(enemy.type, enemy.x, healthBarY - 5);
        }
    });
}

function showScoreboard() {
    gameOver = true;
    const boardWidth = 400;
    const boardHeight = 600;
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
        const existingScore = highScores.find(s => s.name === player.name && s.score === score);
        if (!existingScore) {
            saveScore(player.name, score);
        }
        scoreSubmitted = true;
    }
    
    // Liste des scores (limité à 8)
    ctx.font = '16px Arial';
    highScores.slice(0, 8).forEach((scoreData, index) => {
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

    // Afficher les boutons
    tryAgainButton.style.display = 'block';
    selectCharacterButton.style.display = 'block';
}

function saveScore(playerName, score) {
    highScores.push({ name: playerName, score: score, date: new Date().toISOString() });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 8); // Garder uniquement les 8 meilleurs scores

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

// Gestion des touches
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let lastShotTime = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Clic gauche
        isMouseDown = true;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // Clic gauche
        isMouseDown = false;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (gameStarted && !gameOver) {
        shootShotgun(player.x, player.y, mouseX, mouseY);
    }
});

function updatePlayer() {
    // Déplacement du joueur
    if (keys['z'] || keys['ArrowUp']) player.y -= PLAYER_SPEED;
    if (keys['s'] || keys['ArrowDown']) player.y += PLAYER_SPEED;
    if (keys['q'] || keys['ArrowLeft']) player.x -= PLAYER_SPEED;
    if (keys['d'] || keys['ArrowRight']) player.x += PLAYER_SPEED;

    // Maintenir le joueur dans les limites du canvas
    player.x = Math.max(PLAYER_SIZE, Math.min(canvas.width - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(canvas.height - PLAYER_SIZE, player.y));

    // Tir automatique si le bouton gauche est maintenu
    if (isMouseDown && Date.now() - lastShotTime > 250) {
        shootNormal(player.x, player.y, mouseX, mouseY);
        lastShotTime = Date.now();
    }
}

function shootNormal(startX, startY, targetX, targetY) {
    const angle = Math.atan2(targetY - startY, targetX - startX);
    bullets.push({
        x: startX,
        y: startY,
        speed: BULLET_SPEED,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        isPlayerBullet: true,
        size: BULLET_SIZE
    });
    playSound('shoot');
}

function shootShotgun(startX, startY, targetX, targetY) {
    const baseAngle = Math.atan2(targetY - startY, targetX - startX);
    for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + (i * Math.PI / SHOTGUN_SPREAD);
        bullets.push({
            x: startX,
            y: startY,
            speed: BULLET_SPEED,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            isPlayerBullet: true,
            size: BULLET_SIZE
        });
    }
    playSound('shoot');
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
