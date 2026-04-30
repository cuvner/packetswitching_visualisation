// Loading a Webpage — GCSE Computer Science Network Visualisation
// Sequence: TCP three-way handshake -> HTTP request/response over a mesh network

const BR = '192.168.1.5';    // browser IP
const WS = '151.101.0.81';   // web server IP

const NODES = [
  { label:'Your Browser', ip: BR,          x:105,  y:410, type:'client' },
  { label:'Home Router',  ip:'192.168.1.1',x:250,  y:410, type:'router' },
  { label:'Router A',     ip:'10.0.1.1',   x:410,  y:225, type:'router' },
  { label:'Router B',     ip:'10.0.2.1',   x:430,  y:575, type:'router' },
  { label:'Router C',     ip:'10.0.3.1',   x:620,  y:330, type:'router' },
  { label:'Router D',     ip:'10.0.4.1',   x:640,  y:650, type:'router' },
  { label:'Router E',     ip:'10.0.5.1',   x:815,  y:210, type:'router' },
  { label:'Router F',     ip:'10.0.6.1',   x:830,  y:525, type:'router' },
  { label:'Web Server',   ip: WS,          x:965,  y:405, type:'server' },
];

const EDGES = [
  [0,1],
  [1,2], [1,3],
  [2,3], [2,4], [2,6],
  [3,4], [3,5], [3,7],
  [4,5], [4,6], [4,7],
  [5,7],
  [6,7], [6,8],
  [7,8],
];

// Each step: one packet travels path, next step starts after arrival pause
const SEQ = [
  { group:'1  TCP Handshake', step:'SYN →',
    title:'TCP  SYN',         ipLine: BR + '  →  ' + WS,
    col:'#55aaff', path:[0,1,2,4,6,8],
    desc:['Browser requests a reliable', 'TCP connection with SYN.', 'Route: Home -> A -> C -> E'] },

  { group:'1  TCP Handshake', step:'← SYN-ACK',
    title:'TCP  SYN-ACK',     ipLine: WS + '  →  ' + BR,
    col:'#55aaff', path:[8,7,3,1,0],
    desc:['Server replies SYN-ACK.', 'The return packet can take', 'a different mesh route.'] },

  { group:'1  TCP Handshake', step:'ACK →',
    title:'TCP  ACK',         ipLine: BR + '  →  ' + WS,
    col:'#55aaff', path:[0,1,3,5,7,8],
    desc:['Browser sends final ACK.', 'TCP connection established.', 'Route: Home -> B -> D -> F'] },

  { group:'2  HTTP Request',  step:'GET /index.html →',
    title:'HTTP  GET',        ipLine: BR + '  →  ' + WS + ':80',
    col:'#44ff88', path:[0,1,2,6,8],
    desc:['Browser requests the page:', 'GET /index.html HTTP/1.1', 'Packets use the upper route.'] },

  { group:'3  HTTP Response', step:'← HTML',
    title:'200 OK  HTML',     ipLine: WS + '  →  ' + BR,
    col:'#ff7744', path:[8,7,4,3,1,0],
    desc:['Server sends 200 OK + HTML.', 'Response packets move back', 'through the centre of the mesh.'] },

  { group:'3  HTTP Response', step:'GET /style.css →',
    title:'HTTP  GET',        ipLine: BR + '  →  ' + WS + ':80',
    col:'#44ff88', path:[0,1,3,4,7,8],
    desc:['HTML references a stylesheet.', 'Browser requests /style.css.', 'Traffic crosses between routers.'] },

  { group:'3  HTTP Response', step:'← CSS',
    title:'200 OK  CSS',      ipLine: WS + '  →  ' + BR,
    col:'#ff7744', path:[8,6,4,2,1,0],
    desc:['CSS received.', 'Browser applies styles:', 'colours, fonts, layout.'] },

  { group:'3  HTTP Response', step:'GET /app.js →',
    title:'HTTP  GET',        ipLine: BR + '  →  ' + WS + ':80',
    col:'#44ff88', path:[0,1,2,3,5,7,8],
    desc:['HTML references JavaScript.', 'Browser requests /app.js.', 'This route drops to the lower mesh.'] },

  { group:'3  HTTP Response', step:'← JavaScript',
    title:'200 OK  JS',       ipLine: WS + '  →  ' + BR,
    col:'#ff7744', path:[8,7,6,4,3,1,0],
    desc:['JavaScript received.', 'Data has moved both ways', 'across different mesh routes.'] },
];

let   PKT_SPD   = 0.007;
const STEP_WAIT = 70;

const SPEED_BTNS = [
  { label:'Slow',   spd:0.003 },
  { label:'Normal', spd:0.007 },
  { label:'Fast',   spd:0.020 },
];
const SB_X = 630, SB_Y = 22, SB_W = 74, SB_H = 28, SB_GAP = 8;

let stepIdx   = 0;
let activePkt = null;
let waitTimer = 0;
let done      = false;
let nodeFlash = [];
let eventLog  = [];
let paused    = false;

function setup() {
  const cnv = createCanvas(1400, 800);
  cnv.parent('canvas-container');
  textFont('Courier New');
  nodeFlash = new Array(NODES.length).fill(0);
  launchStep();
}

function draw() {
  background(9, 13, 24);

  if (!paused && !done) {
    if (activePkt) {
      tickPkt();
    } else if (waitTimer > 0) {
      waitTimer--;
      if (waitTimer === 0) launchStep();
    }
    for (let i = 0; i < nodeFlash.length; i++) {
      if (nodeFlash[i] > 0) nodeFlash[i]--;
    }
  }

  drawEdges();
  drawNodes();
  drawActivePkt();
  drawTitle();
  drawPhasePanel();
  drawEventLog();
  if (done)            drawPageLoaded();
  if (paused && !done) drawPausedBadge();
}

function mousePressed() {
  // Speed buttons take priority
  for (let i = 0; i < SPEED_BTNS.length; i++) {
    const bx = SB_X + i * (SB_W + SB_GAP);
    if (mouseX >= bx && mouseX <= bx + SB_W && mouseY >= SB_Y && mouseY <= SB_Y + SB_H) {
      PKT_SPD = SPEED_BTNS[i].spd;
      return;
    }
  }
  if (done) { resetSim(); return; }
  paused = !paused;
}

function keyPressed() {
  if (key === ' ') { if (done) { resetSim(); return; } paused = !paused; }
  if (key === 'r' || key === 'R') resetSim();
}

function resetSim() {
  stepIdx = 0; activePkt = null; waitTimer = 0;
  done = false; eventLog = []; nodeFlash.fill(0);
  paused = false;
  launchStep();
}

function launchStep() {
  if (stepIdx >= SEQ.length) { done = true; return; }
  activePkt = { s: SEQ[stepIdx], edgeIdx: 0, progress: 0 };
}

function tickPkt() {
  activePkt.progress += PKT_SPD;
  if (activePkt.progress < 1) return;
  activePkt.progress = 0;
  activePkt.edgeIdx++;

  const arrivedAt = activePkt.s.path[activePkt.edgeIdx];
  nodeFlash[arrivedAt] = 60;

  if (activePkt.edgeIdx >= activePkt.s.path.length - 1) {
    eventLog.unshift({ step: activePkt.s.step, col: activePkt.s.col, group: activePkt.s.group });
    if (eventLog.length > 11) eventLog.length = 11;
    activePkt = null;
    stepIdx++;
    waitTimer = STEP_WAIT;
  }
}

// ── Network drawing ───────────────────────────────────────────────

function drawEdges() {
  for (const [a, b] of EDGES) {
    stroke(35, 60, 85);
    strokeWeight(2.5);
    line(NODES[a].x, NODES[a].y, NODES[b].x, NODES[b].y);
  }
  if (activePkt) {
    const c = color(activePkt.s.col);
    for (let i = 0; i < activePkt.s.path.length - 1; i++) {
      const f = NODES[activePkt.s.path[i]];
      const t = NODES[activePkt.s.path[i + 1]];
      stroke(red(c), green(c), blue(c), i === activePkt.edgeIdx ? 120 : 45);
      strokeWeight(i === activePkt.edgeIdx ? 5 : 3);
      line(f.x, f.y, t.x, t.y);
    }

    const f = NODES[activePkt.s.path[activePkt.edgeIdx]];
    const t = NODES[activePkt.s.path[activePkt.edgeIdx + 1]];
    if (f && t) {
      stroke(red(c), green(c), blue(c), 95);
      strokeWeight(4.5);
      line(f.x, f.y, t.x, t.y);
    }
  }
}

function drawNodes() {
  for (let i = 0; i < NODES.length; i++) {
    const n  = NODES[i];
    const fl = nodeFlash[i] / 60;

    if (fl > 0) {
      drawingContext.shadowBlur  = 32 * fl;
      drawingContext.shadowColor = '#ffee44';
    }

    rectMode(CENTER);

    if (n.type === 'client') {
      fill(lerpColor(color(18, 55, 120), color(100, 90, 10), fl));
      stroke(lerpColor(color(0, 130, 220), color(255, 220, 0), fl));
      strokeWeight(2.5);
      rect(n.x, n.y, 82, 60, 6);
      noStroke();
      fill(0, 160, 230, 140);
      rect(n.x, n.y - 4, 68, 38, 4);
      stroke(lerpColor(color(0, 130, 220), color(255, 220, 0), fl));
      strokeWeight(2.5);
      line(n.x, n.y + 30, n.x, n.y + 44);
      line(n.x - 20, n.y + 44, n.x + 20, n.y + 44);

    } else if (n.type === 'router') {
      fill(lerpColor(color(12, 38, 22), color(70, 65, 5), fl));
      stroke(lerpColor(color(0, 190, 70), color(255, 220, 0), fl));
      strokeWeight(2.5);
      drawHex(n.x, n.y, 36);
      noStroke();
      fill(lerpColor(color(0, 190, 70), color(255, 220, 0), fl));
      ellipse(n.x, n.y, 12);

    } else if (n.type === 'dns') {
      fill(lerpColor(color(50, 20, 80), color(70, 50, 10), fl));
      stroke(lerpColor(color(170, 80, 255), color(255, 220, 0), fl));
      strokeWeight(2.5);
      ellipse(n.x, n.y, 74, 74);
      noStroke();
      fill(lerpColor(color(195, 125, 255), color(255, 235, 80), fl));
      textSize(14);
      textAlign(CENTER, CENTER);
      text('DNS', n.x, n.y);

    } else if (n.type === 'server') {
      fill(lerpColor(color(50, 20, 20), color(70, 50, 5), fl));
      stroke(lerpColor(color(220, 80, 60), color(255, 220, 0), fl));
      strokeWeight(2.5);
      rect(n.x, n.y, 76, 62, 5);
      noStroke();
      for (let j = -1; j <= 1; j++) {
        fill(lerpColor(color(200, 70, 50), color(255, 220, 0), fl));
        rect(n.x, n.y + j * 18, 58, 11, 2);
      }
    }

    drawingContext.shadowBlur = 0;

    noStroke();
    fill(240);
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text(n.label, n.x, n.y - 50);

    fill(100, 165, 255);
    textSize(10);
    textAlign(CENTER, TOP);
    text(n.ip, n.x, n.y + 50);
  }
}

function drawHex(x, y, r) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const a = TWO_PI / 6 * i - PI / 6;
    vertex(x + r * cos(a), y + r * sin(a));
  }
  endShape(CLOSE);
}

function drawActivePkt() {
  if (!activePkt) return;
  const fNode = NODES[activePkt.s.path[activePkt.edgeIdx]];
  const tNode = NODES[activePkt.s.path[activePkt.edgeIdx + 1]];
  if (!tNode) return;

  const px = lerp(fNode.x, tNode.x, activePkt.progress);
  const py = lerp(fNode.y, tNode.y, activePkt.progress);

  const PW = 165, PH = 44;
  const c  = color(activePkt.s.col);

  drawingContext.shadowBlur  = 26;
  drawingContext.shadowColor = activePkt.s.col;

  // Outer dark box
  fill(10, 18, 36);
  stroke(activePkt.s.col);
  strokeWeight(1.5);
  rectMode(CENTER);
  rect(px, py, PW, PH, 6);

  // Coloured header strip (top 18px of box)
  noStroke();
  fill(red(c), green(c), blue(c), 220);
  rectMode(CORNER);
  rect(px - PW/2 + 1.5, py - PH/2 + 1.5, PW - 3, 19, 6, 6, 0, 0);

  drawingContext.shadowBlur = 0;

  // Title in header
  fill(8, 10, 22);
  textSize(10);
  textAlign(CENTER, CENTER);
  text(activePkt.s.title, px, py - PH/2 + 11);

  // IP line in body
  fill(190, 215, 255);
  textSize(9);
  text(activePkt.s.ipLine, px, py + 9);

  rectMode(CENTER);
}

// ── UI panels ─────────────────────────────────────────────────────

const PX = 1020, PW = 360;

function drawTitle() {
  noStroke();
  fill('#00d4ff');
  textSize(19);
  textAlign(LEFT, TOP);
  text('Loading a Webpage — Mesh Network Routes', 14, 8);
  fill(100, 155, 200);
  textSize(10);
  text('[SPACE / click = pause  |  R = restart]', 16, 36);
  drawSpeedButtons();
}

function drawSpeedButtons() {
  noStroke();
  fill(100, 155, 200);
  textSize(10);
  textAlign(RIGHT, CENTER);
  text('SPEED:', SB_X - 8, SB_Y + SB_H / 2);

  for (let i = 0; i < SPEED_BTNS.length; i++) {
    const btn    = SPEED_BTNS[i];
    const bx     = SB_X + i * (SB_W + SB_GAP);
    const active = PKT_SPD === btn.spd;

    fill(active ? color(0, 90, 150) : color(14, 24, 44));
    stroke(active ? '#00d4ff' : color(45, 75, 105));
    strokeWeight(1.5);
    rectMode(CORNER);
    rect(bx, SB_Y, SB_W, SB_H, 5);

    noStroke();
    fill(active ? '#00d4ff' : color(140, 170, 200));
    textSize(11);
    textAlign(CENTER, CENTER);
    text(btn.label, bx + SB_W / 2, SB_Y + SB_H / 2);
  }
}

function drawPhasePanel() {
  const py = 62, ph = 268;

  fill(0, 0, 0, 175);
  noStroke();
  rectMode(CORNER);
  rect(PX - 10, py - 10, PW + 20, ph + 20, 8);

  if (done) {
    noStroke();
    fill('#00ff88');
    textSize(15);
    textAlign(LEFT, TOP);
    text('COMPLETE', PX, py);
    fill(175, 220, 175);
    textSize(11);
    text('All ' + SEQ.length + ' steps done.', PX, py + 28);
    text('www.bbc.co.uk is loaded!', PX, py + 48);
    return;
  }

  const cur = SEQ[min(stepIdx, SEQ.length - 1)];

  fill('#00d4ff');
  textSize(10);
  textAlign(LEFT, TOP);
  text('CURRENT STEP', PX, py);

  stroke(0, 160, 210, 60);
  strokeWeight(0.5);
  line(PX, py + 17, PX + PW, py + 17);
  noStroke();

  fill(255, 220, 60);
  textSize(15);
  text(cur.group, PX, py + 24);

  fill(color(cur.col));
  textSize(14);
  text(cur.step, PX, py + 46);

  stroke(50, 60, 80);
  strokeWeight(0.5);
  line(PX, py + 66, PX + PW, py + 66);
  noStroke();

  fill(175, 220, 175);
  textSize(10);
  for (let i = 0; i < cur.desc.length; i++) {
    text(cur.desc[i], PX, py + 74 + i * 18);
  }

  // Progress bar
  const prog = stepIdx / SEQ.length;
  fill(25, 45, 65);
  rectMode(CORNER);
  rect(PX, py + ph - 22, PW, 11, 4);
  fill('#00d4ff');
  rect(PX, py + ph - 22, PW * prog, 11, 4);
  fill(130, 165, 200);
  textSize(9);
  textAlign(RIGHT, TOP);
  text('Step ' + stepIdx + ' / ' + SEQ.length, PX + PW, py + ph - 6);
}

function drawEventLog() {
  const py = 350, ph = 420;

  fill(0, 0, 0, 170);
  noStroke();
  rectMode(CORNER);
  rect(PX - 10, py - 10, PW + 20, ph + 20, 8);

  fill('#00d4ff');
  textSize(10);
  textAlign(LEFT, TOP);
  text('EVENT LOG', PX, py);

  stroke(0, 160, 210, 60);
  strokeWeight(0.5);
  line(PX, py + 17, PX + PW, py + 17);
  noStroke();

  for (let i = 0; i < eventLog.length; i++) {
    const e     = eventLog[i];
    const alpha = map(i, 0, max(eventLog.length, 1), 245, 55);
    const c     = color(e.col);

    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    ellipse(PX + 7, py + 33 + i * 34, 9);

    fill(165, 165, 165, alpha);
    textSize(9);
    textAlign(LEFT, TOP);
    text(e.group, PX + 20, py + 25 + i * 34);

    fill(red(c), green(c), blue(c), alpha);
    textSize(11);
    text(e.step, PX + 20, py + 37 + i * 34);
  }
}

function drawPageLoaded() {
  // Dim the network area
  fill(5, 10, 20, 218);
  noStroke();
  rectMode(CORNER);
  rect(0, 58, 1012, 738);

  // Success banner
  fill(8, 28, 18);
  stroke('#00ff88');
  strokeWeight(2);
  rectMode(CENTER);
  rect(505, 192, 560, 72, 10);

  noStroke();
  fill('#00ff88');
  textSize(27);
  textAlign(CENTER, CENTER);
  text('Page Loaded Successfully!', 505, 182);
  fill(160, 210, 160);
  textSize(11);
  text('www.bbc.co.uk  —  ' + SEQ.length + ' network steps completed', 505, 207);

  drawBrowserMockup(505, 430);

  fill(130, 160, 220);
  textSize(11);
  textAlign(CENTER, TOP);
  text('Click or press R to watch again', 505, 580);
}

function drawBrowserMockup(cx, cy) {
  const BW = 580, BH = 300;

  // Chrome frame
  stroke(75, 115, 175);
  strokeWeight(2);
  fill(17, 27, 50);
  rectMode(CENTER);
  rect(cx, cy, BW, BH, 10);

  // Tab bar strip
  noStroke();
  fill(22, 36, 62);
  rectMode(CORNER);
  rect(cx - BW/2 + 2, cy - BH/2 + 2, BW - 4, 28, 10, 10, 0, 0);

  // Active tab
  fill(32, 52, 88);
  rect(cx - BW/2 + 12, cy - BH/2 + 6, 140, 20, 4, 4, 0, 0);
  fill(185, 205, 235);
  textSize(9);
  textAlign(LEFT, CENTER);
  text('BBC News - Home', cx - BW/2 + 20, cy - BH/2 + 17);

  // Window buttons
  fill(255, 95, 86);  ellipse(cx + BW/2 - 16, cy - BH/2 + 15, 11);
  fill(255, 189, 46); ellipse(cx + BW/2 - 31, cy - BH/2 + 15, 11);
  fill(39, 201, 63);  ellipse(cx + BW/2 - 46, cy - BH/2 + 15, 11);

  // Tab-bar divider
  stroke(45, 65, 100);
  strokeWeight(1);
  line(cx - BW/2 + 2, cy - BH/2 + 31, cx + BW/2 - 2, cy - BH/2 + 31);

  // Address bar
  noStroke();
  fill(10, 20, 40);
  rectMode(CENTER);
  rect(cx, cy - BH/2 + 50, BW - 24, 24, 5);
  fill(80, 200, 100);
  ellipse(cx - (BW - 24)/2 + 16, cy - BH/2 + 50, 11);
  fill(195, 225, 195);
  textSize(11);
  textAlign(CENTER, CENTER);
  text('https://www.bbc.co.uk', cx, cy - BH/2 + 50);

  // Toolbar divider
  stroke(45, 65, 100);
  strokeWeight(1);
  line(cx - BW/2 + 2, cy - BH/2 + 64, cx + BW/2 - 2, cy - BH/2 + 64);

  // Page content wireframe
  const ct = cy - BH/2 + 74;  // content top
  const cw = BW - 20;

  noStroke();
  // Nav bar
  fill(55, 88, 140);
  rectMode(CENTER);
  rect(cx, ct + 11, cw, 20, 2);

  // Hero / headline block
  fill(40, 62, 100);
  rect(cx, ct + 43, cw, 30, 2);
  fill(75, 110, 165);
  textSize(10);
  textAlign(CENTER, CENTER);
  text('Breaking News — Top Story Headline Here', cx, ct + 43);

  // Two-column cards
  fill(35, 55, 88);
  rect(cx - cw/4 - 4, ct + 80, cw/2 - 8, 40, 2);
  rect(cx + cw/4 + 4, ct + 80, cw/2 - 8, 40, 2);

  // Subtext rows
  fill(30, 48, 78);
  rect(cx - 80, ct + 134, 220, 12, 2);
  rect(cx + 110, ct + 134, 120, 12, 2);
  rect(cx - 50, ct + 154, 280, 12, 2);

  // Footer
  fill(50, 80, 125);
  rect(cx, ct + 178, cw, 18, 2);
}

function drawPausedBadge() {
  fill(0, 0, 0, 145);
  noStroke();
  rectMode(CENTER);
  rect(505, 320, 215, 50, 8);
  fill(255, 220, 60);
  textSize(21);
  textAlign(CENTER, CENTER);
  text('PAUSED', 505, 320);
}
