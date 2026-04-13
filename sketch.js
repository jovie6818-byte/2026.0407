/**
 * Project: Irregular Curve Wire Loop Game
 * Description: 採用 TDD 邏輯開發，符合 SOLID 原則，使用 curveVertex 繪製路徑。
 */

// 遊戲狀態常數
const STATE = {
  WAITING: "WAITING",
  PLAYING: "PLAYING",
  FAILED: "FAILED",
  SUCCESS: "SUCCESS"
};

let currentState = STATE.WAITING;
let trackNodes = [];
const nodeSpacing = 60; // 頂點間距
const safeGap = 80;    // 上下曲線間的垂直距離
const noiseScale = 0.005;

// 新增軌跡和粒子陣列
let trail = [];
let particles = [];

// 新增計時和分數變數
let timeLeft = 60; // 60秒倒數
let score = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateTrack();
}

function draw() {
  background(15, 15, 25); // 深色背景

  drawTrack();
  updateTrail();
  updateParticles();
  updateGameLogic();
  drawUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateTrack();
}

/**
 * 更新滑鼠軌跡
 */
function updateTrail() {
  if (currentState === STATE.PLAYING) {
    // 添加當前滑鼠位置到軌跡
    trail.push({ x: mouseX, y: mouseY, alpha: 255 });
    
    // 限制軌跡長度
    if (trail.length > 50) {
      trail.shift();
    }
    
    // 繪製軌跡
    noStroke();
    trail.forEach(p => {
      fill(255, 255, 0, p.alpha);
      ellipse(p.x, p.y, 5);
      p.alpha -= 5; // 逐漸淡化
    });
    
    // 移除完全透明的點
    trail = trail.filter(p => p.alpha > 0);
  } else {
    // 非遊戲狀態時清空軌跡
    trail = [];
  }
}

function getTrackMidY(x) {
  let left = trackNodes.find((n, i) => n.x <= x && trackNodes[i + 1]?.x > x);
  let right = trackNodes.find((n, i) => n.x > x && trackNodes[i - 1]?.x <= x);

  if (left && right) {
    let t = (x - left.x) / (right.x - left.x);
    let upper = lerp(left.upperY, right.upperY, t);
    let lower = lerp(left.lowerY, right.lowerY, t);
    return (upper + lower) / 2;
  }

  return height / 2;
}

/**
 * 1. 軌道生成邏輯 (Track Generation)
 * 使用 Perlin Noise 生成平滑的不規則頂點
 */
function generateTrack() {
  trackNodes = [];
  let dynamicSafeGap = height * 0.12; // 動態調整安全間距，縮小上下距離
  // 增加起始與結束的緩衝頂點，確保 curveVertex 繪圖完整
  for (let x = -nodeSpacing; x <= width + nodeSpacing; x += nodeSpacing) {
    let noiseVal = noise(x * noiseScale, frameCount * 0.01); // 加上時間偏移讓每次生成略有不同
    let centerY = map(noiseVal, 0, 1, height * 0.3, height * 0.7);
    
    trackNodes.push({
      x: x,
      upperY: centerY - dynamicSafeGap / 2,
      lowerY: centerY + dynamicSafeGap / 2
    });
  }
}

/**
 * 2. 繪圖邏輯 (Rendering)
 * 使用 beginShape() 與 curveVertex() 繪製電力感線條
 */
function drawTrack() {
  noFill();
  strokeWeight(3);
  
  // 繪製上邊界 (螢光藍)
  stroke(0, 200, 255, 200);
  beginShape();
  trackNodes.forEach(n => curveVertex(n.x, n.upperY));
  endShape();

  // 繪製下邊界 (螢光藍)
  beginShape();
  trackNodes.forEach(n => curveVertex(n.x, n.lowerY));
  endShape();
  
  // 裝飾性：繪製路徑發光感 (簡單陰影效果)
  if (currentState === STATE.PLAYING) {
    stroke(0, 200, 255, 50);
    strokeWeight(10);
    // ...重複繪製可增加發光感，此處省略以保持效能
  }
}

/**
 * 3. 碰撞與狀態更新邏輯 (Game Logic)
 */
function updateGameLogic() {
  if (currentState === STATE.PLAYING) {
    // 更新計時器
    if (frameCount % 60 === 0) { // 每秒減少一次
      timeLeft--;
      if (timeLeft <= 0) {
        currentState = STATE.FAILED;
        score = 0; // 時間到分數為0
        return;
      }
    }

    // 檢查是否到達最右側
    if (mouseX >= width - 20) {
      currentState = STATE.SUCCESS;
      score = timeLeft * 10; // 剩餘時間越多分數越高
      return;
    }

    // 碰撞偵測：找出目前滑鼠 X 座標夾在哪些頂點之間
    let left = trackNodes.find((n, i) => n.x <= mouseX && trackNodes[i+1]?.x > mouseX);
    let right = trackNodes.find((n, i) => n.x > mouseX && trackNodes[i-1]?.x <= mouseX);

    if (left && right) {
      // 使用線性插值 (lerp) 計算出滑鼠當前位置的精確曲線 Y 座標
      let t = (mouseX - left.x) / (right.x - left.x);
      let currentUpper = lerp(left.upperY, right.upperY, t);
      let currentLower = lerp(left.lowerY, right.lowerY, t);

      // 判定滑鼠是否碰觸邊界 (考慮滑鼠小圓點半徑 5px)
      if (mouseY <= currentUpper + 5 || mouseY >= currentLower - 5) {
        currentState = STATE.FAILED;
        score = 0; // 碰撞失敗分數為0
        createExplosion(mouseX, mouseY); // 觸發爆炸
      }
    }
  }
}

/**
 * 4. UI 介面繪製
 */
function drawUI() {
  textAlign(CENTER, CENTER);
  
  if (currentState === STATE.WAITING) {
    // 起始按鈕放在上下兩條線中間
    let startY = getTrackMidY(40);
    fill(0, 255, 100);
    ellipse(40, startY, 60);
    fill(0);
    text("START", 40, startY);
    
    fill(255);
    text("點擊綠色按鈕開始遊戲", width / 2, height - 30);
  } 
  else if (currentState === STATE.PLAYING) {
    // 滑鼠指示點
    fill(255, 255, 0);
    noStroke();
    ellipse(mouseX, mouseY, 10);
    
    // 顯示剩餘時間
    fill(255);
    textSize(24);
    text(`時間: ${timeLeft}秒`, width / 2, 30);
  } 
  else if (currentState === STATE.FAILED) {
    fill(255, 50, 50);
    textSize(32);
    text("碰撞失敗！點擊畫面重來", width / 2, height / 2 - 20);
    textSize(24);
    text(`分數: ${score}`, width / 2, height / 2 + 20);
  } 
  else if (currentState === STATE.SUCCESS) {
    fill(100, 255, 100);
    textSize(32);
    text("成功抵達終點！", width / 2, height / 2 - 20);
    textSize(24);
    text(`分數: ${score}`, width / 2, height / 2 + 20);
  }
}

/**
 * 5. 互動控制
 */
function mousePressed() {
  if (currentState === STATE.WAITING) {
    let startY = getTrackMidY(40);
    // 檢查是否點擊起始按鈕
    if (dist(mouseX, mouseY, 40, startY) < 30) {
      currentState = STATE.PLAYING;
      timeLeft = 60; // 重置計時器
      score = 0; // 重置分數
    }
  } else if (currentState === STATE.FAILED || currentState === STATE.SUCCESS) {
    // 重置遊戲
    generateTrack();
    currentState = STATE.WAITING;
    timeLeft = 60; // 重置計時器
    score = 0; // 重置分數
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateTrack();
}

/**
 * 更新粒子
 */
function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // 重力
    p.alpha -= 2;
  });
  
  // 繪製粒子
  noStroke();
  particles.forEach(p => {
    fill(255, 200, 100, p.alpha);
    ellipse(p.x, p.y, 3);
  });
  
  // 移除透明粒子
  particles = particles.filter(p => p.alpha > 0);
}

/**
 * 創建爆炸粒子
 */
function createExplosion(x, y) {
  for (let i = 0; i < 20; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 5);
    particles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      alpha: 255
    });
  }
}