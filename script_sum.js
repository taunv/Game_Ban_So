const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const nextBallPreview = document.getElementById('next-ball-val');
const startScreen = document.getElementById('start-screen');
const gameOverModal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const finalScoreEl = document.getElementById('final-score');

// Audio
const shootSound = document.getElementById('shootSound');
const popSound = document.getElementById('popSound');
const stickSound = document.getElementById('stickSound');

// --- CẤU HÌNH ---
let CW, CH, RADIUS;
const COLS = 7; 
let bubbles = [];
let particles = [];
let bullet = null;
let nextValue = 1;
let currValue = 1;
let score = 0;
let isGameOver = false;

// BIẾN ĐỘ KHÓ (Mặc định 10)
let explodeThreshold = 10; 

// Màu bóng
const BUBBLE_COLORS = [
    '#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', 
    '#a29bfe', '#fd79a8', '#fab1a0', '#81ecec', '#dfe6e9'
];

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

// --- CLASS BUBBLE & BULLET (Giữ nguyên) ---
class Bubble {
    constructor(c, r, val) {
        this.c = c; this.r = r; this.val = val;
        this.x = 0; this.y = 0; this.calcPos();
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
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#00264d'; 
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One', sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y + 3);
    }
}

class Bullet {
    constructor(x, y, angle, val) {
        this.x = x; this.y = y; this.val = val;
        this.speed = CH / 35; 
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.radius = RADIUS;
    }
    update() {
        this.x += this.dx; this.y += this.dy;
        if (this.x - this.radius <= 0) { this.x = this.radius; this.dx = -this.dx; }
        else if (this.x + this.radius >= CW) { this.x = CW - this.radius; this.dx = -this.dx; }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 2, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#00264d';
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y + 3);
    }
}

// --- HỆ THỐNG MENU & START GAME ---

// Hàm này gọi khi nhấn nút DỄ hoặc KHÓ
function startGame(difficulty) {
    if (difficulty === 'easy') {
        explodeThreshold = 10;
    } else {
        explodeThreshold = 15;
    }

    startScreen.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    
    init(); // Khởi tạo game
}

function showStartScreen() {
    gameOverModal.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

function init() {
    resizeCanvas();
    bubbles = [];
    particles = [];
    bullet = null;
    score = 0;
    isGameOver = false;
    
    currValue = getRandomValue();
    nextValue = getRandomValue();
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
    nextBallPreview.style.backgroundColor = BUBBLE_COLORS[(nextValue-1)%BUBBLE_COLORS.length];
}

// --- LOGIC CHECK LOGIC (ĐÃ CẬP NHẬT THEO LUẬT MỚI) ---

function checkCollision() {
    if (!bullet) return;
    if (bullet.y - RADIUS <= 0) { processHit(); return; }
    
    for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const dist = Math.hypot(bullet.x - b.x, bullet.y - b.y);
        if (dist < RADIUS * 2 * 0.85) { processHit(); return; }
    }
}

function processHit() {
    let r = Math.round((bullet.y - RADIUS) / (RADIUS * 1.732));
    let offset = (r % 2 !== 0) ? RADIUS : 0;
    let c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));

    if (c < 0) c = 0;
    let colsInRow = (r % 2 !== 0) ? COLS - 1 : COLS;
    if (c >= colsInRow) c = colsInRow - 1;

    if (bubbles.some(b => b.c === c && b.r === r)) {
        r++; offset = (r % 2 !== 0) ? RADIUS : 0;
        c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));
    }

    let newBubble = new Bubble(c, r, bullet.val);
    let neighbors = [];
    let totalSum = bullet.val;

    bubbles.forEach(b => {
        const dist = Math.hypot(newBubble.x - b.x, newBubble.y - b.y);
        if (dist < RADIUS * 2.1) {
            neighbors.push(b);
            totalSum += b.val;
        }
    });

    // --- KIỂM TRA ĐIỀU KIỆN NỔ DỰA VÀO explodeThreshold ---
    if (totalSum >= explodeThreshold) {
        // NỔ
        createExplosion(bullet.x, bullet.y, BUBBLE_COLORS[(bullet.val-1)%9]);
        neighbors.forEach(neighbor => {
            createExplosion(neighbor.x, neighbor.y, BUBBLE_COLORS[(neighbor.val-1)%9]);
            const index = bubbles.indexOf(neighbor);
            if (index > -1) bubbles.splice(index, 1);
        });

        playSound(popSound);
        score += totalSum * 10;
        if (bubbles.length === 0) endGame(true);

    } else {
        // DÍNH
        playSound(stickSound);
        bubbles.push(newBubble);
        if (newBubble.y > CH - RADIUS * 4) { endGame(false); }
    }

    bullet = null;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            dx: (Math.random() - 0.5) * 15,
            dy: (Math.random() - 0.5) * 15,
            life: 1, color: color
        });
    }
}

// --- INPUT & LOOP ---
function handleInput(e) {
    if (bullet || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.type.includes('touch')) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else { clientX = e.clientX; clientY = e.clientY; }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cannonX = CW / 2;
    const cannonY = CH - (RADIUS * 4); 

    const angle = Math.atan2(y - cannonY, x - cannonX);
    bullet = new Bullet(cannonX, cannonY, angle, currValue);
    playSound(shootSound);
    currValue = nextValue; nextValue = getRandomValue();
    updateUI();
}

function loop() {
    // Nếu đang ở màn hình menu thì không vẽ gì cả
    if (!startScreen.classList.contains('hidden') && bubbles.length === 0) return;

    if (isGameOver) return;
    ctx.clearRect(0, 0, CW, CH);

    const deadLineY = CH - (RADIUS * 4);
    ctx.beginPath(); ctx.moveTo(0, deadLineY); ctx.lineTo(CW, deadLineY);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)'; ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.closePath();

    bubbles.forEach(b => b.draw());

    if (bullet) { bullet.update(); bullet.draw(); checkCollision(); }
    else {
        const cannonX = CW / 2; const cannonY = CH - (RADIUS * 4);
        ctx.beginPath(); ctx.arc(cannonX, cannonY, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(currValue - 1) % BUBBLE_COLORS.length]; ctx.fill();
        ctx.fillStyle = '#00264d'; ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(currValue, cannonX, cannonY + 3);
    }

    particles.forEach((p, i) => {
        p.life -= 0.08; p.x += p.dx; p.y += p.dy;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, RADIUS/2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1; if(p.life <= 0) particles.splice(i, 1);
    });
    requestAnimationFrame(loop);
}

function endGame(win) {
    isGameOver = true;
    gameOverModal.classList.remove('hidden');
    finalScoreEl.innerText = score;
    modalTitle.innerText = win ? "CHIẾN THẮNG!" : "GAME OVER";
    modalTitle.style.color = win ? "#27ae60" : "#c0392b";
}

function playSound(audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }

window.addEventListener('resize', () => { resizeCanvas(); }); // Chỉ resize, không init lại để tránh mất game
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

// LƯU Ý: Không gọi init() ngay. Chờ người dùng bấm nút ở màn hình Chào.
window.onload = resizeCanvas;
