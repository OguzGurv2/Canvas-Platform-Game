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
            this.jumpForce = 20;
            this.movementSpeed = 10;
            this.enemies = [];
            this.coins = [];
            this.platforms = [];
            this.platformCount = 15;
            this.platformWidth = 75;
            this.platformIndex = 0;
            this.lowestPlatforms = [];
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

            if (this.player.y < this.player.startY) {
                const distanceTraveled = Math.floor(this.player.startY - this.player.y);
                if (distanceTraveled > 0) {
                    this.score += distanceTraveled;
                    this.player.startY = this.player.y;
                }
            }

            for (let platform of this.platforms) {
                if (this.rectCollisionDetector(this.player, platform)) {
                    this.player.dy = 0;
                    this.player.y = platform.y - this.player.height;
                    this.player.dy = -this.jumpForce;
                    break;
                }
            }

            this.coins = this.coins.filter(coin => {
                if (this.coinCollisionDetector(this.player, coin)) {
                    this.score += 100; 
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

        findLowestPlatform() {
            const filteredPlatforms = this.platforms.filter(p => p.y <= this.camera.y + 800);
            const lowestPlatformY = Math.max(...filteredPlatforms.map(p => p.y));
            this.lowestPlatforms = this.platforms.filter(p => p.y === lowestPlatformY);
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
        
            if (
                player.dy > 0 && 
                playerBottom >= platformTop &&  
                playerBottom <= platformTop + platform.height &&  
                player.x + player.width > platform.x && 
                player.x < platform.x + platform.width 
            ) {
                return true;  
            }
        
            return false;  
        }

        coinCollisionDetector(player, coin) {
            return (
                player.x < coin.x + coin.size &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.size &&
                player.y + player.height > coin.y
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
            const startY = 780;
            const canvasWidth = 400;
            const sectionHeight = 200; 
            const sections = 4;
            const sectionWidth = canvasWidth / sections; 
            let currentY = startY;
        
            const firstPlatformX = (canvasWidth - this.platformWidth) / 2;
            this.platforms.push(new Platform(firstPlatformX, startY, this.platformIndex));  
            currentY -= Math.floor(Math.random() * (105 - 95 + 1)) + 95;  
            
            let platformsInSection = 0;
            let sectionStartY = currentY - sectionHeight;
            let lastPlatformSection = Math.floor(firstPlatformX / sectionWidth); 
        
            for (let i = 1; i < this.platformCount; i++) {
                if (currentY <= sectionStartY) {
                    sectionStartY -= sectionHeight;
                    platformsInSection = 0; 
                }
        
                const platformsPerSection = Math.random() < 0.5 ? 2 : 3;
        
                if (platformsInSection < platformsPerSection) {
                    let spacingY = Math.floor(Math.random() * (105 - 95 + 1)) + 95; 
                    let newSection;
        
                    do {
                        newSection = Math.floor(Math.random() * sections); 
                    } while (newSection === lastPlatformSection);
        
                    let x = newSection * sectionWidth + Math.random() * (sectionWidth - this.platformWidth); 
                    
                    this.platforms.push(new Platform(x, currentY, ++this.platformIndex));
                    platformsInSection++; 
                    lastPlatformSection = newSection; 
        
                    this.spawnCoinsAndEnemies(x, currentY, this.platformWidth, this.platformIndex);
        
                    currentY -= spacingY;
                } else {
                    currentY = sectionStartY;
                }
            }
        }  

        regeneratePlatforms() {
            this.platforms = this.platforms.filter(platform => platform.y <= this.camera.y + 850);
            const idsInPlatforms= this.platforms.map(obj => obj.id);
            this.coins = this.coins.filter(obj => idsInPlatforms.includes(obj.platformId));
            this.enemies = this.enemies.filter(obj => idsInPlatforms.includes(obj.platformId));
        
            const sectionHeight = 200;
            const canvasWidth = 400;
            const sections = 4; 
            const sectionWidth = canvasWidth / sections;
            let lastPlatformY = this.platforms[this.platforms.length - 1].y;
            let sectionStartY = lastPlatformY - sectionHeight;
            let platformsInSection = 0;
            let lastPlatformSection = Math.floor(this.platforms[this.platforms.length - 1].x / sectionWidth); 
        
            while (this.platforms.length < this.platformCount) {
                if (lastPlatformY <= sectionStartY) {
                    sectionStartY -= sectionHeight;
                    platformsInSection = 0; 
                }
        
                const platformsPerSection = Math.random() < 0.5 ? 2 : 3;
        
                if (platformsInSection < platformsPerSection) {
                    const spacingY = Math.floor(Math.random() * (105 - 95 + 1)) + 95;
                    lastPlatformY -= spacingY;
        
                    let newSection;
                    
                    do {
                        newSection = Math.floor(Math.random() * sections); 
                    } while (newSection === lastPlatformSection);
        
                    const newPlatformX = newSection * sectionWidth + Math.random() * (sectionWidth - this.platformWidth);
                    this.platforms.push(new Platform(newPlatformX, lastPlatformY, ++this.platformIndex));
                    platformsInSection++;
                    lastPlatformSection = newSection; 
        
                    this.spawnCoinsAndEnemies(newPlatformX, lastPlatformY, this.platformWidth, this.platformIndex);
                } else {
                    lastPlatformY = sectionStartY;
                }
            }
        }        
        
        spawnCoinsAndEnemies(platformX, platformY, platformWidth, platformId) {
            const partWidth = platformWidth / 3; 

            const coinPart = Math.floor(Math.random() * 3);
            const coinX = platformX + coinPart * partWidth + (partWidth / 2) - 5; 
            if (Math.random() < 0.1) {
                this.coins.push(new Coin(coinX, platformY - 15, platformId));
            }
        
            if (Math.random() < 0.1) {
                let enemyPart;
                do {
                    enemyPart = Math.floor(Math.random() * 3); 
                } while (enemyPart === coinPart); 
                const enemyX = platformX + enemyPart * partWidth + (partWidth / 2) - (25 / 2);
                const enemyY = platformY - 60;
            
                let enemySpacing = this.enemies.some(enemy => {
                    return Math.abs(enemyX - enemy.x) < 25 + this.minSpacing && enemy.y === enemyY;
                });
            
                if (!enemySpacing) {
                    this.enemies.push(new Enemy(enemyX, enemyY, platformId));
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
        constructor(x, y, id) {
            this.x = x;
            this.y = y;
            this.width = 90;  
            this.height = 15; 
            this.id = id;  
        }
    
        render(camera) {
            const screenX = this.x;
            const screenY = this.y - camera.y;
            ctx.fillStyle = 'blue';
            ctx.fillRect(screenX, screenY, this.width, this.height);
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
