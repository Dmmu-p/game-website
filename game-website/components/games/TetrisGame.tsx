"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveBestScore } from "@/lib/games";

const COLS = 10;
const ROWS = 20;
const CELL = 26;

type Matrix = (number | string)[][];

const SHAPES: { matrix: Matrix; color: string }[] = [
  { matrix: [[1, 1, 1, 1]], color: "#22d3ee" }, // I
  { matrix: [[1, 1], [1, 1]], color: "#facc15" }, // O
  { matrix: [[0, 1, 0], [1, 1, 1]], color: "#a78bfa" }, // T
  { matrix: [[0, 0, 1], [1, 1, 1]], color: "#f97316" }, // J 改为 L 形
  { matrix: [[1, 0, 0], [1, 1, 1]], color: "#3b82f6" }, // L 改为 J 形
  { matrix: [[0, 1, 1], [1, 1, 0]], color: "#4ade80" }, // S
  { matrix: [[1, 1, 0], [0, 1, 1]], color: "#f87171" }, // Z
];

function rotate(m: Matrix): Matrix {
  return m[0].map((_, c) => m.map((row) => row[c]).reverse());
}

function emptyBoard(): Matrix {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lines, setLines] = useState(0);
  const [nextShape, setNextShape] = useState<(typeof SHAPES)[number] | null>(null);
  const [status, setStatus] = useState<"ready" | "playing" | "paused" | "over">("ready");

  const boardRef = useRef<Matrix>(emptyBoard());
  const pieceRef = useRef<{ matrix: Matrix; color: string; x: number; y: number } | null>(null);
  const nextRef = useRef<{ matrix: Matrix; color: string } | null>(null);
  const statusRef = useRef(status);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem("gamehub:scores") ? JSON.parse(localStorage.getItem("gamehub:scores")!)["tetris"] ?? 0 : 0));
  }, []);

  const randomShape = () => SHAPES[Math.floor(Math.random() * SHAPES.length)];

  const spawn = useCallback((): boolean => {
    const shape = nextRef.current ?? randomShape();
    nextRef.current = randomShape();
    setNextShape(nextRef.current);
    const piece = { matrix: shape.matrix, color: shape.color, x: Math.floor((COLS - shape.matrix[0].length) / 2), y: 0 };
    // 碰撞检测
    const collide = piece.matrix.some((row, r) =>
      row.some((v, c) => v && (boardRef.current[piece.y + r]?.[piece.x + c] ?? 1) !== 0)
    );
    if (collide) return false;
    pieceRef.current = piece;
    return true;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    boardRef.current.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) {
          ctx.fillStyle = typeof v === "string" ? v : "#475569";
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        }
      })
    );

    const piece = pieceRef.current;
    if (piece) {
      ctx.fillStyle = piece.color;
      piece.matrix.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v) ctx.fillRect((piece.x + c) * CELL + 1, (piece.y + r) * CELL + 1, CELL - 2, CELL - 2);
        })
      );
    }
  }, []);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    piece.matrix.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) boardRef.current[piece.y + r][piece.x + c] = piece.color;
      })
    );
    // 消除满行
    let cleared = 0;
    boardRef.current = boardRef.current.filter((row) => {
      const full = row.every((v) => v !== 0);
      if (full) cleared++;
      return !full;
    });
    while (boardRef.current.length < ROWS) boardRef.current.unshift(Array(COLS).fill(0));

    if (cleared > 0) {
      const gained = [0, 100, 300, 500, 800][cleared] ?? 800;
      scoreRef.current += gained;
      linesRef.current += cleared;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setBest(saveBestScore("tetris", scoreRef.current));
    }
  }, []);

  const gameOver = useCallback(() => {
    statusRef.current = "over";
    setStatus("over");
    setBest(saveBestScore("tetris", scoreRef.current));
    draw();
  }, [draw]);

  const start = useCallback(() => {
    boardRef.current = emptyBoard();
    scoreRef.current = 0;
    linesRef.current = 0;
    pieceRef.current = null;
    nextRef.current = randomShape();
    setScore(0);
    setLines(0);
    const ok = spawn();
    if (!ok) gameOver();
    else {
      statusRef.current = "playing";
      setStatus("playing");
    }
    draw();
  }, [spawn, gameOver, draw]);

  const collide = (matrix: Matrix, x: number, y: number) =>
    matrix.some((row, r) => row.some((v, c) => v && (y + r >= ROWS || x + c < 0 || x + c >= COLS || (y + r >= 0 && boardRef.current[y + r][x + c] !== 0))));

  const stepDown = useCallback(() => {
    if (statusRef.current !== "playing" || !pieceRef.current) return;
    const piece = pieceRef.current;
    if (!collide(piece.matrix, piece.x, piece.y + 1)) {
      pieceRef.current = { ...piece, y: piece.y + 1 };
    } else {
      lockPiece();
      if (!spawn()) gameOver();
    }
    draw();
  }, [lockPiece, spawn, gameOver, draw]);

  const moveX = useCallback(
    (dx: number) => {
      if (statusRef.current !== "playing" || !pieceRef.current) return;
      const piece = pieceRef.current;
      if (!collide(piece.matrix, piece.x + dx, piece.y)) pieceRef.current = { ...piece, x: piece.x + dx };
      draw();
    },
    [draw]
  );

  const rotatePiece = useCallback(() => {
    if (statusRef.current !== "playing" || !pieceRef.current) return;
    const piece = pieceRef.current;
    const rotated = rotate(piece.matrix);
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]] as const) {
      if (!collide(rotated, piece.x + dx, piece.y + dy)) {
        pieceRef.current = { ...piece, matrix: rotated, x: piece.x + dx, y: piece.y + dy };
        break;
      }
    }
    draw();
  }, [draw]);

  const hardDrop = useCallback(() => {
    if (statusRef.current !== "playing" || !pieceRef.current) return;
    const piece = pieceRef.current;
    let dy = 0;
    while (!collide(piece.matrix, piece.x, piece.y + dy + 1)) dy++;
    pieceRef.current = { ...piece, y: piece.y + dy };
    lockPiece();
    if (!spawn()) gameOver();
    draw();
  }, [lockPiece, spawn, gameOver, draw]);

  const togglePause = useCallback(() => {
    if (statusRef.current === "playing") {
      statusRef.current = "paused";
      setStatus("paused");
    } else if (statusRef.current === "paused") {
      statusRef.current = "playing";
      setStatus("playing");
    }
    draw();
  }, [draw]);

  // 游戏循环
  useEffect(() => {
    let alive = true;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      if (!alive) return;
      const speed = Math.max(90, 600 - linesRef.current * 30);
      acc += now - last;
      last = now;
      if (statusRef.current === "playing" && acc >= speed) {
        acc = 0;
        stepDown();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => {
      alive = false;
    };
  }, [stepDown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
      if (statusRef.current === "ready" || statusRef.current === "over") {
        if (k === " " || k === "Enter") start();
        return;
      }
      if (k === "p" || k === "P") {
        togglePause();
        return;
      }
      if (statusRef.current !== "playing") return;
      switch (k) {
        case "ArrowLeft":
        case "a":
        case "A":
          moveX(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          moveX(1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          stepDown();
          break;
        case "ArrowUp":
        case "w":
        case "W":
          rotatePiece();
          break;
        case " ":
          hardDrop();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, moveX, stepDown, rotatePiece, hardDrop, togglePause, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* 移动端计分栏 */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold sm:hidden">
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-600 dark:text-sky-400">得分 {score}</span>
        <span className="rounded-full bg-zinc-500/15 px-3 py-1 text-zinc-600 dark:text-zinc-400">最高 {best}</span>
        <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-indigo-600 dark:text-indigo-400">行数 {lines}</span>
      </div>

      <div className="flex items-start justify-center gap-4">
        <div className="relative">
          <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-2xl border border-sky-500/20 shadow-lg" />
          {status !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/75 backdrop-blur-sm">
              <p className="text-xl font-bold text-white">
                {status === "ready" && "🧱 准备好了吗？"}
                {status === "paused" && "⏸️ 已暂停"}
                {status === "over" && `💀 游戏结束，得分 ${score}`}
              </p>
              <button onClick={start} className="rounded-full bg-sky-500 px-6 py-2.5 font-bold text-white transition hover:bg-sky-400">
                {status === "over" ? "再来一局" : status === "paused" ? "继续" : "开始游戏"}
              </button>
              <p className="px-4 text-center text-xs text-zinc-400">← → 移动 · ↑ 旋转 · 空格落底 · P 暂停</p>
            </div>
          )}
        </div>

        <div className="hidden flex-col gap-3 sm:flex">
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-zinc-800/60">
            <p className="mb-2 text-xs font-bold text-zinc-500">下一个</p>
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-200 dark:bg-zinc-900">
              {nextShape && (
                <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${nextShape.matrix[0].length}, 16px)` }}>
                  {nextShape.matrix.flatMap((row, r) =>
                    row.map((v, c) => (
                      <div key={`${r}-${c}`} style={{ width: 16, height: 16, background: v ? nextShape.color : "transparent", borderRadius: 3 }} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm font-semibold">
            <p className="rounded-full bg-sky-500/15 px-4 py-1.5 text-sky-600 dark:text-sky-400">得分 {score}</p>
            <p className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">最高 {best}</p>
            <p className="rounded-full bg-indigo-500/15 px-4 py-1.5 text-indigo-600 dark:text-indigo-400">行数 {lines}</p>
          </div>
        </div>
      </div>

      {/* 移动端触控按钮 */}
      <div className="flex flex-col items-center gap-2 sm:hidden">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="左移"
            className="flex h-14 w-16 items-center justify-center rounded-xl border-2 border-sky-500/30 bg-slate-100 text-2xl text-slate-700 transition active:scale-90 active:bg-sky-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); moveX(-1); }}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="下移"
            className="flex h-14 w-16 items-center justify-center rounded-xl border-2 border-sky-500/30 bg-slate-100 text-2xl text-slate-700 transition active:scale-90 active:bg-sky-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); stepDown(); }}
          >
            ▼
          </button>
          <button
            type="button"
            aria-label="右移"
            className="flex h-14 w-16 items-center justify-center rounded-xl border-2 border-sky-500/30 bg-slate-100 text-2xl text-slate-700 transition active:scale-90 active:bg-sky-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); moveX(1); }}
          >
            ▶
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="flex h-14 items-center justify-center rounded-xl border-2 border-indigo-500/30 bg-slate-100 px-5 text-base font-bold text-slate-700 transition active:scale-90 active:bg-indigo-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); rotatePiece(); }}
          >
            ⟳ 旋转
          </button>
          <button
            type="button"
            className="flex h-14 items-center justify-center rounded-xl border-2 border-sky-500/30 bg-slate-100 px-5 text-base font-bold text-slate-700 transition active:scale-90 active:bg-sky-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); hardDrop(); }}
          >
            ⤓ 落底
          </button>
          <button
            type="button"
            className="flex h-14 items-center justify-center rounded-xl border-2 border-amber-500/30 bg-slate-100 px-5 text-base font-bold text-slate-700 transition active:scale-90 active:bg-amber-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
            onPointerDown={(e) => { e.preventDefault(); togglePause(); }}
          >
            {status === "paused" ? "▶ 继续" : "⏸ 暂停"}
          </button>
        </div>
      </div>
    </div>
  );
}
