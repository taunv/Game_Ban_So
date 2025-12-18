const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI & Audio
const scoreEl = document.getElementById('score');
const nextBallPreview = document.getElementById('next-ball-val');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const finalScoreEl = document.getElementById('final-score');
const shootSound = document.getElementById('shootSound');
const popSound = document.getElementById('popSound');
const stickSound = document.getElementById('stickSound');

// --- CẤU HÌNH ---
let CW, CH, RADIUS;
const COLS = 7; 
let bubbles = [];
let particles = [];
let bullet = null;
let nextValue = getRandomValue();
let currValue = getRandomValue();
let score = 0;
let isGameOver = false;

// Màu nền bóng
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

// --- CLASS BUBBLE ---
class Bubble {
    constructor(c, r, val) {
        this.c = c;
        this.r = r;
        this.val = val;
        this.x = 0; 
        this.y = 0;
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
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#00264d'; 
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y + 3);
    }
}

// --- CLASS BULLET ---
class Bullet {
    constructor(x, y, angle, val) {
        this.x = x;
        this.y = y;
        this.val = val;
        this.speed = CH / 35; 
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.radius = RADIUS;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = -this.dx;
        } else if (this.x + this.radius >= CW) {
            this.x = CW - this.radius;
            this.dx = -this.dx;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 2, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#00264d';
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.val, this.x, this.y + 3);
    }
}

// --- INIT GAME ---
function init() {
    resizeCanvas();
    bubbles = [];
    particles = [];
    bullet = null;
    score = 0;
    isGameOver = false;
    modal.classList.add('hidden');
    updateUI();

    // TẠO 3 HÀNG BÓNG (Theo yêu cầu trước: giảm số hàng cho gần)
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

// --- LOGIC VA CHẠM MỚI (TÍNH TỔNG NHIỀU BÓNG) ---

function checkCollision() {
    if (!bullet) return;

    // 1. Chạm trần -> Xử lý dính
    if (bullet.y - RADIUS <= 0) {
        processHit(); 
        return;
    }

    // 2. Chạm bất kỳ bóng nào
    for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const dist = Math.hypot(bullet.x - b.x, bullet.y - b.y);

        // Nếu va chạm
        if (dist < RADIUS * 2 * 0.85) {
            processHit(); // Xử lý logic tổng hợp tại đây
            return;
        }
    }
}

// Hàm xử lý trung tâm khi va chạm xảy ra
function processHit() {
    // 1. Xác định vị trí lưới (Grid) mà viên đạn sẽ nằm vào
    // (Logic: Tìm tọa độ snap gần nhất)
    let r = Math.round((bullet.y - RADIUS) / (RADIUS * 1.732));
    let offset = (r % 2 !== 0) ? RADIUS : 0;
    let c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));

    // Giới hạn biên (để không lỗi mảng)
    if (c < 0) c = 0;
    let colsInRow = (r % 2 !== 0) ? COLS - 1 : COLS;
    if (c >= colsInRow) c = colsInRow - 1;

    // Nếu vị trí này đã có bóng, đẩy xuống hàng dưới (tránh chồng đè)
    if (bubbles.some(b => b.c === c && b.r === r)) {
        r++;
        offset = (r % 2 !== 0) ? RADIUS : 0;
        c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));
    }

    // Tạo ra quả bóng ảo tại vị trí đó để tính toán
    let newBubble = new Bubble(c, r, bullet.val);

    // 2. Tìm tất cả "Hàng xóm" (Neighbors) tiếp xúc với vị trí mới này
    let neighbors = [];
    let totalSum = bullet.val; // Bắt đầu bằng giá trị của đạn

    bubbles.forEach(b => {
        // Tính khoảng cách giữa bóng mới (ảo) và các bóng cũ
        const dist = Math.hypot(newBubble.x - b.x, newBubble.y - b.y);
        // Nếu khoảng cách < 2.1 * Radius nghĩa là đang chạm nhau
        if (dist < RADIUS * 2.1) {
            neighbors.push(b);
            totalSum += b.val;
        }
    });

    // 3. Kiểm tra Tổng
    if (totalSum >= 10) {
        // --- NỔ TẤT CẢ (Đạn + Hàng xóm) ---
        
        // Tạo hiệu ứng nổ cho đạn
        createExplosion(bullet.x, bullet.y, BUBBLE_COLORS[(bullet.val-1)%9]);

        // Xóa các hàng xóm và tạo hiệu ứng nổ cho chúng
        neighbors.forEach(neighbor => {
            createExplosion(neighbor.x, neighbor.y, BUBBLE_COLORS[(neighbor.val-1)%9]);
            // Xóa khỏi mảng bubbles
            const index = bubbles.indexOf(neighbor);
            if (index > -1) bubbles.splice(index, 1);
        });

        playSound(popSound);
        score += totalSum * 10;
        
        // Kiểm tra thắng
        if (bubbles.length === 0) endGame(true);

    } else {
        // --- KHÔNG NỔ (< 10) -> DÍNH LẠI ---
        playSound(stickSound);
        bubbles.push(newBubble); // Thêm bóng mới vào lưới
        
        // Kiểm tra thua (Chạm vạch đỏ)
        // Vạch đỏ cách đáy 4 lần bán kính (do súng đã nâng lên)
        if (newBubble.y > CH - RADIUS * 4) {
            endGame(false);
        }
    }

    bullet = null; // Xóa viên đạn đang bay
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

// --- INPUT HANDLER ---
function handleInput(e) {
    if (bullet || isGameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.type.includes('touch')) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cannonX = CW / 2;
    // VỊ TRÍ SÚNG MỚI: Đẩy lên cao để không bị che
    const cannonY = CH - (RADIUS * 4); 

    const angle = Math.atan2(y - cannonY, x - cannonX);
    
    bullet = new Bullet(cannonX, cannonY, angle, currValue);
    playSound(shootSound);

    currValue = nextValue;
    nextValue = getRandomValue();
    updateUI();
}

// --- LOOP ---
function loop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, CW, CH);

    // Vạch chết (Nâng cao lên tương ứng với súng)
    const deadLineY = CH - (RADIUS * 4);
    ctx.beginPath();
    ctx.moveTo(0, deadLineY);
    ctx.lineTo(CW, deadLineY);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();

    bubbles.forEach(b => b.draw());

    if (bullet) {
        bullet.update();
        bullet.draw();
        checkCollision();
    } else {
        const cannonX = CW / 2;
        const cannonY = CH - (RADIUS * 4); // Súng cao lên
        ctx.beginPath();
        ctx.arc(cannonX, cannonY, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(currValue - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.fillStyle = '#00264d'; 
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currValue, cannonX, cannonY + 3);
    }

    particles.forEach((p, i) => {
        p.life -= 0.08;
        p.x += p.dx;
        p.y += p.dy;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, RADIUS/2, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if(p.life <= 0) particles.splice(i, 1);
    });

    requestAnimationFrame(loop);
}

function endGame(win) {
    isGameOver = true;
    modal.classList.remove('hidden');
    finalScoreEl.innerText = score;
    modalTitle.innerText = win ? "CHIẾN THẮNG!" : "GAME OVER";
    modalTitle.style.color = win ? "#27ae60" : "#c0392b";
}

function restartGame() { init(); }

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(()=>{});
}

window.addEventListener('resize', () => { resizeCanvas(); init(); });
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    handleInput(e);
}, {passive: false});

window.onload = init;
