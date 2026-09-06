"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveBestScore } from "@/lib/games";

type Board = number[][];

const SIZE = 4;

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((v, c) => v === 0 && empty.push([r, c])));
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const nb = board.map((row) => [...row]);
  nb[r][c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const values = row.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < values.length && values[i] === values[i + 1]) {
      const v = values[i] * 2;
      merged.push(v);
      gained += v;
      i++;
    } else {
      merged.push(values[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gained };
}

function moveBoard(board: Board, dir: "up" | "down" | "left" | "right"): { board: Board; gained: number; moved: boolean } {
  let nb = board.map((row) => [...row]);
  let gained = 0;

  const transpose = (b: Board) => b[0].map((_, c) => b.map((row) => row[c]));
  const reverseRows = (b: Board) => b.map((row) => [...row].reverse());

  if (dir === "up" || dir === "down") nb = transpose(nb);
  if (dir === "up" || dir === "right") nb = reverseRows(nb);

  nb = nb.map((row) => {
    const res = slideRow(row);
    gained += res.gained;
    return res.row;
  });

  if (dir === "up" || dir === "right") nb = reverseRows(nb);
  if (dir === "up" || dir === "down") nb = transpose(nb);

  const moved = JSON.stringify(nb) !== JSON.stringify(board);
  return { board: nb, gained, moved };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  2: "bg-zinc-200 text-zinc-800",
  4: "bg-amber-200 text-zinc-800",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-red-400 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-amber-500 text-white",
  1024: "bg-pink-500 text-white",
  2048: "bg-fuchsia-500 text-white",
};

export default function Game2048() {
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "over">("playing");
  const [wonDismissed, setWonDismissed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const boardRef = useRef(board);
  const scoreRef = useRef(0);
  const statusRef = useRef(status);
  const wonRef = useRef(false);

  useEffect(() => {
    setBest(Number(localStorage.getItem("gamehub:scores") ? JSON.parse(localStorage.getItem("gamehub:scores")!)["2048"] ?? 0 : 0));
    // 首次挂载后随机生成两个初始方块（避免 SSR 水合不一致）
    const b = addRandom(addRandom(emptyBoard()));
    boardRef.current = b;
    setBoard(b);
  }, []);

  const doMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (statusRef.current === "over") return;
    const { board: nb, gained, moved } = moveBoard(boardRef.current, dir);
    if (!moved) return;

    const newScore = scoreRef.current + gained;
    scoreRef.current = newScore;
    setScore(newScore);
    setBest(saveBestScore("2048", newScore));

    const withTile = addRandom(nb);
    boardRef.current = withTile;
    setBoard(withTile);

    if (withTile.some((row) => row.includes(2048)) && !wonRef.current) {
      setStatus("won");
      statusRef.current = "won";
    } else if (!canMove(withTile)) {
      setStatus("over");
      statusRef.current = "over";
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
  };

  const restart = () => {
    const b = addRandom(addRandom(emptyBoard()));
    boardRef.current = b;
    setBoard(b);
    scoreRef.current = 0;
    setScore(0);
    statusRef.current = "playing";
    setStatus("playing");
    wonRef.current = false;
    setWonDismissed(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[380px] items-center justify-between text-sm font-semibold">
        <span className="rounded-full bg-yellow-500/15 px-4 py-1.5 text-yellow-600 dark:text-yellow-400">得分 {score}</span>
        <span className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">最高 {best}</span>
      </div>

      <div
        className="relative touch-none rounded-2xl bg-zinc-300/80 p-3 shadow-lg dark:bg-zinc-700/60"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid grid-cols-4 gap-3">
          {board.flatMap((row, r) =>
            row.map((v, c) => (
              <div
                key={`${r}-${c}`}
                className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-extrabold transition-all duration-150 sm:h-20 sm:w-20 ${
                  TILE_COLORS[v] ?? "bg-zinc-500 text-white"
                }`}
                style={v > 2048 ? { fontSize: "1.1rem" } : undefined}
              >
                {v || ""}
              </div>
            ))
          )}
        </div>

        {(status === "won" || status === "over") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-950/75 backdrop-blur-sm">
            <p className="text-2xl font-bold text-white">{status === "won" ? "🎉 你合成 2048 了！" : "😵 没有可移动的格子了"}</p>
            {status === "won" && (
              <button
                onClick={() => {
                  setWonDismissed(true);
                  wonRef.current = true;
                  statusRef.current = "playing";
                  setStatus("playing");
                }}
                className="rounded-full bg-zinc-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-500"
              >
                继续挑战
              </button>
            )}
            <button onClick={restart} className="rounded-full bg-yellow-500 px-6 py-2.5 font-bold text-white transition hover:bg-yellow-400">
              再来一局
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={restart} className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-yellow-400">
          🔄 重新开始
        </button>
      </div>
      <p className="text-xs text-zinc-500">手机上滑动屏幕即可操作</p>
    </div>
  );
}
