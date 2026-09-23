"use client";

import { useCallback, useEffect, useState } from "react";
import { saveBestScore } from "@/lib/games";
import { useFitCellSize } from "./useFitCellSize";

type Difficulty = "easy" | "medium" | "hard";

const CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 24 },
  hard: { rows: 14, cols: 16, mines: 40 },
};

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

const NUM_COLORS = ["", "text-blue-500", "text-emerald-500", "text-red-500", "text-indigo-500", "text-amber-600", "text-teal-500", "text-pink-500", "text-zinc-600"];

export default function MinesweeperGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cells, setCells] = useState<Cell[][]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [minesLeft, setMinesLeft] = useState(CONFIG.easy.mines);
  const [time, setTime] = useState(0);
  const [best, setBest] = useState(0);
  const [flagMode, setFlagMode] = useState(false);

  const { rows, cols, mines } = CONFIG[difficulty];

  const newGame = useCallback((diff: Difficulty) => {
    const cfg = CONFIG[diff];
    const board: Cell[][] = Array.from({ length: cfg.rows }, () =>
      Array.from({ length: cfg.cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    // 布雷
    let placed = 0;
    while (placed < cfg.mines) {
      const r = Math.floor(Math.random() * cfg.rows);
      const c = Math.floor(Math.random() * cfg.cols);
      if (!board[r][c].mine) {
        board[r][c].mine = true;
        placed++;
      }
    }
    // 计算邻雷数
    for (let r = 0; r < cfg.rows; r++)
      for (let c = 0; c < cfg.cols; c++) {
        if (board[r][c].mine) continue;
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && board[nr][nc].mine) n++;
          }
        board[r][c].adjacent = n;
      }
    setCells(board);
    setStatus("playing");
    setMinesLeft(cfg.mines);
    setTime(0);
  }, []);

  useEffect(() => {
    newGame(difficulty);
  }, [difficulty, newGame]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const prev = Number(localStorage.getItem("gamehub:best:minesweeper") ?? 0);
    setBest(prev);
  }, []);

  // 纯计算：翻开格子，返回新棋盘和是否胜利
  const reveal = useCallback(
    (r: number, c: number, board: Cell[][]) => {
      const cfg = CONFIG[difficulty];
      const queue: [number, number][] = [[r, c]];
      const nb = board.map((row) => row.map((cell) => ({ ...cell })));
      while (queue.length) {
        const [cr, cc] = queue.pop()!;
        const cell = nb[cr][cc];
        if (cell.revealed || cell.flagged || cell.mine) continue;
        cell.revealed = true;
        if (cell.adjacent === 0) {
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const nr = cr + dr;
              const nc = cc + dc;
              if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols) queue.push([nr, nc]);
            }
        }
      }
      const totalSafe = cfg.rows * cfg.cols - cfg.mines;
      const revealedCount = nb.flat().filter((x) => x.revealed).length;
      return { board: nb, won: revealedCount === totalSafe };
    },
    [difficulty]
  );

  const toggleFlag = (r: number, c: number) => {
    if (status !== "playing") return;
    const cell = cells[r][c];
    if (cell.revealed) return;
    setCells((prev) => {
      const nb = prev.map((row) => row.map((x) => ({ ...x })));
      nb[r][c].flagged = !nb[r][c].flagged;
      return nb;
    });
    setMinesLeft((m) => m + (cell.flagged ? 1 : -1));
  };

  const onLeftClick = (r: number, c: number) => {
    if (status !== "playing") return;
    if (flagMode) {
      toggleFlag(r, c);
      return;
    }
    const cell = cells[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      // 踩雷
      setCells((prev) =>
        prev.map((row) => row.map((x) => (x.mine ? { ...x, revealed: true } : x)))
      );
      setStatus("lost");
      return;
    }
    const { board: nb, won } = reveal(r, c, cells);
    setCells(nb);
    if (won) {
      setStatus("won");
      const prev = Number(localStorage.getItem("gamehub:best:minesweeper") ?? 0);
      if (prev === 0 || time < prev) {
        localStorage.setItem("gamehub:best:minesweeper", String(time));
        setBest(time);
      }
      saveBestScore("minesweeper", 1);
    }
  };

  const onRightClick = (r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    toggleFlag(r, c);
  };

  const cellSize = useFitCellSize(cols, 34, 14);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
        <span className="rounded-full bg-red-500/15 px-4 py-1.5 text-red-600 dark:text-red-400">💣 {Math.max(minesLeft, 0)}</span>
        <span className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">⏱ {time}s</span>
        <span className="rounded-full bg-zinc-500/15 px-4 py-1.5 text-zinc-600 dark:text-zinc-400">最佳 {best || "—"}s</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {(Object.keys(CONFIG) as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              difficulty === d
                ? "bg-slate-600 text-white"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {d === "easy" ? "初级" : d === "medium" ? "中级" : "高级"}
          </button>
        ))}
        <button
          onClick={() => setFlagMode((v) => !v)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            flagMode
              ? "bg-amber-500 text-white"
              : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {flagMode ? "🚩 标记中" : "⛏️ 翻开"}
        </button>
      </div>

      <div className="relative max-w-full">
        <div className="max-w-full overflow-x-auto">
          <div
            className={`grid gap-[2px] rounded-xl border-2 bg-slate-300 p-2 shadow-lg transition-colors dark:bg-slate-700 ${
              flagMode ? "border-amber-500" : "border-slate-500/30"
            }`}
            style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
          >
          {cells.flatMap((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => onLeftClick(r, c)}
                onContextMenu={(e) => onRightClick(r, c, e)}
                className={`flex items-center justify-center rounded font-bold transition-colors ${
                  cell.revealed
                    ? cell.mine
                      ? "bg-red-500"
                      : "bg-zinc-100 dark:bg-zinc-800"
                    : "bg-slate-400 hover:bg-slate-300 active:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500"
                }`}
                style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.62 }}
              >
                {cell.revealed ? (
                  cell.mine ? (
                    "💥"
                  ) : cell.adjacent > 0 ? (
                    <span className={NUM_COLORS[cell.adjacent]}>{cell.adjacent}</span>
                  ) : (
                    ""
                  )
                ) : cell.flagged ? (
                  "🚩"
                ) : (
                  ""
                )}
              </button>
            ))
          )}
          </div>
        </div>

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/80 backdrop-blur-sm">
            <p className="text-2xl font-bold text-white">
              {status === "won" ? `🎉 扫雷成功！用时 ${time}s` : "💥 踩到地雷了！"}
            </p>
            <button onClick={() => newGame(difficulty)} className="rounded-full bg-slate-500 px-6 py-2.5 font-bold text-white transition hover:bg-slate-400">
              再来一局
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500">点击翻开 · 右键或开启 🚩 标记模式插旗</p>
    </div>
  );
}
