"use client";

import { useEffect, useRef, useState } from "react";
import { loadBestScores, saveBestScore } from "@/lib/games";

const GRID = 20; // 每格像素
const TILES = 20; // 20x20 网格

type Point = { x: number; y: number };
type Phase = "menu" | "countdown" | "playing" | "paused" | "over";
type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: Record<Difficulty, { label: string; rank: string; speed: number; minSpeed: number; accel: number }> = {
  easy: { label: "简单", rank: "下", speed: 150, minSpeed: 70, accel: 2 },
  medium: { label: "中等", rank: "中", speed: 100, minSpeed: 45, accel: 1 },
  hard: { label: "困难", rank: "上", speed: 70, minSpeed: 35, accel: 1 },
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; size: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI 状态（React 渲染用）
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [length, setLength] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isNewHigh, setIsNewHigh] = useState(false);

  // 游戏核心状态（refs，供游戏循环直接读写）
  const phaseRef = useRef<Phase>("menu");
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirectionRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const speedRef = useRef(DIFFICULTIES.medium.speed);
  const difficultyRef = useRef<Difficulty>("medium");
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const countdownRef = useRef(3);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accRef = useRef(0);

  // 挂载时读取最高分
  useEffect(() => {
    const b = loadBestScores()["snake"] ?? 0;
    bestRef.current = b;
    setBest(b);
  }, []);

  const generateFood = () => {
    let newFood: Point;
    do {
      newFood = { x: Math.floor(Math.random() * TILES), y: Math.floor(Math.random() * TILES) };
    } while (snakeRef.current.some((s) => s.x === newFood.x && s.y === newFood.y));
    return newFood;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2) / 12 * i + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      particlesRef.current.push({
        x: x * GRID + GRID / 2,
        y: y * GRID + GRID / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.04,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  const updateParticles = () => {
    const ps = particlesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) ps.splice(i, 1);
    }
  };

  const setPhaseAll = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const gameOver = () => {
    setPhaseAll("over");
    shakeRef.current = 15;
    const head = snakeRef.current[0];
    spawnParticles(head.x, head.y, "#e94560");

    let newHigh = false;
    if (scoreRef.current > bestRef.current) {
      bestRef.current = saveBestScore("snake", scoreRef.current);
      setBest(bestRef.current);
      newHigh = true;
    }
    setIsNewHigh(newHigh);
  };

  const update = () => {
    // 应用方向
    directionRef.current = { ...nextDirectionRef.current };

    const head = { ...snakeRef.current[0] };
    head.x += directionRef.current.x;
    head.y += directionRef.current.y;

    // 撞墙
    if (head.x < 0 || head.x >= TILES || head.y < 0 || head.y >= TILES) {
      gameOver();
      return;
    }

    const eating = head.x === foodRef.current.x && head.y === foodRef.current.y;

    // 撞自己（不吃时尾巴会移开，排除尾巴）
    const body = eating ? snakeRef.current : snakeRef.current.slice(0, -1);
    if (body.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    snakeRef.current.unshift(head);

    if (eating) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setLength(snakeRef.current.length);
      spawnParticles(foodRef.current.x, foodRef.current.y, "#f5c518");
      foodRef.current = generateFood();
      const diff = DIFFICULTIES[difficultyRef.current];
      if (speedRef.current > diff.minSpeed) {
        speedRef.current = Math.max(diff.minSpeed, speedRef.current - diff.accel);
      }
    } else {
      snakeRef.current.pop();
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 清屏 + 网格
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(15, 52, 96, 0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILES; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID, 0);
      ctx.lineTo(i * GRID, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * GRID);
      ctx.lineTo(w, i * GRID);
      ctx.stroke();
    }

    // 屏幕震动
    ctx.save();
    if (shakeRef.current > 0.01) {
      const dx = (Math.random() - 0.5) * shakeRef.current * 2;
      const dy = (Math.random() - 0.5) * shakeRef.current * 2;
      ctx.translate(dx, dy);
      shakeRef.current *= 0.85;
    }

    // 发光食物
    const food = foodRef.current;
    const fx = food.x * GRID + GRID / 2;
    const fy = food.y * GRID + GRID / 2;
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;

    ctx.save();
    ctx.shadowColor = "#f5c518";
    ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = "#f5c518";
    ctx.beginPath();
    ctx.arc(fx, fy, (GRID / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 蛇身
    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const cx = seg.x * GRID + GRID / 2;
      const cy = seg.y * GRID + GRID / 2;
      const radius = GRID / 2 - 1.5;

      let color: string;
      if (i === 0) {
        color = "#00ff88";
      } else {
        const ratio = i / (snake.length - 1);
        const r = Math.floor(20 + ratio * 20);
        const g = Math.floor(180 - ratio * 80);
        const b = Math.floor(80 - ratio * 40);
        color = `rgb(${r},${g},${b})`;
      }

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 段间连接
      if (i < snake.length - 1) {
        const next = snake[i + 1];
        const nx = next.x * GRID + GRID / 2;
        const ny = next.y * GRID + GRID / 2;
        ctx.fillRect(
          Math.min(cx, nx) - radius,
          Math.min(cy, ny) - radius,
          Math.abs(cx - nx) + radius * 2,
          Math.abs(cy - ny) + radius * 2
        );
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 蛇头眼睛（跟随方向）
      if (i === 0) {
        const eyeOffset = 4;
        let ex1: number, ey1: number, ex2: number, ey2: number;
        const d = directionRef.current;
        if (d.x === 1) {
          ex1 = cx + 4; ey1 = cy - eyeOffset;
          ex2 = cx + 4; ey2 = cy + eyeOffset;
        } else if (d.x === -1) {
          ex1 = cx - 4; ey1 = cy - eyeOffset;
          ex2 = cx - 4; ey2 = cy + eyeOffset;
        } else if (d.y === -1) {
          ex1 = cx - eyeOffset; ey1 = cy - 4;
          ex2 = cx + eyeOffset; ey2 = cy - 4;
        } else {
          ex1 = cx - eyeOffset; ey1 = cy + 4;
          ex2 = cx + eyeOffset; ey2 = cy + 4;
        }
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex1, ey1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(ex1, ey1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawParticles(ctx);
    ctx.restore(); // 结束震动

    // 暂停遮罩
    if (phaseRef.current === "paused") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⏸ 暂停中", w / 2, h / 2);
      ctx.textAlign = "start";
    }

    // 倒计时
    if (phaseRef.current === "countdown") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = "#a0a0b0";
      ctx.font = "bold 26px 'Segoe UI', sans-serif";
      ctx.fillText("准备", w / 2, h / 2 - 34);
      ctx.fillStyle = "#e94560";
      ctx.shadowColor = "#e94560";
      ctx.shadowBlur = 22;
      ctx.font = "bold 100px 'Segoe UI', sans-serif";
      ctx.fillText(String(countdownRef.current), w / 2, h / 2 + 46);
      ctx.shadowBlur = 0;
      ctx.textAlign = "start";
    }
  };

  // 主循环（rAF 持续运行，负责计时 tick 与每帧绘制）
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (phaseRef.current === "playing") {
        accRef.current += dt;
        if (accRef.current >= speedRef.current) {
          accRef.current = 0;
          update();
        }
      }
      if (phaseRef.current === "over") {
        // 死亡粒子继续播放动画
        updateParticles();
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const startCountdown = () => {
    clearCountdown();
    countdownRef.current = 3;
    setPhaseAll("countdown");
    countdownTimerRef.current = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        clearCountdown();
        accRef.current = 0;
        setPhaseAll("playing");
      }
    }, 1000);
  };

  const startGame = (diffKey?: Difficulty) => {
    if (diffKey && DIFFICULTIES[diffKey]) {
      difficultyRef.current = diffKey;
      setDifficulty(diffKey);
    }
    const diff = DIFFICULTIES[difficultyRef.current];
    speedRef.current = diff.speed;

    clearCountdown();
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    particlesRef.current = [];
    shakeRef.current = 0;
    foodRef.current = generateFood();
    setScore(0);
    setLength(3);
    setIsNewHigh(false);
    startCountdown();
  };

  const changeDirection = (dir: string) => {
    if (phaseRef.current !== "playing") return;
    const dirMap: Record<string, Point> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const wanted = dirMap[dir];
    if (!wanted) return;
    // 禁止相对排队方向的反向
    const queued = nextDirectionRef.current;
    if (wanted.x === -queued.x && wanted.y === -queued.y) return;
    nextDirectionRef.current = wanted;
  };

  const togglePause = () => {
    const p = phaseRef.current;
    if (p === "playing") setPhaseAll("paused");
    else if (p === "paused") {
      accRef.current = 0;
      setPhaseAll("playing");
    }
  };

  const backToMenu = () => {
    clearCountdown();
    setPhaseAll("menu");
  };

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePause();
        return;
      }
      const keyMap: Record<string, string> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        KeyW: "up",
        KeyS: "down",
        KeyA: "left",
        KeyD: "right",
      };
      const dir = keyMap[e.code];
      if (dir) {
        e.preventDefault();
        changeDirection(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 滑动控制
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 24;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) changeDirection(dx > 0 ? "right" : "left");
    else changeDirection(dy > 0 ? "down" : "up");
  };

  // 首次挂载绘制一帧
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreItem = (label: string, value: string | number, colorCls: string) => (
    <div className="rounded-xl border-2 border-[#0f3460] bg-[#16213e] px-4 py-2 sm:px-6">
      <div className="text-[11px] uppercase tracking-[2px] text-[#a0a0b0]">{label}</div>
      <div className={`text-xl font-bold tabular-nums sm:text-2xl ${colorCls}`}>{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#1a1a2e] p-5 pb-6 select-none sm:p-8">
      {/* 计分板 */}
      <div className="flex items-center justify-center gap-3 sm:gap-8">
        {scoreItem("得分", score, "text-[#e94560]")}
        {scoreItem("最高分", best, "text-[#f5c518]")}
        {scoreItem("长度", length, "text-[#e94560]")}
      </div>

      {/* 游戏画布 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID * TILES}
          height={GRID * TILES}
          className="h-auto w-[min(92vw,340px)] touch-none rounded-lg border-[3px] border-[#0f3460] shadow-[0_0_40px_rgba(233,69,96,0.2),0_0_80px_rgba(15,52,96,0.3)] sm:w-[400px]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />

        {/* 开始菜单遮罩 */}
        {phase === "menu" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/75">
            <div className="mx-3 flex flex-col items-center rounded-2xl border-2 border-[#0f3460] bg-[#16213e] px-6 py-7 text-center shadow-[0_0_60px_rgba(233,69,96,0.25)] sm:px-8">
              <h2 className="mb-1 text-2xl font-bold text-[#e94560] [text-shadow:0_0_20px_rgba(233,69,96,0.5)] sm:text-3xl">🐍 贪吃蛇</h2>
              <p className="mb-4 text-sm text-[#a0a0b0]">选择难度开始游戏</p>
              <div className="mb-4 flex gap-2.5">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => {
                  const d = DIFFICULTIES[k];
                  const active = difficulty === k;
                  const borderCls = k === "easy" ? "border-[#00b894] text-[#00b894]" : k === "medium" ? "border-[#f5c518] text-[#f5c518]" : "border-[#e94560] text-[#e94560]";
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => startGame(k)}
                      className={`flex min-w-[76px] flex-col items-center gap-0.5 rounded-xl border-2 px-2.5 py-3 font-bold transition-all sm:min-w-[88px] ${
                        active ? `${borderCls} bg-white/5` : "border-[#2a3a5e] text-[#a0a0b0] hover:border-[#0f3460]"
                      }`}
                    >
                      {d.label}
                      <span className="text-[11px] font-normal tracking-[2px] opacity-75">{d.rank}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm font-bold text-[#f5c518]">最高分: {best}</p>
            </div>
          </div>
        )}

        {/* 游戏结束遮罩 */}
        {phase === "over" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/70">
            <div className="mx-3 flex flex-col items-center rounded-2xl border-2 border-[#e94560] bg-[#16213e] px-6 py-6 text-center shadow-[0_0_50px_rgba(233,69,96,0.3)] sm:px-10">
              <h2 className="mb-3 text-2xl font-bold text-[#e94560]">游戏结束！</h2>
              <p className="mb-1 text-base text-[#a0a0b0]">
                最终得分: <strong className="text-[#e94560]">{score}</strong>
              </p>
              {isNewHigh && <p className="mb-1 font-bold text-[#f5c518]">🏆 新纪录！</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                <button
                  onClick={() => startGame()}
                  className="rounded-full bg-[#e94560] px-5 py-2.5 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#c73652]"
                >
                  再来一局 🎮
                </button>
                <button
                  onClick={backToMenu}
                  className="rounded-full border-2 border-[#0f3460] bg-[#16213e] px-5 py-2.5 font-bold text-white transition hover:bg-[#0f3460]"
                >
                  返回菜单 🏠
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          onClick={togglePause}
          className={`rounded-full px-6 py-2.5 font-bold text-white transition-all ${phase === "paused" ? "bg-[#f5c518] text-[#1a1a2e] hover:bg-[#e0b010]" : "bg-[#e94560] hover:-translate-y-0.5 hover:bg-[#c73652]"}`}
        >
          {phase === "paused" ? "继续 ▶" : "暂停 ⏸"}
        </button>
        <button
          onClick={() => startGame()}
          className="rounded-full bg-[#e94560] px-6 py-2.5 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#c73652]"
        >
          重新开始 🔄
        </button>
        <button
          onClick={backToMenu}
          className="rounded-full border-2 border-[#0f3460] bg-[#16213e] px-6 py-2.5 font-bold text-white transition hover:bg-[#0f3460]"
        >
          返回菜单 🏠
        </button>
      </div>

      <p className="hidden text-xs text-[#a0a0b0] sm:block">方向键 / WASD 控制移动 · 空格键暂停</p>
      <p className="text-xs text-[#a0a0b0] sm:hidden">滑动屏幕或点击方向键控制移动 · 中间键暂停</p>

      {/* 移动端十字键 */}
      <div className="mt-1 grid grid-cols-3 grid-rows-3 gap-1.5 sm:hidden">
        <button
          type="button"
          className="col-start-2 row-start-1 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#0f3460] bg-[#16213e] text-xl text-white transition active:scale-90 active:border-[#e94560] active:bg-[#e94560]"
          onPointerDown={(e) => {
            e.preventDefault();
            changeDirection("up");
          }}
        >
          ▲
        </button>
        <button
          type="button"
          className="col-start-1 row-start-2 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#0f3460] bg-[#16213e] text-xl text-white transition active:scale-90 active:border-[#e94560] active:bg-[#e94560]"
          onPointerDown={(e) => {
            e.preventDefault();
            changeDirection("left");
          }}
        >
          ◀
        </button>
        <button
          type="button"
          className="col-start-2 row-start-2 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#0f3460] bg-[#16213e] text-sm text-[#a0a0b0] transition active:scale-90"
          onPointerDown={(e) => {
            e.preventDefault();
            togglePause();
          }}
        >
          {phase === "paused" ? "▶" : "⏸"}
        </button>
        <button
          type="button"
          className="col-start-3 row-start-2 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#0f3460] bg-[#16213e] text-xl text-white transition active:scale-90 active:border-[#e94560] active:bg-[#e94560]"
          onPointerDown={(e) => {
            e.preventDefault();
            changeDirection("right");
          }}
        >
          ▶
        </button>
        <button
          type="button"
          className="col-start-2 row-start-3 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#0f3460] bg-[#16213e] text-xl text-white transition active:scale-90 active:border-[#e94560] active:bg-[#e94560]"
          onPointerDown={(e) => {
            e.preventDefault();
            changeDirection("down");
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
