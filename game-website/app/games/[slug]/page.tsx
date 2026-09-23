import type { Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUILTIN_GAMES, getGameBySlug } from "@/lib/games";
import SnakeGame from "@/components/games/SnakeGame";
import SokobanGame from "@/components/games/SokobanGame";
import Game2048 from "@/components/games/Game2048";
import MinesweeperGame from "@/components/games/MinesweeperGame";
import TetrisGame from "@/components/games/TetrisGame";

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  snake: SnakeGame,
  sokoban: SokobanGame,
  "2048": Game2048,
  minesweeper: MinesweeperGame,
  tetris: TetrisGame,
};

// 静态导出：预生成所有内置游戏页面
export function generateStaticParams() {
  return BUILTIN_GAMES.map((g) => ({ slug: g.slug }));
}

// 游戏页禁止缩放，避免快速点击按钮时误触双击/捏合缩放
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  return {
    title: game ? `${game.name} - 游戏乐园` : "游戏乐园",
  };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  const GameComponent = GAME_COMPONENTS[slug];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <nav className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 sm:px-4"
        >
          ← 返回大厅
        </Link>
        <h1 className="text-lg font-extrabold sm:text-xl">
          {game.emoji} {game.name}
        </h1>
        <div className="w-16 sm:w-24" />
      </nav>

      <div className={`mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r ${game.gradient}`} />

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <GameComponent />
      </div>

      <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-zinc-100 p-5 text-center text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
        <p className="font-bold text-zinc-600 dark:text-zinc-300">📖 玩法说明</p>
        <p className="mt-2">{game.instructions}</p>
      </div>
    </div>
  );
}
