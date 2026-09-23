"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveBestScore } from "@/lib/games";
import { useFitCellSize } from "./useFitCellSize";

// 图例: # 墙, . 空地, $ 箱子, @ 玩家, * 箱子在目标, + 玩家在目标, O 目标
const LEVELS: string[][] = [
  [
    "########",
    "#..O...#",
    "#..$...#",
    "#..@...#",
    "#..O...#",
    "#......#",
    "########",
  ],
  [
    "#########",
    "#...O...#",
    "#..$$$..#",
    "#.O...O.#",
    "#..@....#",
    "#########",
  ],
  [
    "##########",
    "#....O...#",
    "#..$.#$..#",
    "#.##.$...#",
    "#..#...O.#",
    "#...@....#",
    "#...O....#",
    "##########",
  ],
  [
    "#########",
    "#.......#",
    "#.$O$O$.#",
    "#..$@$..#",
    "#.$O$O$.#",
    "#.......#",
    "#########",
  ],
];

type Pos = { r: number; c: number };

function parseLevel(level: string[]) {
  const grid: string[][] = level.map((row) => row.split(""));
  let player: Pos = { r: 0, c: 0 };
  const boxes: Pos[] = [];
  const goals: Pos[] = [];
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === "@" || cell === "+") {
        player = { r, c };
        grid[r][c] = cell === "+" ? "O" : ".";
      }
      if (cell === "$" || cell === "*") {
        boxes.push({ r, c });
        grid[r][c] = cell === "*" ? "O" : ".";
      }
      if (cell === "O" || cell === "*" || cell === "+") goals.push({ r, c });
    })
  );
  return { grid, player, boxes, goals };
}

export default function SokobanGame() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [grid, setGrid] = useState<string[][]>([]);
  const [player, setPlayer] = useState<Pos>({ r: 0, c: 0 });
  const [boxes, setBoxes] = useState<Pos[]>([]);
  const [goals, setGoals] = useState<Pos[]>([]);
  const [steps, setSteps] = useState(0);
  const [history, setHistory] = useState<{ player: Pos; boxes: Pos[] }[]>([]);
  const [bestSteps, setBestSteps] = useState(0);
  const [won, setWon] = useState(false);

  const reset = useCallback((idx: number) => {
    const parsed = parseLevel(LEVELS[idx]);
    setGrid(parsed.grid);
    setPlayer(parsed.player);
    setBoxes(parsed.boxes);
    setGoals(parsed.goals);
    setSteps(0);
    setHistory([]);
    setWon(false);
  }, []);

  useEffect(() => {
    reset(levelIdx);
  }, [levelIdx, reset]);

  useEffect(() => {
    setBestSteps(Number(localStorage.getItem("gamehub:best:sokoban") ?? 0));
  }, []);

  const checkWin = useCallback(
    (bs: Pos[]) => bs.every((b) => goals.some((g) => g.r === b.r && g.c === b.c)),
    [goals]
  );

  const move = useCallback(
    (dr: number, dc: number) => {
      if (won) return;
      const nr = player.r + dr;
      const nc = player.c + dc;
      const cell = grid[nr]?.[nc];
      if (!cell || cell === "#") return;

      const boxIdx = boxes.findIndex((b) => b.r === nr && b.c === nc);
      let newBoxes = boxes;
      if (boxIdx >= 0) {
        const br = nr + dr;
        const bc = nc + dc;
        const beyond = grid[br]?.[bc];
        if (!beyond || beyond === "#") return;
        if (boxes.some((b) => b.r === br && b.c === bc)) return;
        newBoxes = boxes.map((b, i) => (i === boxIdx ? { r: br, c: bc } : b));
      }

      setHistory((h) => [...h.slice(-99), { player, boxes }]);
      setPlayer({ r: nr, c: nc });
      setBoxes(newBoxes);
      setSteps((s) => s + 1);

      if (boxIdx >= 0 && checkWin(newBoxes)) {
        setWon(true);
        const total = steps + 1;
        const prev = Number(localStorage.getItem("gamehub:best:sokoban") ?? 0);
        if (prev === 0 || total < prev) {
          localStorage.setItem("gamehub:best:sokoban", String(total));
          setBestSteps(total);
        }
        saveBestScore("sokoban", levelIdx + 1);
      }
    },
    [player, boxes, grid, won, checkWin, steps, levelIdx]
  );

  const undo = useCallback(() => {
    if (history.length === 0 || won) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPlayer(last.player);
    setBoxes(last.boxes);
    setSteps((s) => Math.max(0, s - 1));
  }, [history, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        arrowup: [-1, 0],
        arrowdown: [1, 0],
        arrowleft: [0, -1],
        arrowright: [0, 1],
        w: [-1, 0],
        s: [1, 0],
        a: [0, -1],
        d: [0, 1],
      };
      const k = e.key.toLowerCase();
      if (map[k]) {
        e.preventDefault();
        move(...map[k]);
      } else if (k === "u") undo();
      else if (k === "r") reset(levelIdx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, undo, reset, levelIdx]);

  const cellSize = useFitCellSize(grid[0]?.length ?? 8, 44, 20, 76);

  // 移动端滑动控制
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
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else move(dy > 0 ? 1 : -1, 0);
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
        <span className="rounded-full bg-amber-500/15 px-4 py-1.5 text-amber-600 dark:text-amber-400">第 {levelIdx + 1} / {LEVELS.length} 关</span>
        <span className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">步数 {steps}</span>
        <span className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">最佳 {bestSteps || "—"}</span>
      </div>

      <div className="relative max-w-full">
        <div className="max-w-full overflow-x-auto">
          <div
            className="grid gap-0 overflow-hidden rounded-xl border-2 border-amber-500/30 bg-slate-900 p-1 shadow-lg touch-none"
            style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 8}, ${cellSize}px)` }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
          {grid.flatMap((row, r) =>
            row.map((cell, c) => {
              const hasBox = boxes.some((b) => b.r === r && b.c === c);
              const isGoal = goals.some((g) => g.r === r && g.c === c);
              const isPlayer = player.r === r && player.c === c;
              let content: string | null = null;
              let cls = "bg-slate-800";
              if (cell === "#") {
                content = "🧱";
                cls = "bg-slate-700";
              } else if (cell === "O" || isGoal) {
                cls = "bg-emerald-900/60";
                content = isPlayer || hasBox ? null : "✨";
              }
              if (hasBox) content = "📦";
              if (isPlayer) content = "🙂";
              if (isPlayer && isGoal) content = "😎";
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex items-center justify-center ${cls}`}
                  style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.62 }}
                >
                  {content}
                </div>
              );
            })
          )}
          </div>
        </div>

        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/80 backdrop-blur-sm">
            <p className="text-2xl font-bold text-white">🎉 通关！共 {steps} 步</p>
            <button
              onClick={() => (levelIdx < LEVELS.length - 1 ? setLevelIdx(levelIdx + 1) : setLevelIdx(0))}
              className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-white transition hover:bg-amber-400"
            >
              {levelIdx < LEVELS.length - 1 ? "下一关 →" : "重新开始"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={undo} disabled={history.length === 0 || won} className="rounded-full bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300">
          ↩ 撤销 (U)
        </button>
        <button onClick={() => reset(levelIdx)} className="rounded-full bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300">
          🔄 重开 (R)
        </button>
        <button onClick={() => setLevelIdx((levelIdx + 1) % LEVELS.length)} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-400">
          选关
        </button>
      </div>

      {/* 移动端十字方向键 */}
      <div className="mt-1 grid grid-cols-3 grid-rows-3 gap-1.5 sm:hidden">
        <button
          type="button"
          aria-label="上移"
          className="col-start-2 row-start-1 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-amber-500/30 bg-slate-100 text-xl text-slate-700 transition active:scale-90 active:border-amber-500 active:bg-amber-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
          onClick={() => move(-1, 0)}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="左移"
          className="col-start-1 row-start-2 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-amber-500/30 bg-slate-100 text-xl text-slate-700 transition active:scale-90 active:border-amber-500 active:bg-amber-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
          onClick={() => move(0, -1)}
        >
          ◀
        </button>
        <button
          type="button"
          aria-label="右移"
          className="col-start-3 row-start-2 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-amber-500/30 bg-slate-100 text-xl text-slate-700 transition active:scale-90 active:border-amber-500 active:bg-amber-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
          onClick={() => move(0, 1)}
        >
          ▶
        </button>
        <button
          type="button"
          aria-label="下移"
          className="col-start-2 row-start-3 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-amber-500/30 bg-slate-100 text-xl text-slate-700 transition active:scale-90 active:border-amber-500 active:bg-amber-500 active:text-white dark:bg-zinc-800 dark:text-zinc-200"
          onClick={() => move(1, 0)}
        >
          ▼
        </button>
      </div>

      <p className="text-xs text-zinc-500 sm:hidden">滑动屏幕或使用方向键移动</p>
    </div>
  );
}
