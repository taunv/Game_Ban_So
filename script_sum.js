const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const nextBallPreview = document.getElementById('next-ball-val');
const mainBtn = document.getElementById('btn-main');
const modal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');

// Audio
const shootSound = document.getElementById('shootSound');
const popSound = document.getElementById('popSound');
const stickSound = document.getElementById('stickSound');

// Game Settings
let CW, CH, RADIUS;
const COLS = 7;
let bubbles = [];
let particles = [];
let bullet = null;
let score = 0;
let isGameOver = false;
let isGameStarted = false;
let difficulty = 'easy'; // Default
let nextValue = 1;
let currValue = 1;

const BUBBLE_COLORS = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8', '#fab1a0', '#81ecec', '#dfe6e9'];

function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const headerH = document.querySelector('.header').offsetHeight;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - headerH;
    CW = canvas.width;
    CH = canvas.height;
    RADIUS = (CW / COLS) / 2;
}

function getRandomValue() { return Math.floor(Math.random() * 9) + 1; }

// --- LOGIC ĐIỀU KHIỂN ---
function setLevel(lv) {
    if (isGameStarted) return;
    difficulty = lv;
    document.getElementById('btn-easy').classList.toggle('active', lv === 'easy');
    document.getElementById('btn-hard').classList.toggle('active', lv === 'hard');
}

function handleMainAction() {
    if (!isGameStarted) {
        isGameStarted = true;
        mainBtn.innerText = "ĐANG CHƠI";
        mainBtn.disabled = true;
        init();
    }
}

function restartGame() {
    isGameStarted = false;
    mainBtn.innerText = "BẮT ĐẦU";
    mainBtn.disabled = false;
    modal.classList.add('hidden');
    init();
}

// --- GAME OBJECTS ---
class Bubble {
    constructor(c, r, val) {
        this.c = c; this.r = r; this.val = val;
        this.calcPos();
    }
    calcPos() {
        const offset = (this.r % 2 !== 0) ? RADIUS : 0;
        this.x = (this.c * RADIUS * 2) + RADIUS + offset;
        this.y = (this.r * RADIUS * 1.732) + RADIUS;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, RADIUS - 1, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#00264d'; 
        ctx.font = `bold ${Math.floor(RADIUS * 0.9)}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y);
    }
}

class Bullet {
    constructor(x, y, angle, val) {
        this.x = x; this.y = y; this.val = val;
        this.speed = CH / 30;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
    }
    update() {
        this.x += this.dx; this.y += this.dy;
        if (this.x - RADIUS <= 0 || this.x + RADIUS >= CW) this.dx = -this.dx;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, RADIUS - 1, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#00264d';
        ctx.font = `bold ${Math.floor(RADIUS * 0.9)}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y);
    }
}

function init() {
    resizeCanvas();
    bubbles = []; particles = []; bullet = null; score = 0; isGameOver = false;
    currValue = getRandomValue(); nextValue = getRandomValue();
    updateUI();
    
    // Tạo 3 hàng bóng
    for(let r = 0; r < 3; r++) {
        let colsInRow = (r % 2 !== 0) ? COLS - 1 : COLS;
        for(let c = 0; c < colsInRow; c++) {
            bubbles.push(new Bubble(c, r, getRandomValue()));
        }
    }
    requestAnimationFrame(loop);
}

function updateUI() {
    scoreEl.innerText = score;
    nextBallPreview.innerText = nextValue;
}

function processHit() {
    let r = Math.round((bullet.y - RADIUS) / (RADIUS * 1.732));
    let offset = (r % 2 !== 0) ? RADIUS : 0;
    let c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));

    if (bubbles.some(b => b.c === c && b.r === r)) r++;

    let newBubble = new Bubble(c, r, bullet.val);
    let neighbors = [];
    let totalSum = bullet.val;

    bubbles.forEach(b => {
        if (Math.hypot(newBubble.x - b.x, newBubble.y - b.y) < RADIUS * 2.2) {
            neighbors.push(b);
            totalSum += b.val;
        }
    });

    const threshold = (difficulty === 'easy') ? 10 : 15;

    if (totalSum >= threshold) {
        neighbors.forEach(n => bubbles.splice(bubbles.indexOf(n), 1));
        score += totalSum * 10;
        playSound(popSound);
        if (bubbles.length === 0) endGame(true);
    } else {
        bubbles.push(newBubble);
        playSound(stickSound);
        if (newBubble.y > CH - RADIUS * 4) endGame(false);
    }
    bullet = null;
    updateUI();
}

function loop() {
    if (isGameOver || !isGameStarted) return;
    ctx.clearRect(0, 0, CW, CH);

    // Vạch giới hạn
    ctx.beginPath(); ctx.moveTo(0, CH - RADIUS * 4); ctx.lineTo(CW, CH - RADIUS * 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.closePath();

    bubbles.forEach(b => b.draw());

    if (bullet) {
        bullet.update(); bullet.draw();
        if (bullet.y - RADIUS <= 0 || bubbles.some(b => Math.hypot(bullet.x-b.x, bullet.y-b.y) < RADIUS*1.8)) processHit();
    } else {
        // Vẽ bóng tại súng
        const cannonX = CW / 2, cannonY = CH - RADIUS * 4;
        ctx.beginPath(); ctx.arc(cannonX, cannonY, RADIUS, 0, Math.PI*2);
        ctx.fillStyle = BUBBLE_COLORS[(currValue-1)%9]; ctx.fill();
        ctx.fillStyle = '#00264d'; ctx.fillText(currValue, cannonX, cannonY);
    }
    requestAnimationFrame(loop);
}

function handleInput(e) {
    if (!isGameStarted || bullet || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.changedTouches[0].clientX) - rect.left;
    const y = (e.clientY || e.changedTouches[0].clientY) - rect.top;
    
    bullet = new Bullet(CW/2, CH - RADIUS*4, Math.atan2(y - (CH-RADIUS*4), x - CW/2), currValue);
    currValue = nextValue; nextValue = getRandomValue();
    playSound(shootSound);
}

function endGame(win) {
    isGameOver = true;
    modal.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

function playSound(a) { a.currentTime = 0; a.play().catch(()=>{}); }

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});
window.onload = resizeCanvas;
