document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext('2d');

    //#region Camera Class

    class Camera {
        constructor() {
            this.y = 0;
            this.x = 0;
            this.width = canvas.width;
            this.height = canvas.height;
        };
    }

    //#endregion

    //#region World Class

    class World {
        
        //#region Constructor 

        constructor() {
            this.gameIsActive = false;
            this.gravity = 1;
            this.fps = 16;
            this.jumpForce = 15;
            this.movementSpeed = 10;
            this.enemies = [];
            this.coins = [];
            this.orbs = [];
            this.platforms = [];
            this.lowestPlatforms = [];
            this.platformCount = 15;
            this.platformWidth = 75;
            this.platformIndex = 0;
            this.canvasWidth = canvas.width;
            this.sectionHeight = 300; 
            this.sections = 4;
            this.sectionWidth = this.canvasWidth / this.sections; 
            this.minSpacing = 30;
            this.lives = 3;
            this.score = 0;
            this.camera = new Camera();
            this.player = null;
            this.addMovementControls();
        }

        //#endregion

        //#region Prepare Game

        prepareGame() {
            this.enemies = [];
            this.coins = [];
            this.platforms = [];
            this.lives = 3;
            this.score = 0;
            this.camera.y = 0;
            this.generatePlatforms();
            this.createPlayer();
            this.render();
        }

        createPlayer() {
            this.player = new Player(this.platforms[0]);
        }

        //#endregion

        //#region Game Loop

        gameLoop() {
            if (this.gameIsActive) {
                const frameDelay = 1000 / this.fps;

                const loop = () => {
                    this.update();
                    this.render();

                    setTimeout(() => {
                        if (this.gameIsActive) requestAnimationFrame(loop);
                    }, frameDelay);
                };
                requestAnimationFrame(loop);
            }
        } 

        update() {
            this.applyPhysics();
            this.player.movePlayer();
            this.updateCamera();
            this.findLowestPlatform();
            this.regeneratePlatforms();
            this.platforms.forEach(platform => platform.update());
            this.orbs.forEach(orb => orb.update());
        
            if (this.player.x + this.player.width > canvas.width) {
                if (this.player.x > canvas.width / 2) {
                    this.player.x = this.player.x - canvas.width;
                }
            } else if (this.player.x < 0) {
                if (this.player.x + this.player.width < canvas.width / 2) {
                    this.player.x = this.player.x + canvas.width;
                }
            }
        
            if (this.player.y < this.player.startY) {
                const distanceTraveled = Math.floor((this.player.startY - this.player.y) / 2);
                if (distanceTraveled > 0) {
                    this.score += distanceTraveled;
                    this.player.startY = this.player.y;
                }
            }
        
            for (let i = 0; i < this.platforms.length; i++) {
                const platform = this.platforms[i];
                if (this.rectCollisionDetector(this.player, platform)) {
                    this.player.dy = 0;
                    this.player.y = platform.y - this.player.height;
                    this.player.dy = -this.jumpForce;
                    if (platform.type === 'breakable') {
                        this.platforms.splice(i, 1); 
                    }
                    break;
                }
            }
        
            this.coins = this.coins.filter(coin => {
                if (this.circleCollisionDetector(this.player, coin)) {
                    this.score += 50; 
                    return false; 
                }
                return true; 
            });

            this.checkPlayerStatus();
        }
        

        render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.player.render(this.camera);
            this.platforms.forEach(platform => platform.render(this.camera));
            this.coins.forEach(coin => coin.render(this.camera)); 
            this.enemies.forEach(enemy => enemy.render(this.camera)); 
            this.orbs.forEach(orb => orb.render(this.camera)); 

            this.renderLives();
            this.renderScore();
        }

        renderLives() {
            for (let i = 0; i < this.lives; i++) {
                ctx.fillStyle = 'red';
                ctx.fillRect(10 + (i * 30), 10, 20, 20);
            }
        }

        renderScore() {
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(`Score: ${this.score}`, canvas.width - 120, 30);
        }

        //#endregion

        //#region Game Logic

        applyPhysics() {
            if (this.player.dy < 19) {
                this.player.dy += this.gravity;
            }
        }

        updateCamera() {
            if (this.player.minY < this.camera.y + canvas.height / 2) {
                this.camera.y = this.player.minY - canvas.height / 2;
            }
        }

        checkPlayerStatus() {
            this.enemies.forEach(enemy => {
                if (this.enemyCollisionDetector(this.player, enemy)) {
                    this.lives--; 
                    this.handlePlayerRespawn();
                }
            });
            
            if (this.player.y > this.camera.y + canvas.height + this.player.height) {
                this.lives--;
                this.handlePlayerRespawn();
            }

            this.orbs.forEach(orb => {
                if (this.circleCollisionDetector(this.player, orb)) {
                    this.lives--; 
                    this.handlePlayerRespawn();
                }
            });

            this.handlePlayerLife();
        }
        
        handlePlayerLife() {
            if (this.lives <= 0) {
                this.gameIsActive = false;
                this.gameOver();
            }
        }
        
        handlePlayerRespawn() {
            if (this.lives > 0) {

                const priorityPlatform = this.lowestPlatforms.reduce((prev, curr) => {
                    return (prev.id < curr.id) ? prev : curr;
                });

                this.enemies = this.enemies.filter(e => e.platformId !== priorityPlatform.id);
        
                this.player.y = priorityPlatform.y - 55;
                this.player.x = priorityPlatform.x + (priorityPlatform.width / 2) - (this.player.width / 2);
                this.player.dy = 0;
            } else {
                this.gameIsActive = false;
                this.gameOver();
            }
        }

        addMovementControls() {
            const keys = {};

            document.addEventListener('keydown', (event) => {
                keys[event.key] = true;

                if (keys['ArrowRight'] && keys['ArrowLeft']) {
                    this.player.dx = 0;
                } else if (keys['ArrowRight']) {
                    this.player.dx = this.movementSpeed;
                } else if (keys['ArrowLeft']) {
                    this.player.dx = -this.movementSpeed;
                }
            });

            document.addEventListener('keyup', (event) => {
                keys[event.key] = false;

                if (!keys['ArrowRight'] && !keys['ArrowLeft']) {
                    this.player.dx = 0;
                } else if (keys['ArrowRight']) {
                    this.player.dx = this.movementSpeed;
                } else if (keys['ArrowLeft']) {
                    this.player.dx = -this.movementSpeed;
                }
            });
        }

        findLowestPlatform() {
            const filteredPlatforms = this.platforms.filter(p => p.y <= this.camera.y + 800);
            const lowestPlatformY = Math.max(...filteredPlatforms.map(p => p.y));
            this.lowestPlatforms = this.platforms.filter(p => p.y === lowestPlatformY);
        }

        gameOver() {
            menu.style.display = 'block';
            menu.querySelector("#info").textContent = "Game Over!";
            startBtn.textContent = "Restart";
        }

        //#endregion

        //#region Collision Detectors

        rectCollisionDetector(player, platform) {
            const playerBottom = player.y + player.height;
            const platformTop = platform.y;
            const playerBottom10Percent = player.y + player.height * 0.85;
            
            if (
                player.dy > 0 && 
                playerBottom >= platformTop &&  
                playerBottom10Percent <= platformTop + platform.height &&  
                player.x + player.width > platform.x && 
                player.x < platform.x + platform.width 
            ) {
                return true;  
            }
            
            return false;
        }

        circleCollisionDetector(player, circle) {
            return (
                player.x < circle.x + circle.size &&
                player.x + player.width > circle.x &&
                player.y < circle.y + circle.size &&
                player.y + player.height > circle.y
            );
        }

        enemyCollisionDetector(player, enemy) {
            return (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            );
        }

        //#endregion     
        
        //#region Platform Spawn Logic

        generatePlatforms() {
            const startY = canvas.height - 20;
            let currentY = startY;
            
            const firstPlatformX = (this.canvasWidth - this.platformWidth) / 2;
            this.platforms.push(new Platform(firstPlatformX, startY, this.platformIndex));  
            currentY -= Math.floor(Math.random() * (55 - 50 + 1)) + 50;  
            
            let platformsInSection = 0;
            let sectionStartY = currentY - this.sectionHeight;
            let lastTwoSections = [Math.floor(firstPlatformX / this.sectionWidth), null];

            for (let i = 1; i < this.platformCount; i++) {
                if (currentY <= sectionStartY) {
                    sectionStartY -= this.sectionHeight;
                    platformsInSection = 0; 
                }

                const platformsPerSection = Math.random() < 0.8 ? 2 : 3;

                if (platformsInSection < platformsPerSection) {
                    let spacingY = Math.floor(Math.random() *(65 - 50 + 1)) + 50; 

                    const newPlatforms = this.spawnPlatformsAtY(currentY, lastTwoSections);

                    newPlatforms.forEach(platform => {
                        this.platforms.push(platform);
                        
                        if (platform.type === 'normal') {
                            this.spawnCoinsAndEnemies(platform.x, platform.y, this.platformWidth, platform.id);
                        }

                        if (platform.type === 'moving') {
                            this.orbs.push(new Orb(platform.x + platform.width / 2, platform.y, platform.id));
                        }
                    });
                    lastTwoSections.shift();
                    lastTwoSections.push(Math.floor(newPlatforms[newPlatforms.length - 1].x / this.sectionWidth)); 

                    currentY -= spacingY;
                } else {
                    currentY = sectionStartY;
                }
            }
        }

        regeneratePlatforms() {
            this.platforms = this.platforms.filter(platform => platform.y <= this.camera.y + 825);
            const idsInPlatforms = this.platforms.map(obj => obj.id);
            this.coins = this.coins.filter(obj => idsInPlatforms.includes(obj.platformId));
            this.enemies = this.enemies.filter(obj => idsInPlatforms.includes(obj.platformId));
            
            let lastPlatformY = this.platforms[this.platforms.length - 1].y;
            let sectionStartY = lastPlatformY - this.sectionHeight;
            let platformsInSection = 0;
            let lastTwoSections = [
                Math.floor(this.platforms[this.platforms.length - 1].x / this.sectionWidth),
                this.platforms.length > 1 ? Math.floor(this.platforms[this.platforms.length - 2].x / this.sectionWidth) : null
            ];

            while (this.platforms.length < this.platformCount) {
                if (lastPlatformY <= sectionStartY) {
                    sectionStartY -= this.sectionHeight;
                    platformsInSection = 0; 
                }

                const platformsPerSection = Math.random() < 0.8 ? 2 : 3;

                if (platformsInSection < platformsPerSection) {
                    const spacingY = Math.floor(Math.random() * (65 - 50 + 1)) + 50;
                    lastPlatformY -= spacingY;

                    const newPlatforms = this.spawnPlatformsAtY(lastPlatformY, lastTwoSections);

                    newPlatforms.forEach(platform => {
                        this.platforms.push(platform);
                        
                        if (platform.type === 'normal') {
                            this.spawnCoinsAndEnemies(platform.x, platform.y, this.platformWidth, platform.id);
                        }

                        if (platform.type === 'moving' && Math.random() < 0.5) {
                            this.orbs.push(new Orb(platform.x + platform.width / 2, platform.y, platform.id));
                        }
                    });

                    platformsInSection += newPlatforms.length; 
                    lastTwoSections.shift();
                    lastTwoSections.push(Math.floor(newPlatforms[newPlatforms.length - 1].x / this.sectionWidth)); 
                } else {
                    lastPlatformY = sectionStartY;
                }
            }
        }        
        
        spawnPlatformsAtY(currentY, lastTwoSections) {
            const platforms = [];
        
            const availableSections = [...Array(this.sections).keys()].filter(section => 
                !lastTwoSections.includes(section)
            );
        
            const platformSection = availableSections[Math.floor(Math.random() * availableSections.length)];
            
            const platformX = platformSection * this.sectionWidth + (this.sectionWidth - this.platformWidth) / 2;
        
            const isBreakable = Math.random() < 0.1;
            const isMoving = Math.random() < 0.1;
        
            let type;
            if (isMoving && isBreakable) {
                type = Math.random() < 0.5 ? 'moving' : 'breakable';
            } else {
                type = isMoving ? 'moving' : 
                       isBreakable ? 'breakable' : 
                       'normal';
            }
        
            platforms.push(new Platform(platformX, currentY, this.platformIndex++, type));
        
            return platforms;
        }
        
        createMovingPlatform(x, y, index) {
            const movingPlatform = new Platform(x, y, index, 'moving');
            movingPlatform.direction = 1; 
            movingPlatform.initialX = x;
            return movingPlatform;
        } 

        spawnCoinsAndEnemies(platformX, platformY, platformWidth, platformId) {
            const platform = this.platforms.find(p => p.id === platformId);
            if (platform.color === 'yellow') return;

            const coinPart = Math.floor(Math.random() * 3);
            let enemyPart;
            do {
                enemyPart = Math.floor(Math.random() * 3); 
            } while (enemyPart === coinPart); 

            const coinX = this.defineX(coinPart, platformWidth, platformX, 'coin');
            const enemyX = this.defineX(enemyPart, platformWidth, platformX, 'enemy'); 

            if (Math.random() < 0.1) {
                this.coins.push(new Coin(coinX, platformY - 15, platformId));
            }
        
            if (Math.random() < 0.1) {
                this.enemies.push(new Enemy(enemyX, platformY - 60, platformId));
            }
        }       

        defineX(index, pWidth, pX, type) {
            if (index === 0) {
                return pX;
            } else if (index === 1) {
                if (type === 'coin') {
                    return pWidth / 2 + pX - 12.5;
                } else {
                    return pWidth / 2 + pX - 15;
                }   
            } else {
                if (type === 'coin') {
                    return pWidth + pX - 25;    
                } else {
                    return pWidth + pX - 30;    
                } 
            }
        }

        //#endregion
    }

    //#endregion

    //#region Player Class

    class Player {
        constructor(platform) {
            this.x = platform.x + platform.width / 2 - 5;
            this.y = platform.y - 60;
            this.width = 30;
            this.height = 60;
            this.dx = 0;
            this.dy = 0;
            this.minY = this.y;
            this.startY = this.y;
        }

        render(camera) {
            let screenX = this.x;
            let screenY = this.y - camera.y;

            ctx.fillStyle = 'green';
            ctx.fillRect(screenX, screenY, this.width, this.height);

            if (screenX + this.width > canvas.width) {
                const overflowRight = (screenX + this.width) - canvas.width;
                ctx.fillRect(0, screenY, overflowRight, this.height);
            }

            if (screenX < 0) {
                const overflowLeft = Math.abs(screenX);
                ctx.fillRect(canvas.width - overflowLeft, screenY, overflowLeft, this.height);
            }
        }

        movePlayer() {
            this.x += this.dx;
            this.y += this.dy;

            if (this.y < this.minY) {
                this.minY = this.y;
            }

            if (this.x > canvas.width) {
                this.x = this.x - canvas.width;
            } else if (this.x + this.width < 0) {
                this.x = canvas.width + this.x;
            }
        }
    }

    //#endregion

    //#region Platform Class

    class Platform {
        constructor(x, y, id, type = 'normal') {
            this.x = x;
            this.y = y;
            this.width = 75;
            this.height = 10;
            this.id = id;
            this.type = type; 
            this.direction = 0; 
            this.initialX = x; 
            this.movementRange = 25; 
            this.movementSpeed = 2; 
            if (this.type === 'moving') {
                this.direction = 1; 
            }
        }
    
        render(camera) {
            ctx.fillStyle = 
            this.type === 'normal' ? 'blue' :
            this.type === 'moving' ? 'black' :
            'yellow';
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
        }

        update() {   
            if (this.type === 'moving') {
                this.x += this.direction * this.movementSpeed;
                if (this.x >= this.initialX + this.movementRange || this.x <= this.initialX - this.movementRange) {
                    this.direction *= -1; 
                }
            }
        }
    }

    //#endregion

    //#region Orb Class
    
    class Orb {
        constructor(x, y, platformId) {
            this.x = x;
            this.y = y;
            this.size = 5; 
            this.dy = 2; 
            this.platformId = platformId; 
        }

        update() {
            this.y += this.dy; 
        }

        render(camera) {
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }
    }

    //#endregion

    //#region Coin Class

    class Coin {
        constructor(x, y, platformId) {
            this.x = x;
            this.y = y;
            this.size = 25;
            this.platformId = platformId;
        }

        render(camera) {
            const screenX = this.x;
            const screenY = this.y - camera.y;

            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(screenX + this.size / 2, screenY, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    //#endregion

    class Enemy {
        constructor(x, y, platformId) {
            this.x = x;
            this.y = y;
            this.width = 30;
            this.height = 60;
            this.platformId = platformId;
        }

        render(camera) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
        }
    }

    const world = new World();

    //#region Handle Menu

    const menu = document.querySelector("#menu");
    const startBtn = menu.querySelector("#start-btn");
    const countdown = document.querySelector("#countdown");

    startBtn.addEventListener('click', () => {
        world.prepareGame();
        menu.style.display = 'none';

        countdown.textContent = 3;
        countdown.style.display = "block";
        
        let currentCount = 2;
        const interval = setInterval(() => {
            currentCount--;
            countdown.textContent = currentCount + 1;

            if (currentCount < 0) {
                clearInterval(interval);
                countdown.style.display = "none";
                world.gameIsActive = true;
                world.gameLoop(); 
            }
        }, 1000);
    });

    //#endregion

});
