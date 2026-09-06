export interface GameMeta {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  instructions: string;
}

export const BUILTIN_GAMES: GameMeta[] = [
  {
    slug: "snake",
    name: "贪吃蛇",
    emoji: "🐍",
    description: "经典贪吃蛇，三种难度可选，霓虹特效等你挑战。",
    gradient: "from-emerald-500 to-green-700",
    instructions: "开局选择难度后倒计时出发！方向键 / WASD 控制移动，空格键暂停。吃到发光食物得分，蛇会越来越长、越来越快；撞墙或撞到自己则游戏结束。手机端支持滑动与十字键操作。",
  },
  {
    slug: "sokoban",
    name: "推箱子",
    emoji: "📦",
    description: "把箱子推到目标点，经典益智关卡等你挑战。",
    gradient: "from-amber-500 to-orange-600",
    instructions: "方向键 / WASD 移动小人，把所有箱子推到 ✨ 目标点上。支持撤销（U）与重开（R）。",
  },
  {
    slug: "2048",
    name: "2048",
    emoji: "🔢",
    description: "合并相同数字，向 2048 发起冲刺！",
    gradient: "from-yellow-500 to-amber-600",
    instructions: "方向键 / WASD 滑动方块，相同数字合并翻倍。合成 2048 即获胜！",
  },
  {
    slug: "minesweeper",
    name: "扫雷",
    emoji: "💣",
    description: "推理出所有地雷的位置，经典三连难度可选。",
    gradient: "from-slate-500 to-slate-700",
    instructions: "左键翻开格子，右键标记地雷 🚩。数字代表周围 8 格内的地雷数量。",
  },
  {
    slug: "tetris",
    name: "俄罗斯方块",
    emoji: "🧱",
    description: "消除整行得分，方块下落越来越快，挑战极限！",
    gradient: "from-sky-500 to-indigo-600",
    instructions: "← → 移动，↑ 旋转，↓ 加速下落，空格键直接落底，P 键暂停。",
  },
];

export function getGameBySlug(slug: string): GameMeta | undefined {
  return BUILTIN_GAMES.find((g) => g.slug === slug);
}

/** 用户添加的线上游戏 */
export interface OnlineGame {
  id: string;
  name: string;
  url: string;
  emoji: string;
}

const ONLINE_KEY = "gamehub:online";
const SCORE_KEY = "gamehub:scores";

export function loadOnlineGames(): OnlineGame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ONLINE_KEY);
    const list = raw ? (JSON.parse(raw) as OnlineGame[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveOnlineGames(list: OnlineGame[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONLINE_KEY, JSON.stringify(list));
}

export function loadBestScores(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveBestScore(slug: string, score: number): number {
  if (typeof window === "undefined") return score;
  const scores = loadBestScores();
  const best = Math.max(score, scores[slug] ?? 0);
  scores[slug] = best;
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  return best;
}
