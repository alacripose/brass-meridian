import type { Sim } from "./sim";

const KEY = "brass-meridian.save.v2";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function hasSave(): boolean {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function saveGame(sim: Sim): boolean {
  try {
    localStorage.setItem(KEY, toBase64(sim.saveBytes()));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(sim: Sim): boolean {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return false;
    return sim.loadBytes(fromBase64(text)) === 0;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // A blocked storage area is not a game-breaking state.
  }
}
