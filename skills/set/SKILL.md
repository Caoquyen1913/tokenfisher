---
name: set
description: Switch the tokenfisher level (low, high, ultra, promax, or off) for every project. Use when the user runs /tokenfisher:set, or asks to change how hard tokenfisher saves tokens.
disable-model-invocation: true
---

# tokenfisher set

Levels apply to every project: they write `~/.claude/settings.json` (user scope) and `~/.claude/tokenfisher/level.json`. The script lives two levels above this file, in `bin/`.

| level | in short |
|---|---|
| low | keeps your model and every tool; warnings at 120k, reports, output compression |
| high (default) | Sonnet main thread, every tool, compact at 200k, subagents on Sonnet, warnings at 80k |
| ultra | high + low effort, compact at 150k, stronger output compression, warnings at 60k |
| promax | ultra + only the 7 core coding tools (no MCP, browser or web tools), compact at 100k, warnings at 50k |
| off | removes every setting tokenfisher wrote; the plugin behaves as just installed |

## No level given

Run `node <this skill's base directory>/../../bin/set-level.js` and show the current level with the table above. Stop there.

## A level given

1. Show what changes:

   ```
   node <this skill's base directory>/../../bin/set-level.js plan <level>
   ```

   List each change as key, old → new value, and action. `skip` means the user set that key themselves; it stays as is. For promax, say plainly that MCP servers, browser and web tools are unavailable in its sessions.
2. Ask the user to confirm. Apply nothing without a yes.
3. Apply:

   ```
   node <this skill's base directory>/../../bin/set-level.js apply <level>
   ```

   For `off`, run `set-level.js off` instead.
4. Report what changed, that the backup is `~/.claude/tokenfisher/settings.backup.json`, and that new sessions pick up the level.

## Desktop app

In the Claude desktop app the model picker wins over the level's main agent: at high, ultra and promax, tell the user to pick Sonnet in the model picker to get the main-thread savings. Everything else in the level applies there too.
