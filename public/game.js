const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const dot = document.getElementById('dot');
const levelIndicator = document.getElementById('level-indicator');
const victoryScreen = document.getElementById('victory-screen');
const cupsContainer = document.getElementById('cups-container');
const cups = [document.getElementById('cup-0'), document.getElementById('cup-1'), document.getElementById('cup-2')];
const canvas = document.getElementById('l4-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let username = '';
let currentLevel = 1;
let dotState = { x: 0, y: 0, falling: false, speedY: 0 };
let animationFrameId;
let level3Interval;
let totalGameStartTime = 0;

let cupPositions = [0, 1, 2];
let dotCupIndex = 1;
let isShuffling = false;

// Level 4 variables
let balls = [];
let stairs = [];
let l4Active = false;

// Level 5 variables
let l5Active = false;
let mazeAngle = 0;
let ballOut = false;
let rightPressed = false;
let leftPressed = false;
let ball = null;
const cellSize = 24;
const mazeGrid = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
  [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1]
];

// Trackers
let wrongClicksPerLevel = 0;
let levelStartTime = 0;

document.addEventListener('keydown', (e) => {
    if (currentLevel === 5) {
        if (e.key === 'ArrowRight') rightPressed = true;
        if (e.key === 'ArrowLeft') leftPressed = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (currentLevel === 5) {
        if (e.key === 'ArrowRight') rightPressed = false;
        if (e.key === 'ArrowLeft') leftPressed = false;
    }
});

async function sendLog(action, details = {}) {
    try {
        await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, action, details })
        });
    } catch (e) {
        console.error("Log failed", e);
    }
}

loginBtn.addEventListener('click', async () => {
    const val = usernameInput.value.trim();
    
    // Regex validation for full name
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}\s+[A-Za-zÀ-ÖØ-öø-ÿ]{2,}.*$/;
    if (!nameRegex.test(val)) {
        alert('Por favor, insira seu nome e sobrenome válidos.');
        return;
    }
    
    username = val;
    totalGameStartTime = Date.now();
    await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');
    initLevel(1);
});

function getDotCenter() {
    const rect = dot.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

document.addEventListener('mousemove', (e) => {
    if (currentLevel !== 2) return;
    
    const center = getDotCenter();
    const dx = e.clientX - center.x;
    const dy = e.clientY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 100 && !dotState.falling) {
        dotState.falling = true;
        dotState.speedY = 3;
        sendLog('level2_dot_fall_triggered', { distance: dist });
    }
});

// Capture background misses
gameScreen.addEventListener('mousedown', (e) => {
    if (victoryScreen && !victoryScreen.classList.contains('hidden')) return;

    let isMiss = false;
    if (currentLevel === 1 || currentLevel === 2) {
        if (e.target !== dot) isMiss = true;
    } else if (currentLevel === 3) {
        if (!e.target.classList.contains('cup') && !isShuffling) isMiss = true;
    }
    
    if (isMiss) {
        wrongClicksPerLevel++;
        sendLog('wrong_click', { level: currentLevel, wrongClicksCount: wrongClicksPerLevel });
    }
});

dot.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (currentLevel === 3 || currentLevel === 4 || currentLevel === 5) return; 
    
    sendLog('dot_clicked', { level: currentLevel });
    sendLog('level_completed', { 
        level: currentLevel, 
        totalWrongClicks: wrongClicksPerLevel,
        timeSpentSeconds: ((Date.now() - levelStartTime) / 1000).toFixed(2)
    });
    
    if (currentLevel < 5) {
        initLevel(currentLevel + 1);
    }
});

function initLevel(level) {
    currentLevel = level;
    wrongClicksPerLevel = 0;
    levelStartTime = Date.now();
    levelIndicator.textContent = `Level ${level}`;
    sendLog('level_start', { level });
    
    cancelAnimationFrame(animationFrameId);
    clearInterval(level3Interval);
    dotState.falling = false;
    dot.style.transition = 'transform 0.1s';
    
    l4Active = false;
    l5Active = false;
    if (canvas) canvas.classList.add('hidden');
    
    if (level === 1) {
        dot.style.display = 'block';
        dot.style.opacity = '1';
        cupsContainer.classList.add('hidden');
        dot.style.top = `calc(50% - 20px)`;
        dot.style.left = `calc(50% - 20px)`;
    } 
    else if (level === 2) {
        dot.style.display = 'block';
        dot.style.opacity = '1';
        cupsContainer.classList.add('hidden');
        dot.style.top = `calc(50% - 20px)`;
        dot.style.left = `calc(50% - 20px)`;
        loopLevel2();
    }
    else if (level === 3) {
        dot.style.transition = 'opacity 0.3s';
        startCupGame();
    }
    else if (level === 4) {
        dot.style.display = 'none';
        cupsContainer.classList.add('hidden');
        canvas.classList.remove('hidden');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        l4Active = true;
        initLevel4();
    }
    else if (level === 5) {
        dot.style.display = 'none';
        cupsContainer.classList.add('hidden');
        canvas.classList.remove('hidden');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        l5Active = true;
        initLevel5();
    }
}

// Level 2 Logic
function loopLevel2() {
    if (dotState.falling) {
        const rect = dot.getBoundingClientRect();
        dotState.speedY += 0.15;
        let newY = rect.top + dotState.speedY;
        
        if (newY > window.innerHeight) {
            newY = -40;
            dotState.speedY = 3;
            dot.style.left = `${Math.random() * (window.innerWidth - 40)}px`;
            sendLog('level2_dot_respawn');
        }
        dot.style.top = `${newY}px`;
    }
    animationFrameId = requestAnimationFrame(loopLevel2);
}

// Level 3 Logic
async function startCupGame() {
    isShuffling = true;
    cupsContainer.classList.remove('hidden');
    dot.style.display = 'block';
    dot.style.opacity = '1';
    
    cupPositions = [0, 1, 2];
    cups.forEach((cup, i) => {
        cup.style.transition = 'none';
        cup.style.transform = `translateX(${cupPositions[i] * 120}px)`;
        cup.classList.add('lifted');
    });
    
    await new Promise(r => setTimeout(r, 50));
    cups.forEach(cup => cup.style.transition = 'transform 0.5s ease-in-out, top 0.3s');
    
    dotCupIndex = Math.floor(Math.random() * 3);
    const containerRect = cupsContainer.getBoundingClientRect();
    
    await new Promise(r => setTimeout(r, 500));
    
    const cupLeft = cupPositions[dotCupIndex] * 120;
    const dotX = containerRect.left + cupLeft + 20; 
    const dotY = containerRect.top + 60; 
    
    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;
    
    await new Promise(r => setTimeout(r, 1000));
    
    cups.forEach(cup => cup.classList.remove('lifted'));
    
    await new Promise(r => setTimeout(r, 300));
    dot.style.opacity = '0'; 
    
    let shuffles = 10;
    while(shuffles > 0) {
        await shuffleCups();
        shuffles--;
    }
    
    isShuffling = false;
}

function shuffleCups() {
    return new Promise(resolve => {
        let c1 = Math.floor(Math.random() * 3);
        let c2 = Math.floor(Math.random() * 3);
        while (c1 === c2) c2 = Math.floor(Math.random() * 3);
        
        let temp = cupPositions[c1];
        cupPositions[c1] = cupPositions[c2];
        cupPositions[c2] = temp;
        
        cups[c1].style.transform = `translateX(${cupPositions[c1] * 120}px)`;
        cups[c2].style.transform = `translateX(${cupPositions[c2] * 120}px)`;
        
        setTimeout(resolve, 350); 
    });
}

cups.forEach((cup, idx) => {
    cup.addEventListener('mousedown', async () => {
        if (currentLevel !== 3 || isShuffling) return;
        
        isShuffling = true;
        cup.classList.add('lifted');
        
        const containerRect = cupsContainer.getBoundingClientRect();
        const cupLeft = cupPositions[dotCupIndex] * 120;
        dot.style.left = `${containerRect.left + cupLeft + 20}px`;
        dot.style.top = `${containerRect.top + 60}px`;
        
        if (idx === dotCupIndex) {
            dot.style.opacity = '1';
            sendLog('level3_cup_correct');
            sendLog('level_completed', { 
                level: currentLevel, 
                totalWrongClicks: wrongClicksPerLevel,
                timeSpentSeconds: ((Date.now() - levelStartTime) / 1000).toFixed(2)
            });
            setTimeout(() => {
                cupsContainer.classList.add('hidden');
                initLevel(4);
            }, 1500);
        } else {
            wrongClicksPerLevel++;
            sendLog('level3_cup_wrong', { level: currentLevel, wrongClicksCount: wrongClicksPerLevel });
            setTimeout(() => {
                cups[dotCupIndex].classList.add('lifted');
                dot.style.opacity = '1';
            }, 500);
            
            setTimeout(() => {
                startCupGame();
            }, 2500);
        }
    });
});

// Level 4 Logic
function initLevel4() {
    balls = [];
    stairs = [];
    
    const stepCount = 5;
    const stepWidth = window.innerWidth / (stepCount + 1);
    const stepHeight = window.innerHeight / (stepCount + 1);
    
    for (let i = 0; i < stepCount; i++) {
        stairs.push({
            x: i * stepWidth,
            y: (i + 1) * stepHeight,
            w: stepWidth,
            h: window.innerHeight - (i + 1) * stepHeight
        });
    }
    
    const numBalls = 1500;
    const correctIndex = Math.floor(Math.random() * numBalls);
    
    for (let i = 0; i < numBalls; i++) {
        balls.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * -window.innerHeight * 2,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 5,
            radius: 6,
            isCorrect: (i === correctIndex),
            blinkTime: 0
        });
    }
    
    loopLevel4();
}

function loopLevel4() {
    if (!l4Active) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#e8e8ed';
    stairs.forEach(stair => {
        ctx.fillRect(stair.x, stair.y, stair.w, stair.h);
        ctx.strokeStyle = '#d2d2d7';
        ctx.lineWidth = 1;
        ctx.strokeRect(stair.x, stair.y, stair.w, stair.h);
    });
    
    const gravity = 0.2;
    const bounce = -0.5;
    
    balls.forEach(ball => {
        ball.vy += gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        let collided = false;
        
        stairs.forEach(stair => {
            if (ball.x > stair.x && ball.x < stair.x + stair.w) {
                if (ball.y + ball.radius > stair.y && ball.y - ball.radius < stair.y + stair.h) {
                    if (ball.vy > 0 && ball.y - ball.vy + ball.radius <= stair.y + 5) {
                        ball.y = stair.y - ball.radius;
                        ball.vy *= bounce;
                        collided = true;
                    }
                }
            }
        });
        
        if (collided && ball.isCorrect) {
            ball.blinkTime = 15;
        }
        
        if (ball.y > canvas.height + 50) {
            ball.y = Math.random() * -200 - 50;
            ball.x = Math.random() * canvas.width;
            ball.vy = Math.random() * 2;
            ball.vx = (Math.random() - 0.5) * 3;
        }
        
        if (ball.isCorrect && ball.blinkTime > 0) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';
            ctx.stroke();
            ball.blinkTime--;
        } else {
            ctx.fillStyle = '#1d1d1f';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    animationFrameId = requestAnimationFrame(loopLevel4);
}

canvas.addEventListener('mousedown', (e) => {
    if (currentLevel === 4 && l4Active) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let hitCorrect = false;
        balls.forEach(ball => {
            const dx = ball.x - mouseX;
            const dy = ball.y - mouseY;
            if (dx * dx + dy * dy < (ball.radius * 4) * (ball.radius * 4)) {
                if (ball.isCorrect) hitCorrect = true;
            }
        });
        
        if (hitCorrect) {
            sendLog('level4_won');
            sendLog('level_completed', { 
                level: currentLevel, 
                totalWrongClicks: wrongClicksPerLevel,
                timeSpentSeconds: ((Date.now() - levelStartTime) / 1000).toFixed(2)
            });
            initLevel(5); // Go to level 5
        } else {
            wrongClicksPerLevel++;
            sendLog('level4_miss', { level: currentLevel, wrongClicksCount: wrongClicksPerLevel });
        }
    }
    else if (currentLevel === 5 && l5Active && ballOut) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const dx = ball.screenX - mouseX;
        const dy = ball.screenY - mouseY;
        if (dx * dx + dy * dy < (ball.radius * 4) * (ball.radius * 4)) {
            sendLog('level5_won');
            sendLog('level_completed', { 
                level: currentLevel, 
                totalWrongClicks: wrongClicksPerLevel,
                timeSpentSeconds: ((Date.now() - levelStartTime) / 1000).toFixed(2)
            });
            winGame();
        } else {
            wrongClicksPerLevel++;
            sendLog('level5_miss', { level: currentLevel, wrongClicksCount: wrongClicksPerLevel });
        }
    }
});

// Level 5 Logic
function initLevel5() {
    mazeAngle = 0;
    ballOut = false;
    
    ball = {
        localX: 7 * cellSize + cellSize / 2,
        localY: 7 * cellSize + cellSize / 2,
        vx: 0,
        vy: 0,
        radius: 6,
        screenX: 0,
        screenY: 0,
        screenVx: 0,
        screenVy: 0
    };
    
    loopLevel5();
}

function isColliding(x, y, radius) {
    const left = Math.floor((x - radius) / cellSize);
    const right = Math.floor((x + radius) / cellSize);
    const top = Math.floor((y - radius) / cellSize);
    const bottom = Math.floor((y + radius) / cellSize);
    
    if (bottom >= mazeGrid.length) {
        // Exit is column 7
        if (left >= 7 && right <= 7) return false;
        return true; 
    }
    if (top < 0 || left < 0 || right >= mazeGrid[0].length) return true;
    
    if (mazeGrid[top][left] === 1) return true;
    if (mazeGrid[top][right] === 1) return true;
    if (mazeGrid[bottom][left] === 1) return true;
    if (mazeGrid[bottom][right] === 1) return true;
    
    return false;
}

function loopLevel5() {
    if (!l5Active) return;
    
    if (rightPressed) mazeAngle += 0.05;
    if (leftPressed) mazeAngle -= 0.05;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!ballOut) {
        ball.vx += Math.sin(mazeAngle) * 0.4;
        ball.vy += Math.cos(mazeAngle) * 0.4;
        
        ball.vx *= 0.95;
        ball.vy *= 0.95;
        
        let newX = ball.localX + ball.vx;
        if (isColliding(newX, ball.localY, ball.radius)) {
            let hitVx = ball.vx;
            ball.vx = -ball.vx * 0.3;
            if (hitVx < 0) {
                newX = Math.floor((newX - ball.radius) / cellSize) * cellSize + cellSize + ball.radius + 0.1;
            } else {
                newX = Math.floor((newX + ball.radius) / cellSize) * cellSize - ball.radius - 0.1;
            }
        }
        ball.localX = newX;
        
        let newY = ball.localY + ball.vy;
        if (isColliding(ball.localX, newY, ball.radius)) {
            let hitVy = ball.vy;
            ball.vy = -ball.vy * 0.3;
            if (hitVy < 0) {
                newY = Math.floor((newY - ball.radius) / cellSize) * cellSize + cellSize + ball.radius + 0.1;
            } else {
                newY = Math.floor((newY + ball.radius) / cellSize) * cellSize - ball.radius - 0.1;
            }
        }
        ball.localY = newY;
        
        // Safeguard contra bugs de física: reseta se sair por um lugar que não é a saída
        const mazeWidth = mazeGrid[0].length * cellSize;
        if (ball.localX < 0 || ball.localX > mazeWidth || ball.localY < 0) {
            ball.localX = 7 * cellSize + cellSize / 2;
            ball.localY = 7 * cellSize + cellSize / 2;
            ball.vx = 0;
            ball.vy = 0;
        }
    }
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(mazeAngle);
    
    const mazeWidth = mazeGrid[0].length * cellSize;
    const mazeHeight = mazeGrid.length * cellSize;
    ctx.translate(-mazeWidth / 2, -mazeHeight / 2);
    
    ctx.fillStyle = '#1d1d1f';
    for (let r = 0; r < mazeGrid.length; r++) {
        for (let c = 0; c < mazeGrid[0].length; c++) {
            if (mazeGrid[r][c] === 1) {
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#d2d2d7';
                ctx.lineWidth = 1;
                ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }
    
    if (!ballOut) {
        ctx.fillStyle = '#007aff'; // Apple Blue for visibility
        ctx.beginPath();
        ctx.arc(ball.localX, ball.localY, ball.radius, 0, Math.PI*2);
        ctx.fill();
        
        if (ball.localY > mazeHeight + ball.radius) {
            ballOut = true;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const dx = ball.localX - mazeWidth / 2;
            const dy = ball.localY - mazeHeight / 2;
            ball.screenX = cx + dx * Math.cos(mazeAngle) - dy * Math.sin(mazeAngle);
            ball.screenY = cy + dx * Math.sin(mazeAngle) + dy * Math.cos(mazeAngle);
            ball.screenVx = ball.vx * Math.cos(mazeAngle) - ball.vy * Math.sin(mazeAngle);
            ball.screenVy = ball.vx * Math.sin(mazeAngle) + ball.vy * Math.cos(mazeAngle);
        }
    }
    ctx.restore();
    
    if (ballOut) {
        ball.screenVy += 0.4;
        ball.screenX += ball.screenVx;
        ball.screenY += ball.screenVy;
        
        if (ball.screenY > canvas.height - ball.radius) {
            ball.screenY = canvas.height - ball.radius;
            ball.screenVy = -ball.screenVy * 0.6;
        }
        if (ball.screenX < ball.radius) { ball.screenX = ball.radius; ball.screenVx *= -1; }
        if (ball.screenX > canvas.width - ball.radius) { ball.screenX = canvas.width - ball.radius; ball.screenVx *= -1; }
        
        ctx.fillStyle = '#007aff';
        ctx.beginPath();
        ctx.arc(ball.screenX, ball.screenY, ball.radius * 2, 0, Math.PI*2);
        ctx.fill();
    }
    
    animationFrameId = requestAnimationFrame(loopLevel5);
}

function winGame() {
    cancelAnimationFrame(animationFrameId);
    clearInterval(level3Interval);
    l4Active = false;
    l5Active = false;
    dot.style.display = 'none';
    cupsContainer.classList.add('hidden');
    if (canvas) canvas.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    sendLog('game_won', { timeSpentSeconds: ((Date.now() - levelStartTime) / 1000).toFixed(2) });
}
