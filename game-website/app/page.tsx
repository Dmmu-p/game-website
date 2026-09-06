"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BUILTIN_GAMES,
  loadBestScores,
  loadOnlineGames,
  saveOnlineGames,
  type OnlineGame,
} from "@/lib/games";

const EMOJIS = ["🌐", "🎮", "🕹️", "👾", "🚀", "⭐", "🔥", "🎯"];

export default function Home() {
  const [onlineGames, setOnlineGames] = useState<OnlineGame[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOnlineGames(loadOnlineGames());
    setScores(loadBestScores());
  }, []);

  const totalPlayed = useMemo(
    () => BUILTIN_GAMES.filter((g) => (scores[g.slug] ?? 0) > 0).length + onlineGames.length,
    [scores, onlineGames]
  );

  const addOnlineGame = () => {
    const trimmedName = name.trim();
    let trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      setError("请填写游戏名称和网址");
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) trimmedUrl = `https://${trimmedUrl}`;
    try {
      new URL(trimmedUrl);
    } catch {
      setError("网址格式不正确，请以 http(s):// 开头");
      return;
    }
    const game: OnlineGame = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      url: trimmedUrl,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    };
    const next = [...onlineGames, game];
    setOnlineGames(next);
    saveOnlineGames(next);
    setName("");
    setUrl("");
    setError("");
    setShowForm(false);
  };

  const removeOnlineGame = (id: string) => {
    const next = onlineGames.filter((g) => g.id !== id);
    setOnlineGames(next);
    saveOnlineGames(next);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* 头部 */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          🎮 游戏<span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">乐园</span>
        </h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          五个经典小游戏，随时开玩 · 分数自动保存在本地
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-violet-500/15 px-4 py-1.5 text-violet-600 dark:text-violet-400">
            🕹️ {BUILTIN_GAMES.length} 款内置游戏
          </span>
          <span className="rounded-full bg-fuchsia-500/15 px-4 py-1.5 text-fuchsia-600 dark:text-fuchsia-400">
            🌐 {onlineGames.length} 款线上游戏
          </span>
        </div>
      </header>

      {/* 内置游戏 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">内置小游戏</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_GAMES.map((game) => {
            const best = scores[game.slug] ?? 0;
            return (
              <Link
                key={game.slug}
                href={`/games/${game.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${game.gradient}`} />
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{game.emoji}</span>
                  {best > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      🏆 {best}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold">{game.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{game.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 transition group-hover:gap-2 dark:text-violet-400">
                  开始游戏 →
                </span>
              </Link>
            );
          })}

          {/* 添加线上游戏卡片 */}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 text-zinc-400 transition hover:border-violet-400 hover:text-violet-500 dark:border-zinc-700"
          >
            <span className="text-4xl">➕</span>
            <span className="font-semibold">添加线上游戏</span>
          </button>
        </div>
      </section>

      {/* 添加表单 */}
      {showForm && (
        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-800/50 dark:bg-violet-950/30">
          <h3 className="mb-3 font-bold text-violet-700 dark:text-violet-300">收藏一个线上游戏</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="游戏名称，如：五子棋"
              className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="游戏网址，如：https://example.com/game"
              className="flex-[2] rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900"
              onKeyDown={(e) => e.key === "Enter" && addOnlineGame()}
            />
            <button
              onClick={addOnlineGame}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              保存
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <p className="mt-2 text-xs text-zinc-400">游戏会保存在本地浏览器中（localStorage），点击卡片即可在新标签页打开游玩。</p>
        </div>
      )}

      {/* 线上游戏列表 */}
      {onlineGames.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">我的线上游戏</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {onlineGames.map((game) => (
              <div
                key={game.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{game.emoji}</span>
                  <button
                    onClick={() => removeOnlineGame(game.id)}
                    title="删除该游戏"
                    className="rounded-full px-2 py-1 text-zinc-300 opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="mt-3 text-lg font-bold">{game.name}</h3>
                <p className="mt-1 truncate text-sm text-zinc-400" title={game.url}>
                  {game.url.replace(/^https?:\/\//, "")}
                </p>
                <a
                  href={game.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition group-hover:gap-2 dark:text-cyan-400"
                >
                  打开游戏 ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-14 text-center text-xs text-zinc-400">
        共探索 {totalPlayed} 款游戏 · 最高分与收藏均存储在你的浏览器本地
      </footer>
    </div>
  );
}
