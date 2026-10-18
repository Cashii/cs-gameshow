export const SHOW_BETA_GAMES_STORAGE_KEY = "cs_gameshow_show_beta_games";

export const DEFAULT_SHOW_BETA_GAMES = false;

export function readShowBetaGames(): boolean {
  if (typeof window === "undefined") return DEFAULT_SHOW_BETA_GAMES;
  try {
    const raw = localStorage.getItem(SHOW_BETA_GAMES_STORAGE_KEY);
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return DEFAULT_SHOW_BETA_GAMES;
  } catch {
    return DEFAULT_SHOW_BETA_GAMES;
  }
}

export function writeShowBetaGames(show: boolean) {
  try {
    localStorage.setItem(SHOW_BETA_GAMES_STORAGE_KEY, show ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}
