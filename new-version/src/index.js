document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext('2d');

    //#region World Class

    class World {
        
        //#region Constructor 

        constructor() {
            this.gameIsActive = false;
            this.gravity = 1;
            this.fps = 16;
            this.enemies = [];
            this.coins = [];
            this.hearts = [];
            this.jetpacks = [];
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
            this.heightScore = 0;
            this.enemiesKilled = 0;
            this.coinsPicked = 0;
            this.player = null;
            this.spear = null;
        }

        //#endregion

        //#region Prepare Game

        prepareGame() {
            this.timer = new Timer();
            this.camera = new Camera();
            this.enemies = [];
            this.coins = [];
            this.hearts = [];
            this.jetpacks = [];
            this.orbs = [];
            this.platforms = [];
            this.lives = 3;
            this.score = 0;
            this.heightScore = 0;
            this.enemiesKilled = 0;
            this.coinsPicked = 0;
            this.camera.y = 0;
            this.generatePlatforms();
            this.player = new Player(this.platforms[0]);
            this.spear = new Spear(this.player.x, this.player.y)
            this.render();
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
            this.player.update();
            this.camera.update();
            this.findLowestPlatform();
            this.regeneratePlatforms();
            this.spear.update(this.player.x, this.player.y);
            this.platforms.forEach(platform => platform.update());
            this.orbs.forEach(orb => orb.update());

            if (this.timer.gameTime !== 0) {
                this.timer.update();
            } else {
                this.gameOver();
            }

            this.handlePlayerLifes();
        }

        render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.player.render(this.camera);
            this.spear.render(this.camera);
            this.platforms.forEach(platform => platform.render(this.camera));
            this.coins.forEach(coin => coin.render(this.camera)); 
            this.enemies.forEach(enemy => enemy.render(this.camera)); 
            this.orbs.forEach(orb => orb.render(this.camera)); 
            this.hearts.forEach(heart => heart.render(this.camera))
            this.jetpacks.forEach(jetpack => jetpack.render(this.camera))

            this.timer.render();
            this.renderLives();
            this.renderScore();
        }

        renderLives() {
            for (let i = 0; i < this.lives; i++) {
                ctx.fillStyle = 'pink';
                ctx.fillRect(10 + (i * 20), 17.5, 15, 15);
            }
        }

        renderScore() {
            ctx.fillStyle = 'black';
            ctx.font = '15px Arial';
            const xSpace = 5;
            let order = 0;
            if (this.score > 0) {
                order = Math.floor(Math.log10(Math.abs(this.score))) + 1;
            }
            ctx.fillText(`Score: ${this.score}`, canvas.width - 65 - (xSpace * order), 30);
        }

        //#endregion

        //#region Game Logic

        applyPhysics() {

            if (this.player.dy < 19 && !this.player.isFlying) {
                this.player.dy += this.gravity;
            }

            if (this.player.dy > 0) {
                this.player.isJumping = false;
                this.player.isStuck = false;
            }

            this.hearts = this.hearts.filter(heart => {
                if (this.rectCollisionDetector(this.player, heart)) {
                    this.lives++;   
                    return false;  
                }
                return true;  
            });

            this.jetpacks = this.jetpacks.filter(jetpack => {
                if (this.rectCollisionDetector(this.player, jetpack)) {
                    this.player.isFlying = true;
                    this.player.dy = -2 * this.player.jumpForce;
                    setTimeout(() => {
                        this.player.isFlying = false;
                    }, 2000)
                    return false;  
                }
                return true;  
            });

            this.enemies = this.enemies.filter(enemy => {
                if (this.rectCollisionDetector(this.spear, enemy)) {
                    this.score += 100;   
                    this.enemiesKilled++;
                    return false;  
                }
                return true;  
            });

            this.coins = this.coins.filter(coin => {
                if (this.circleCollisionDetector(this.player, coin)) {
                    this.score += 50; 
                    this.coinsPicked++;
                    return false; 
                }
                return true; 
            });

            for (let i = 0; i < this.platforms.length; i++) {
                const platform = this.platforms[i];
                if (this.platformCollisionDetector(this.player, platform)) {
                    this.player.dy = 0; 
                    this.player.y = platform.y - this.player.height; 
            
                    if (platform.type === 'trampoline') {
                        if (this.player.isStuck) {
                            break; 
                        }
            
                        this.player.isStuck = true; 
                        this.player.stuckTimer = 4; 
            
                        setTimeout(() => {
                            this.player.isStuck = false; 
                            this.player.isJumping = true; 
                            this.player.dy = -this.player.jumpForce * 1.5; 
                        }, 1000); 
                    } else {
                        if (platform.type === 'breakable') {
                            this.platforms.splice(i, 1); 
                        }
                        this.player.dy = -this.player.jumpForce; 
                        this.player.isJumping = false; 
                    }
                    break; 
                }
            }
        }

        handlePlayerLifes() {
            this.enemies.forEach(enemy => {
                if (this.rectCollisionDetector(this.player, enemy)) {
                    this.lives--; 
                    this.player.isFlying = false;
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

            if (this.lives <= 0) {
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

        findLowestPlatform() {
            const filteredPlatforms = this.platforms.filter(p => p.y <= this.camera.y + 800);
            const lowestPlatformY = Math.max(...filteredPlatforms.map(p => p.y));
            this.lowestPlatforms = this.platforms.filter(p => p.y === lowestPlatformY);
        }

        gameOver() {
            this.gameIsActive = false;
            menu.classList.remove("hidden");
            generalInfo.textContent = "Game Over!";
            gameInfos.forEach(info => {
                
                if (info.id == "heightScore") {
                    info.textContent = `Height Score: ${this.heightScore}`
                } else if (info.id === "lives") {
                    info.textContent = `Remaining Lives: ${this.lives} x 100 = ${this.lives * 100}`
                } else if (info.id === "coinsPicked") {
                    info.textContent = `Coins Picked: ${this.coinsPicked} x 50 = ${this.coinsPicked * 50}`
                } else if (info.id === "enemiesKilled") {
                    info.textContent = `Enemies Killed: ${this.enemiesKilled} x 100 = ${this.enemiesKilled * 100}`
                } else {
                    info.textContent = `Total Score: ${this.score + this.lives * 100}`   
                }
                info.classList.remove("hidden")
            })
            startBtn.textContent = "Restart";
        }

        //#endregion

        //#region Collision Detectors

        platformCollisionDetector(player, platform) {
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

        circleCollisionDetector(rect, circle) {
            const radius = circle.size / 2;

            const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
            const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
            const distanceX = closestX - circle.x;
            const distanceY = closestY - circle.y;

            const distanceSquared = distanceX * distanceX + distanceY * distanceY;

            if (circle.size === 25) {
                return distanceSquared < (radius + 5) * (radius + 5);
            }
            return distanceSquared < (radius * radius);
        }

        rectCollisionDetector(player, enemy) {
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
                            this.spawnPickupsAndEnemies(platform.x, platform.y, this.platformWidth, platform.id);
                        }

                        if (platform.type === 'moving') {
                            this.orbs.push(new Orb(platform.x, platform.width, platform.y + 6, platform.id));
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
            this.platforms = this.platforms.filter(platform => platform.y <= this.camera.y + canvas.height + 20);
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
                            this.spawnPickupsAndEnemies(platform.x, platform.y, this.platformWidth, platform.id);
                        }

                        if (platform.type === 'moving' && Math.random() < 0.5) {
                            this.orbs.push(new Orb(platform.x, platform.width, platform.y + 6, platform.id));
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
        
            let isBreakable;
            let isMoving;
            let isTrampoline;
            if (this.platformIndex > 5) {
                isBreakable = Math.random() < 0.1;
                isMoving = Math.random() < 0.1;
                isTrampoline = Math.random() < 0.1; 
            }
            
            let type;
            if (isTrampoline) {
                type = 'trampoline'; 
            } else if (isMoving && isBreakable) {
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

        spawnPickupsAndEnemies(platformX, platformY, platformWidth, platformId) {
            const platform = this.platforms.find(p => p.id === platformId);
            if (platform.type === 'breakable' || platform.type === 'trampoline' || platform.type === 'moving') return;
            
            const availableParts = [0, 1, 2];
            
            const shuffle = (array) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            };
            
            shuffle(availableParts);
            
            const coinX = this.defineX(availableParts[0], platformWidth, platformX, 'coin');
            const enemyX = this.defineX(availableParts[1], platformWidth, platformX, 'enemy');
            const heartX = this.defineX(availableParts[2], platformWidth, platformX, 'heart');
            
            const objects = [];
            if (Math.random() < 0.1) {
                objects.push('coin');
            }
            if (platform.id > 5 && Math.random() < 0.1) {
                objects.push('enemy');
            }
            if (platform.id > 5 && Math.random() < 0.1) {
                objects.push('heart');
            }
            
            objects.length = Math.min(objects.length, 3);
            
            objects.forEach((object) => {
                switch (object) {
                    case 'coin':
                        this.coins.push(new Coin(coinX, platformY - 15, platformId));
                        break;
                    case 'enemy':
                        this.enemies.push(new Enemy(enemyX, platformY - 60, platformId));
                        break;
                    case 'heart':
                        this.hearts.push(new Heart(heartX, platformY - 25, platformId));
                        break;
                }
            });
            
        }
         
        defineX(index, pWidth, pX, type) {
            if (index === 0) {
                return pX;
            } else if (index === 1) {
                if (type === 'enemy') {
                    return pWidth / 2 + pX - 15;
                } else {
                    return pWidth / 2 + pX - 12.5;
                }
            } else {
                if (type === 'enemy') {
                    return pWidth + pX - 30;    
                } else {
                    return pWidth + pX - 25;
                }
            }
        }

        //#endregion
    }

    const world = new World();

    //#endregion

    //#region Camera Class

    class Camera {
        constructor() {
            this.y = 0;
            this.x = 0;
            this.width = canvas.width;
            this.height = canvas.height;
        };

        update() {
            if (world.player.minY < this.y + canvas.height / 2) {
                this.y = world.player.minY - canvas.height / 2;
            }
        }
    }

    //#endregion

    //#region Timer Class

    class Timer {
        constructor() {
            this.gameTime = 120;
            this.frame = 0;
        }

        update() {
            this.frame++;
            if (this.frame % 16 == 0) {
                this.gameTime--;
            }
        }

        render() {
            ctx.fillStyle = 'black';
            ctx.font = '15px Arial';
            
            const mins = Math.floor(this.gameTime / 60);
            let secs = this.gameTime - mins * 60;
            if (secs === 0) {
                secs = '00';
            } else if (secs < 10) {
                secs = '0' + secs;
            }

            ctx.fillText(`${mins}:${secs}`, canvas.width / 2 - 12.5, 30);
        }
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
            this.jumpForce = 15;
            this.movementSpeed = 10;
            this.minY = this.y;
            this.startY = this.y;
            this.isStuck = false; 
            this.stuckTimer = 0;
            this.isFlying = false;
            this.movementControls();
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

        movementControls() {
            const keys = {};

            document.addEventListener('keydown', (event) => {
                keys[event.key] = true;

                if (keys['ArrowRight'] && keys['ArrowLeft']) {
                    this.dx = 0;
                } else if (keys['ArrowRight']) {
                    this.dx = this.movementSpeed;
                } else if (keys['ArrowLeft']) {
                    this.dx = -this.movementSpeed;
                }
            });

            document.addEventListener('keyup', (event) => {
                keys[event.key] = false;

                if (!keys['ArrowRight'] && !keys['ArrowLeft']) {
                    this.dx = 0;
                } else if (keys['ArrowRight']) {
                    this.dx = this.movementSpeed;
                } else if (keys['ArrowLeft']) {
                    this.dx = -this.movementSpeed;
                }
            });
        }
    
        update() {
            if (this.isStuck) {
                this.stuckTimer--;
                if (this.stuckTimer <= 0) {
                    this.isStuck = false;
                    this.dy = -150; 
                }
                return; 
            }
    
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

            if (this.x + this.width > canvas.width) {
                if (this.x > canvas.width / 2) {
                    this.x = this.x - canvas.width;
                }
            } else if (this.x < 0) {
                if (this.x + this.width < canvas.width / 2) {
                    this.x = this.x + canvas.width;
                }
            }
        
            if (this.y < this.startY) {
                const distanceTraveled = Math.floor((this.startY - this.y) / 2);
                if (distanceTraveled > 0) {
                    world.score += distanceTraveled;
                    world.heightScore += distanceTraveled;
                    this.startY = this.y;
                }
            }
        
        }
    }

    //#endregion

    //#region Spear Class

    class Spear {
        constructor(x, y) {
            this.x = x - 20;
            this.y = y - 30;
            this.width = 10;
            this.height = 20;
        }
        
        update(x, y) {
            this.x = x - 20;
            this.y = y - 30;
        }
        
        render(camera) {
            ctx.fillStyle = 'green';  
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
        }
    }

    //#endregion

    //#region Platform Class

    class Platform {
        constructor(x, y, id, type = 'normal') {
            this.x = x;
            this.y = y;
            this.width = type === 'trampoline' || type === 'moving' ? 50 : 75;
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
                this.type === 'moving' ? 'black' :
                this.type === 'breakable' ? 'yellow' :
                this.type === 'trampoline' ? 'orange' : 
                'blue'; 
            
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
        constructor(platformX, platformWidth, y, platformId) {
            this.platformX = platformX;
            this.platformWidth = platformWidth;
            this.size = 9; 
            this.x = this.platformX + Math.random() * (this.platformWidth - this.size);
            this.y = y;
            this.startingY = y;
            this.dy = 5; 
            this.platformId = platformId;
            this.interval = 15;
            this.isReturning = false;
            this.isCollided = false;
        }

        update() {
            let isStillCollided = false;

            for (let i = 0; i < world.platforms.length; i++) {
                const platform = world.platforms[i];
                if (world.circleCollisionDetector(platform, this) && platform.id !== this.platformId) {
                    isStillCollided = true;
                    break;
                }
            }
            
            this.isCollided = isStillCollided;

            if (!this.isReturning) {
                if (!this.isCollided) {
                    this.y += this.dy;  
                }
    
                if (this.interval >= 64) {
                    this.isReturning = true; 
                    this.interval = 0; 
                    
                    setTimeout(() => {
                        if (this.isReturning) {
                            this.isCollided = false; 
                            this.isReturning = false; 
                            this.y = this.startingY;
                            world.platforms.forEach(platform => {
                                if (platform.id === this.platformId) {
                                    this.x = platform.x + Math.random() * (platform.width - this.size);
                                }
                            });
                        }
                    }, 1000);
                }
            }
            this.interval++;
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

    //#region Heart Class
    
    class Heart {
        constructor(x, y, platformId) {
            this.x = x;
            this.y = y;
            this.width = 25;
            this.height = 25;
            this.platformId = platformId;
        }
    
        render(camera) {
            if (!this.isPickedUp) {
                ctx.fillStyle = 'pink';  
                ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
            }
        }
    }

    //#endregion

    //#region Jetpack Class

    class Jetpack {
        constructor(x, y, platformId) {
            this.x = x;
            this.y = y;
            this.width = 25;
            this.height = 25;
            this.platformId = platformId;
        }
    
        render(camera) {
            if (!this.isPickedUp) {
                ctx.fillStyle = 'brown';  
                ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
            }
        }
    }

    //#endregion

    //#region Enemy Class

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

    //#endregion

    //#region Handle Menu

    const menu = document.querySelector("#menu");
    const startBtn = menu.querySelector("#start");
    const tutorialBtn = menu.querySelector("#tutorial-btn");
    const generalInfo = menu.querySelector("#general-info");
    const gameInfos = menu.querySelectorAll(".game-info");
    
    const tutorial = document.querySelector("#tutorial");
    const menuBtn = tutorial.querySelector("button");

    const countdown = document.querySelector("#countdown");

    startBtn.addEventListener('click', () => {
        world.prepareGame();
        menu.classList.add("hidden");

        countdown.textContent = 3;
        countdown.classList.remove("hidden");
        
        let currentCount = 2;
        const interval = setInterval(() => {
            currentCount--;
            countdown.textContent = currentCount + 1;

            if (currentCount < 0) {
                clearInterval(interval);
                countdown.classList.add("hidden");
                world.gameIsActive = true;
                world.gameLoop(); 
            }
        }, 1000);
    });

    tutorialBtn.addEventListener('click', () => {
        menu.classList.add("hidden");
        tutorial.classList.remove("hidden");

        const playerPreview = new Player({x: 70, y: 110, width: 0});
        playerPreview.render({y: 0})
        renderInfo(playerPreview);

        const spearPreview = new Spear (playerPreview.x, playerPreview.y);
        spearPreview.render({x: 0, y: 0})

        const normalPlatformPreview = new Platform(50, 170, 0, 'normal');
        normalPlatformPreview.render({x: 0, y: 0})
        renderInfo(normalPlatformPreview);

        const breakablePlatformPreview = new Platform(50, 230, 1, 'breakable');
        breakablePlatformPreview.render({x: 0, y: 0})
        renderInfo(breakablePlatformPreview);

        const trampolinePlatformPreview = new Platform(62.5, 290, 2, 'trampoline');
        trampolinePlatformPreview.render({x: 0, y: 0})
        renderInfo(trampolinePlatformPreview);

        const movingPlatformPreview = new Platform(62.5, 350, 3, 'moving');
        movingPlatformPreview.render({x: 0, y: 0})
        renderInfo(movingPlatformPreview);

        const orbPreview = new Orb(62.5, 50, 369, 3);
        orbPreview.render({x: 0, y: 0});

        const coinPreview = new Coin(65, 444, 3);
        coinPreview.render({x: 0, y: 0});
        renderInfo(coinPreview);

        const heartPreview = new Heart(65, 509, 3);
        heartPreview.render({x: 0, y: 0})
        renderInfo(heartPreview);

        const jetpackPreview = new Jetpack(canvas.width - 97.5, 85, 3);
        jetpackPreview.render({x: 0, y: 0})
        renderInfo(jetpackPreview);

        const enemyPreview = new Enemy(canvas.width - 97.5, 170, 3);
        enemyPreview.render({x: 0, y: 0})
        renderInfo(enemyPreview);

    })

    menuBtn.addEventListener("click", () => {
        menu.classList.remove("hidden");
        tutorial.classList.add("hidden");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    function renderInfo(asset) {
        if (asset.constructor.name === "Player") {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';

            ctx.fillText('Player and Spear', 50, asset.y + 80);
            ctx.fillText('Kill enemies with spear', 35, asset.y + 90);

        } else if (asset.constructor.name === "Platform") {
            if (asset.type === "normal") {
                ctx.fillStyle = 'black';
                ctx.font = '10px Arial';
    
                ctx.fillText('Normal Platform', 50, asset.y + 30);

            } else if (asset.type === "breakable") {
                ctx.fillStyle = 'black';
                ctx.font = '10px Arial';
    
                ctx.fillText('Breakable Platform', 45, asset.y + 30);
                ctx.fillText('Breaks after one touch', 37.5, asset.y + 40);

            } else if (asset.type === "trampoline") {
                ctx.fillStyle = 'black';
                ctx.font = '10px Arial';
    
                ctx.fillText('Trampoline Platform', 45, asset.y + 30);
                ctx.fillText('Gives jump boost', 50, asset.y + 40);

            } else if (asset.type === "moving") {
                ctx.fillStyle = 'black';
                ctx.font = '10px Arial';
    
                ctx.fillText('Moving Platform', 50, asset.y + 40);
                ctx.fillText('Spawns rocks sometimes', 30, asset.y + 50);
            }
        } else if (asset.constructor.name === "Coin") {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';

            ctx.fillText('Coin', 65, asset.y + 30);

        } else if (asset.constructor.name === "Heart") {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';

            ctx.fillText('Heart', 65, asset.y + 40);

        } else if (asset.constructor.name === "Jetpack") {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';

            ctx.fillText('Jetpack', canvas.width - 102, asset.y + 45);
            ctx.fillText('Boosts player movement', canvas.width - 140, asset.y + 55);
        } else {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';

            ctx.fillText('Enemy', canvas.width - 99, asset.y + 80);
            ctx.fillText('Press left key to go left', canvas.width - 120, asset.y + 150);
            ctx.fillText('Press right key to go right', canvas.width - 120, asset.y + 160);
        }
    }

    //#endregion

});
