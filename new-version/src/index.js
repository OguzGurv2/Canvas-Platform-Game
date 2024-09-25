document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext('2d');

    class Camera {
        constructor() {
            this.y = 0;  
            this.x = 0;
            this.width = canvas.width;
            this.height = canvas.height;  
        };
    }

    class World {
        constructor() {
            this.gravity = 1;
            this.fps = 12;
            this.jumpForce = 15;
            this.movementSpeed = 10;
            this.platforms = [];
            this.platformCount = 15;
            this.lives = 3;  
            this.score = 0;  

            this.camera = new Camera();
            this.player = null;

            this.generatePlatforms();
            this.createPlayer();

            this.gameLoop = this.gameLoop.bind(this);
            setInterval(this.gameLoop, 1000 / this.fps);
            this.addMovementControls();
        }

        applyPhysics() {
            this.player.dy += this.gravity;
        }

        rectCollisionDetector(player, platform) {
            if (player.dy > 0 && 
                player.y + player.height >= platform.y && 
                player.y + player.height * 0.75 <= platform.y + platform.height * 0.5 && 
                player.x + player.width > platform.x && 
                player.x < platform.x + platform.width) { 
                return true;
            }
            return false;                     
        }

        update() {
            this.applyPhysics();
            this.player.movePlayer();
            this.updateCamera();
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
        
            if (this.player.y > this.camera.y + canvas.height + this.player.height) {
                this.lives--; 
                if (this.lives > 0) {
                    const lowestPlatformY = Math.max(...this.platforms.map(p => p.y));
                    const lowestPlatforms = this.platforms.filter(p => p.y === lowestPlatformY);
        
                    const priorityPlatform = lowestPlatforms.reduce((prev, curr) => {
                        return (prev.id < curr.id) ? prev : curr;
                    });

                    // Respawn player above the lowest platform
                    this.player.y = priorityPlatform.y - 55; // 55 units above the lowest platform
                    this.player.x = priorityPlatform.x + (priorityPlatform.width / 2) - (this.player.width / 2); 
                    this.player.dy = 0; 
                } else {
                    alert("Game Over!"); 
                    this.resetGame(); 
                }
            }
        }
              
        updateCamera() {
            if (this.player.minY < this.camera.y + canvas.height / 2) {
                this.camera.y = this.player.minY - canvas.height / 2;
            }
        }

        render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.player.render(this.camera);
            this.platforms.forEach(platform => platform.render(this.camera));

            this.renderLives();
            this.renderScore();
        }

        gameLoop() {
            this.update();
            this.render();
        }

        generatePlatforms() {
            const startY = 780; 
            const platformSpacingY = 100; 
            const platformWidth = 75;
            const canvasWidth = 400;
            const minSpacing = 30;
            let currentY = startY - platformSpacingY;
        
            const firstPlatformX = (canvasWidth - platformWidth) / 2;
            this.platforms.push(new Platform(firstPlatformX, startY));
        
            for (let i = 1; i < this.platformCount; i++) {
                let x = Math.random() * (canvasWidth - platformWidth); 
                
                let overlapping = this.platforms.some(platform => {
                    return Math.abs(x - platform.x) < platformWidth + minSpacing && platform.y === currentY; 
                });
        
                if (!overlapping) {
                    this.platforms.push(new Platform(x, currentY));
                }
        
                if (Math.random() < 0.25) {
                    let secondX = Math.random() * (canvasWidth - platformWidth);
                    let secondOverlapping = this.platforms.some(platform => {
                        return Math.abs(secondX - platform.x) < platformWidth + minSpacing && platform.y === currentY; 
                    });
        
                    if (!secondOverlapping) {
                        this.platforms.push(new Platform(secondX, currentY));
                    }
                }
                currentY -= platformSpacingY; 
            }
        }
        
        regeneratePlatforms() {
            this.platforms = this.platforms.filter(platform => platform.y <= this.camera.y + 800);
        
            while (this.platforms.length < this.platformCount) {
                const lastPlatform = this.platforms[this.platforms.length - 1]; 
                const newPlatformY = lastPlatform.y - 100; 
                const newPlatformX = Math.random() * (canvas.width - 50); 
                
                const newPlatform = new Platform(newPlatformX, newPlatformY, this.platforms.length);
                this.platforms.push(newPlatform);
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

        resetGame() {
            this.showCountdown(3).then(() => {
                this.platforms = []; // Clear all platforms
                this.lives = 3; // Reset lives
                this.score = 0; // Reset score
                this.generatePlatforms(); // Generate new platforms
                this.createPlayer(); // Recreate player
            });
        }

        showCountdown(seconds) {
            return new Promise((resolve) => {
                let count = seconds;
                const countdownInterval = setInterval(() => {
                    alert(`Next game in ${count} seconds...`);
                    count--;
                    if (count < 0) {
                        clearInterval(countdownInterval);
                        resolve();
                    }
                }, 1000);
            });
        }

        createPlayer() {
            this.player = new Player(this.platforms[0]);
        }
    }

    class Player {
        constructor(platform) {
            this.x = platform.x + platform.width / 2 - 5; 
            this.y = platform.y - 60;
            this.width = 25;
            this.height = 50;
            this.dx = 0;
            this.dy = 0;
            this.minY = this.y;
            this.startY = this.y;
        }

        render(camera) {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y - camera.y, this.width, this.height);
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

    class Platform {
        constructor(x, y, id) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.width = 75;
            this.height = 10;
        }

        render(camera) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y - camera.y, this.width, this.height);
        }
    }

    document.querySelector("#start-btn").addEventListener('click', () => {
        
        document.querySelector("#menu").style.display = 'none';
        const countdownElement = document.getElementById("countdown");
        countdownElement.style.display = "block";

        let currentCount = 2;
        const interval = setInterval(() => {
            countdownElement.textContent = currentCount;
            currentCount--;

            if (currentCount < 0) {
                clearInterval(interval);
                countdownElement.style.display = "none";
                new World();
            }
        }, 1000);
    

    });

});
