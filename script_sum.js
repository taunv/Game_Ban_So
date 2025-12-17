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
const COLS = 7; // Giảm số cột xuống 7 để bóng to hơn, dễ nhìn hơn trên đt
let bubbles = [];
let particles = [];
let bullet = null;
let nextValue = getRandomValue();
let currValue = getRandomValue();
let score = 0;
let isGameOver = false;

// Màu nền của bóng (Pastel dịu mắt)
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
    // Tính bán kính: (Chiều rộng / số cột) / 2
    RADIUS = (CW / COLS) / 2;
}

function getRandomValue() { return Math.floor(Math.random() * 9) + 1; }

// --- CLASS BONG BÓNG ---
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
        // Lưới Hexagon: Hàng lẻ thụt vào 1 bán kính
        const offset = (this.r % 2 !== 0) ? RADIUS : 0;
        this.x = (this.c * RADIUS * 2) + RADIUS + offset;
        // Khoảng cách giữa các hàng khít hơn (sin 60 độ)
        this.y = (this.r * RADIUS * 1.732) + RADIUS; 
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, RADIUS - 2, 0, Math.PI * 2);
        
        // Màu nền phẳng, giảm độ bóng để đỡ chói
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        
        // Viền nhẹ
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // --- SỐ XANH ĐẬM (FIX) ---
        ctx.fillStyle = '#00264d'; // Xanh đậm đen
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Vẽ số +3px y để căn giữa thị giác tốt hơn
        ctx.fillText(this.val, this.x, this.y + 3);
    }
}

// --- CLASS VIÊN ĐẠN ---
class Bullet {
    constructor(x, y, angle, val) {
        this.x = x;
        this.y = y;
        this.val = val;
        this.speed = CH / 35; // Tốc độ bay
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.radius = RADIUS;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        // Va chạm tường trái/phải
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = -this.dx;
        } else if (this.x + this.radius >= CW) {
            this.x = CW - this.radius;
            this.dx = -this.dx;
        }
    }

    draw() {
        // Vẽ đạn y hệt Bubble
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 2, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(this.val - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#fff"; // Viền trắng cho đạn để dễ nhìn
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#00264d'; // Số xanh đậm
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

    // Tạo màn chơi ban đầu (5 hàng)
    for(let r = 0; r < 5; r++) {
        // Hàng lẻ sẽ ít hơn 1 bóng
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

// --- XỬ LÝ VA CHẠM (QUAN TRỌNG) ---

function checkCollision() {
    if (!bullet) return;

    // 1. Chạm trần -> Dính
    if (bullet.y - RADIUS <= 0) {
        snapBullet();
        return;
    }

    // 2. Va chạm với bóng trên lưới
    for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const dist = Math.hypot(bullet.x - b.x, bullet.y - b.y);

        // Khoảng cách va chạm < 2R (có trừ đi 1 chút để va chạm sâu hơn)
        if (dist < RADIUS * 2 * 0.85) {
            
            const sum = bullet.val + b.val;

            if (sum >= 10) {
                // NỔ (Sum >= 10)
                createExplosion(b.x, b.y, BUBBLE_COLORS[(b.val-1)%9]);
                createExplosion(bullet.x, bullet.y, BUBBLE_COLORS[(bullet.val-1)%9]);
                
                bubbles.splice(i, 1); // Xóa bóng bị trúng
                bullet = null; // Xóa đạn
                score += sum * 10;
                
                playSound(popSound);
                
                if (bubbles.length === 0) endGame(true);

            } else {
                // KHÔNG NỔ (Sum < 10) -> DÍNH LẠI
                snapBullet();
            }
            return; // Kết thúc check sau khi va chạm
        }
    }
}

// Hàm dính đạn vào lưới
function snapBullet() {
    playSound(stickSound);
    
    // Tìm tọa độ lưới gần nhất (cột, hàng)
    // Công thức đảo ngược từ calcPos của Bubble
    let r = Math.round((bullet.y - RADIUS) / (RADIUS * 1.732));
    
    // Xác định offset của hàng đó
    let offset = (r % 2 !== 0) ? RADIUS : 0;
    let c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));

    // Giới hạn biên
    if (c < 0) c = 0;
    let colsInRow = (r % 2 !== 0) ? COLS - 1 : COLS;
    if (c >= colsInRow) c = colsInRow - 1;

    // Kiểm tra xem vị trí đó có bóng chưa, nếu có thì tìm chỗ trống bên cạnh
    // (Logic đơn giản: nếu trùng thì đẩy xuống 1 hàng)
    let existing = bubbles.find(b => b.c === c && b.r === r);
    if (existing) {
        r++; // Đẩy xuống hàng dưới
        // Tính lại cột cho hàng dưới
        offset = (r % 2 !== 0) ? RADIUS : 0;
        c = Math.round((bullet.x - RADIUS - offset) / (RADIUS * 2));
    }

    const newBubble = new Bubble(c, r, bullet.val);
    bubbles.push(newBubble);
    bullet = null;

    // Kiểm tra Game Over (Chạm đáy)
    // Đáy vùng an toàn cách mép dưới khoảng 2.5 quả bóng (chừa chỗ cho súng)
    if (newBubble.y > CH - RADIUS * 2.5) {
        endGame(false);
    }
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

// --- INPUT HANDLER (FIX LỖI BẮN) ---
function handleInput(e) {
    if (bullet || isGameOver) return;
    
    // Lấy vị trí click CHÍNH XÁC so với Canvas
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

    // Vị trí súng
    const cannonX = CW / 2;
    const cannonY = CH - RADIUS;

    // Tính góc
    const angle = Math.atan2(y - cannonY, x - cannonX);
    
    bullet = new Bullet(cannonX, cannonY, angle, currValue);
    playSound(shootSound);

    // Nạp đạn tiếp theo
    currValue = nextValue;
    nextValue = getRandomValue();
    updateUI();
}

// --- LOOP ---
function loop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, CW, CH);

    // Vẽ vạch chết
    ctx.beginPath();
    ctx.moveTo(0, CH - RADIUS * 2.5);
    ctx.lineTo(CW, CH - RADIUS * 2.5);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();

    // Vẽ bóng
    bubbles.forEach(b => b.draw());

    // Vẽ đạn
    if (bullet) {
        bullet.update();
        bullet.draw();
        checkCollision();
    } else {
        // Vẽ bóng chờ
        const cannonX = CW / 2;
        const cannonY = CH - RADIUS;
        ctx.beginPath();
        ctx.arc(cannonX, cannonY, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = BUBBLE_COLORS[(currValue - 1) % BUBBLE_COLORS.length];
        ctx.fill();
        ctx.fillStyle = '#00264d'; // Số xanh đậm
        ctx.font = `bold ${Math.floor(RADIUS)}px 'Fredoka One'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currValue, cannonX, cannonY + 3);
    }

    // Hiệu ứng nổ
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

function restartGame() {
    init();
}

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(()=>{});
}

// Events
window.addEventListener('resize', () => { resizeCanvas(); init(); });
// Mouse
canvas.addEventListener('mousedown', handleInput);
// Touch - Quan trọng: dùng touchend để lấy tọa độ thả tay
canvas.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    handleInput(e);
}, {passive: false});

// Bắt đầu
window.onload = init;
