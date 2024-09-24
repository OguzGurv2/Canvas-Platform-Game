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

            this.camera = new Camera();

            this.generatePlatforms();
            this.player = new Player(this.platforms[0]);

            this.gameLoop = this.gameLoop.bind(this);
            setInterval(this.gameLoop, 1000 / this.fps);
            this.addMovementControls();
        }

        applyPhysics() {
            this.player.dy += this.gravity;
        }

        rectCollisionDetector(player, platform) {
            if (player.dy > 0 && 
                player.y + player.height * 0.25 <= platform.y + platform.height * 0.5 && 
                player.y + player.height + player.dy >= platform.y && 
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

            for (let platform of this.platforms) {
                if (this.rectCollisionDetector(this.player, platform)) {
                    this.player.dy = 0;
                    this.player.y = platform.y - this.player.height;
                    this.player.dy = -this.jumpForce;
                    break;
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
        }

        gameLoop() {
            this.update();
            this.render();
        }

        generatePlatforms() {
            const startY = 780; 
            const platformSpacingX = 30; 
            const platformSpacingY = 100; 

            const firstPlatformX = (canvas.width - 50) / 2; 
            this.platforms.push(new Platform(firstPlatformX, startY));

            let currentY = startY - platformSpacingY; 
            for (let i = 1; i < this.platformCount; i++) {
                let x;
                do {
                    x = Math.random() * (canvas.width - 50); 
                } while (this.platforms.some(platform => Math.abs(x - platform.x) < 10));

                let newPlatform = new Platform(x, currentY,i);

                if (this.platforms.length > 0) {
                    const lastPlatform = this.platforms[this.platforms.length - 1];
                    if (Math.abs(newPlatform.x - lastPlatform.x) < 10 || 
                        Math.abs(newPlatform.y - lastPlatform.y) < platformSpacingY) {
                        continue; 
                    }
                }

                this.platforms.push(newPlatform);
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
    }

    class Player {
        constructor(platform) {
            this.x = platform.x + platform.width / 2 - 5; 
            this.y = platform.y - 35;
            this.width = 25;
            this.height = 50;
            this.dx = 0;
            this.dy = 0;
            this.minY = this.y;
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

            if (this.y + this.height > canvas.height) {
                this.y = canvas.height - this.height;
                this.dy = 0;
            }

            if (this.x < 0) {
                this.x = 0;
            } else if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
            }
        }
    }

    class Platform {
        constructor(x, y, id) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.width = 75;
            this.height = 15;
        }

        render(camera) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y - camera.y, this.width, this.height);
        }
    }

    new World(); 
});
