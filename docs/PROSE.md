# Prose

The owner asked for prose that a person can read in two seconds. We made that checkable.

## Rule

- One sentence carries one idea.
- A sentence is at most 24 words.
- A prose paragraph is at most 3 sentences.
- A UI string is at most 18 words and 92 characters.
- Filler words are banned.

The checker is `tools/prose.mjs`. The gate runs it over every doc and over `src/copy.ts`.

## What counts

Docs, tickets, README, AGENTS, CHANGELOG, and every player-facing string.

Code comments are not scanned. Tables, lists, headings, and code blocks are skipped as structure.

YAML front matter is skipped.

## Why these limits

24 words is roughly one breath. Three sentences is one small paragraph. 18 words fits a phone button or a toast.

The numbers are deliberately tight. A longer sentence usually hides two claims.

## Banned words

The list targets empty confidence.

- `seamless`, `leverage`, `unleash`.
- `elevate`, `empower`, `robust`.
- `cutting-edge`, `game-changing`, `revolutionize`.
- `delve`, `tapestry`, `myriad`, `plethora`.
- `holistic`, `paradigm`, `meticulous`.
- `utilize`, `facilitate`, `synergy`.

Use the plain verb instead.

## Examples

Good: "Towers block the route. Keep a way open."

Bad: `Towers seamlessly integrate into a robust pathfinding system that leverages dynamic flow fields.`

The second line has one fact and three fog words.

## Exceptions

A quoted owner line is not rewritten. A code identifier is not prose.

If a table cell needs a longer phrase, split it into two cells or move it to a list.

## Run it

```bash
npm run gate
```

The gate names the file, the kind, and the count. Fix the sentence, not the checker.
