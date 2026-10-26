// ===== 玄关题字：粒子流 + 鼠标浮起 + 点击波浪 =====
// 只在玄关阶段（body.gate）活动；canvas 叠在字上方，pointer-events 关闭，点击由容器接收
const TAU = Math.PI * 2;

export function initGateTitle() {
  const wrap = document.getElementById("gate-title");
  const canvas = document.getElementById("gate-canvas");
  const ctx = canvas.getContext("2d");
  const chars = [...wrap.querySelectorAll(".gt-char")];

  const dpr = Math.min(devicePixelRatio, 2);
  let W = 0, H = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  // ---- 鼠标跟踪（浮起效果） ----
  const mouse = { x: -9999, y: -9999 };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // ---- 粒子 ----
  const particles = [];
  const MAX = 130;

  function spawnFlow(w, h) {
    // 常驻粒子：沿着字幅横向出生，缓缓上升摇曳
    particles.push({
      kind: "flow",
      x: Math.random() * w,
      y: h * (0.3 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 14,
      vy: -(8 + Math.random() * 22),
      size: 1.2 + Math.random() * 2.2,
      life: 0,
      ttl: 3 + Math.random() * 3,
      hue: Math.random() < 0.75 ? "255,217,138" : "154,223,255",
      sway: Math.random() * TAU,
    });
  }

  function burst(x, y) {
    // 点击迸裂：从点击点向四周抛洒
    for (let i = 0; i < 16 && particles.length < MAX; i++) {
      const a = Math.random() * TAU;
      const v = 60 + Math.random() * 110;
      particles.push({
        kind: "burst",
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        size: 1.6 + Math.random() * 2.4,
        life: 0,
        ttl: 0.7 + Math.random() * 0.5,
        hue: Math.random() < 0.6 ? "255,233,184" : "154,223,255",
      });
    }
  }

  // ---- 点击波浪：离点击点越远的字越晚起跳 ----
  function ripple(clientX) {
    for (const span of chars) {
      const r = span.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - clientX);
      span.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-26px) scale(1.12)", offset: 0.35 },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 720, delay: dist * 1.15, easing: "cubic-bezier(.3,.7,.3,1)" }
      );
    }
  }

  wrap.addEventListener("pointerdown", (e) => {
    const cr = canvas.getBoundingClientRect();
    burst(e.clientX - cr.left, e.clientY - cr.top);
    ripple(e.clientX);
  });

  // ---- 主循环 ----
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const active = document.body.classList.contains("gate");

    ctx.clearRect(0, 0, W, H);
    if (!active) return;

    // 常驻流动粒子：维持数量
    if (particles.length < 70 && Math.random() < 0.5) spawnFlow(W, H);

    // 每个字的浮起目标值（鼠标越近浮得越高）+ 待机轻晃
    for (const span of chars) {
      const r = span.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
      const lift = Math.max(0, 1 - dist / 170) * -20;
      const bob = Math.sin(now / 1000 * 1.4 + cx * 0.01) * 4;
      span.style.transform = `translateY(${(lift + bob).toFixed(2)}px)`;
    }

    // 粒子更新与绘制
    ctx.globalCompositeOperation = "lighter";
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.ttl) {
        particles.splice(i, 1);
        continue;
      }
      if (p.kind === "flow") {
        p.sway += dt * 2;
        p.x += (p.vx + Math.sin(p.sway) * 10) * dt;
        p.y += p.vy * dt;
        // 鼠标推开
        const dx = p.x - (mouse.x - canvas.getBoundingClientRect().left);
        const dy = p.y - (mouse.y - canvas.getBoundingClientRect().top);
        const d2 = dx * dx + dy * dy;
        if (d2 < 4900) {
          const d = Math.sqrt(d2) || 1;
          p.x += (dx / d) * 40 * dt;
          p.y += (dy / d) * 40 * dt;
        }
      } else {
        p.vy += 90 * dt; // 迸裂粒子受重力
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      const k = p.life / p.ttl;
      const alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      ctx.fillStyle = `rgba(${p.hue},${(alpha * 0.9).toFixed(3)})`;
      ctx.shadowColor = `rgba(${p.hue},.8)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }
  requestAnimationFrame(frame);
}
