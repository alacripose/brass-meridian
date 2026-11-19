// The two-second rule, made checkable:
//   - one idea per sentence, at most 24 words;
//   - at most 3 sentences in a prose paragraph;
//   - no filler words that hide a missing fact.
// Lists, tables, headings and code are structure, not prose, so they are skipped.

import { readFileSync } from "node:fs";

export const MAX_SENTENCE_WORDS = 24;
export const MAX_PARAGRAPH_SENTENCES = 3;
export const MAX_UI_WORDS = 18;
export const MAX_UI_CHARS = 92;

const BANNED = [
  /\bseamless(ly)?\b/i,
  /\bleverage\b/i,
  /\bunleash(ed|ing)?\b/i,
  /\belevate\b/i,
  /\bempower(s|ed|ing)?\b/i,
  /\brobust\b/i,
  /\bcutting[- ]edge\b/i,
  /\bgame[- ]changing\b/i,
  /\brevolutioniz(e|ed|ing)\b/i,
  /\bdelve\b/i,
  /\btapestry\b/i,
  /\bmyriad\b/i,
  /\bplethora\b/i,
  /\bholistic\b/i,
  /\bparadigm\b/i,
  /\bmeticulous(ly)?\b/i,
  /\butili[sz]e\b/i,
  /\bfacilitate\b/i,
  /\bsynerg(y|ies)\b/i,
];

export function words(text) {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'’/.:%+-]*/g) || []).length;
}

export function sentences(text) {
  return text
    .replace(/`[^`]*`/g, "code")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => words(s) > 0);
}

function withoutFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return text;
  const end = lines.indexOf("---", 1);
  return end > 0 ? lines.slice(end + 1).join("\n") : text;
}

export function reviewProse(text) {
  const issues = [];
  const blocks = withoutFrontMatter(text)
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (/^(#|\||[-*+]\s|>\s|\d+\.\s|<|\[!|<!--)/.test(block)) continue;
    const list = sentences(block);
    if (list.length > MAX_PARAGRAPH_SENTENCES) {
      issues.push({ kind: "paragraph", detail: `${list.length} sentences`, text: block.slice(0, 80) });
    }
    for (const sentence of list) {
      const count = words(sentence);
      if (count > MAX_SENTENCE_WORDS) {
        issues.push({ kind: "sentence", detail: `${count} words`, text: sentence.slice(0, 100) });
      }
    }
  }
  const proseOnly = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  for (const pattern of BANNED) {
    const match = proseOnly.match(pattern);
    if (match) issues.push({ kind: "banned", detail: match[0], text: "" });
  }
  return issues;
}

export function reviewCopy(text) {
  const issues = [];
  const strings = [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  for (const value of strings) {
    if (!/[a-z]/i.test(value)) continue;
    const count = words(value);
    if (count > MAX_UI_WORDS || value.length > MAX_UI_CHARS) {
      issues.push({ kind: "ui", detail: `${count} words / ${value.length} chars`, text: value });
    }
    for (const pattern of BANNED) {
      const match = value.match(pattern);
      if (match) issues.push({ kind: "banned", detail: match[0], text: value });
    }
  }
  return issues;
}

export function reviewFile(path, { copy = false } = {}) {
  const text = readFileSync(path, "utf8");
  return (copy ? reviewCopy(text) : reviewProse(text)).map((issue) => ({ path, ...issue }));
}
