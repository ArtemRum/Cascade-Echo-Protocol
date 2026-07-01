# Cascade: Echo Protocol — Project Backlog

> Generated from `design_doc.md` v2.4  
> Target: 7-day game jam (HTML5/JS)  
> Duration: ~25–40 min

---

## Legend

- `[MVP]` — Must-have for release
- `[ICE]` — Nice-to-have / quality-of-life
- `[BUG]` — Potential edge case to handle
- `[POLISH]` — Visual/audio polish

---

## Epic 0: Project Scaffolding

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 0.1 | `[MVP]` | Initialize project skeleton | Create `index.html`, `css/`, `js/` directory structure per design doc §10 | 1h |
| 0.2 | `[MVP]` | Set up build-free dev workflow | No bundler — plain HTML/JS/CSS with live-server or similar | 30m |
| 0.3 | `[ICE]` | Add favicon / icon.svg | Use existing `icon.svg` as favicon | 15m |

---

## Epic 1: Terminal Core

### 1.1 Terminal Renderer (`js/terminal/Terminal.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 1.1.1 | `[MVP]` | Create Terminal class | Core text renderer: green/amber text on black bg, scrollback buffer, cursor | 3h |
| 1.1.2 | `[MVP]` | Handle keyboard input | Capture keystrokes, echo to terminal, send to parser | 1h |
| 1.1.3 | `[MVP]` | Scrollback buffer | Maintain 500+ lines of history, scroll with PageUp/PageDown / mouse wheel | 1h |
| 1.1.4 | `[POLISH]` | CRT scanline effect | Subtle CSS overlay for retro feel | 30m |

### 1.2 Tab Manager (`js/terminal/TabManager.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 1.2.1 | `[MVP]` | Create TabManager class | Manage multiple TerminalPanel instances, tab bar UI | 2h |
| 1.2.2 | `[MVP]` | Ctrl+T — new tab | Creates new empty terminal session | 30m |
| 1.2.3 | `[MVP]` | Ctrl+W — close tab | Closes active tab (prevent closing last tab) | 30m |
| 1.2.4 | `[MVP]` | Ctrl+Tab — switch tabs | Cycle through tabs (Ctrl+Tab forward, Ctrl+Shift+Tab backward) | 30m |
| 1.2.5 | `[MVP]` | Double-click tab to rename | Inline edit of tab title | 30m |
| 1.2.6 | `[ICE]` | Tab context menu | Right-click → Close, Rename, Duplicate | 1h |
| 1.2.7 | `[ICE]` | Drag to reorder tabs | Reorder tab bar by dragging | 1h |

### 1.3 Terminal Panel (`js/terminal/TerminalPanel.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 1.3.1 | `[MVP]` | Create TerminalPanel class | Wraps Terminal + CommandParser + per-panel state (cwd, host, user, history) | 2h |
| 1.3.2 | `[MVP]` | Per-panel command history | ArrowUp/ArrowDown to recall previous commands | 30m |
| 1.3.3 | `[MVP]` | Connection context | Track current SSH host and user for each panel | 30m |

### 1.4 Command Parser (`js/terminal/CommandParser.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 1.4.1 | `[MVP]` | Create CommandParser class | Tokenize input, dispatch to registered command handlers | 2h |
| 1.4.2 | `[MVP]` | Tab autocomplete | Complete paths (files/dirs) and command names | 2h |
| 1.4.3 | `[MVP]` | Command registry | Extensible map of command name → handler function | 1h |
| 1.4.4 | `[MVP]` | Implement `help` command | List available commands and brief descriptions | 30m |
| 1.4.5 | `[MVP]` | Implement `clear` command | Clear terminal scrollback | 15m |
| 1.4.6 | `[MVP]` | Implement `history` command | Show command history for current panel | 15m |
| 1.4.7 | `[ICE]` | Pipe support (`\|`) | Chain commands via stdout/stdin simulation | 3h |
| 1.4.8 | `[ICE]` | Redirection (`>`, `>>`) | Redirect output to file in VFS | 2h |

---

## Epic 2: Virtual Filesystem

### 2.1 Core VFS (`js/filesystem/VirtualFS.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 2.1.1 | `[MVP]` | Create VirtualFS class | Tree-based in-memory filesystem with directories and files | 4h |
| 2.1.2 | `[MVP]` | Implement Unix-like permissions | Read/write/execute flags per user/group/other | 2h |
| 2.1.3 | `[MVP]` | Hidden files/dirs | Files starting with `.` are hidden from plain `ls` | 30m |
| 2.1.4 | `[MVP]` | Serialization/deserialization | Save/load FS state to/from JSON (for persistence and initial FS) | 2h |
| 2.1.5 | `[MVP]` | Implement `ls` | List directory contents with `-la`, `-l`, `-a` flags | 1h |
| 2.1.6 | `[MVP]` | Implement `cd` | Change directory with `.`, `..`, absolute/relative paths | 30m |
| 2.1.7 | `[MVP]` | Implement `pwd` | Print working directory | 15m |
| 2.1.8 | `[MVP]` | Implement `cat` | Display file contents | 30m |
| 2.1.9 | `[MVP]` | Implement `rm` | Remove file (support `-rf` for dirs) | 1h |
| 2.1.10 | `[MVP]` | Implement `cp` | Copy files (support `-r` for dirs) | 1h |
| 2.1.11 | `[MVP]` | Implement `mv` | Move / rename files | 1h |
| 2.1.12 | `[MVP]` | Implement `mkdir` | Create directories (support `-p`) | 30m |
| 2.1.13 | `[MVP]` | Implement `touch` | Create empty file or update timestamp | 15m |
| 2.1.14 | `[MVP]` | Implement `chmod` | Change file permissions (octal notation) | 1h |
| 2.1.15 | `[MVP]` | Implement `find` | Search files by name, type, size, time | 2h |
| 2.1.16 | `[MVP]` | Implement `grep` | Search within file contents | 1h |
| 2.1.17 | `[MVP]` | Implement `du` / `df` | Show disk usage | 30m |
| 2.1.18 | `[ICE]` | Implement `head` / `tail` | View first/last N lines of file (`-f` for tail follow) | 1h |
| 2.1.19 | `[ICE]` | Implement `wc` | Count lines/words/characters | 30m |
| 2.1.20 | `[ICE]` | Implement `sort` | Sort lines of text files | 30m |
| 2.1.21 | `[ICE]` | Implement `tree` | Visual directory listing | 30m |
| 2.1.22 | `[ICE]` | Implement `ln` | Symbolic and hard links | 1h |

### 2.2 File Types & Content (`js/filesystem/FileTypes.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 2.2.1 | `[MVP]` | Define file type registry | Binary vs text files, log files with dynamic content | 1h |
| 2.2.2 | `[MVP]` | Dynamic log generation | `/var/log/syslog` etc. that update in real time as events happen | 2h |
| 2.2.3 | `[ICE]` | File metadata | Owner, group, timestamps, permissions display | 30m |

### 2.3 Initial Filesystem Data (`data/initial_fs/`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 2.3.1 | `[MVP]` | Create FS data for 18 server nodes | Each server gets standard Linux layout: `/etc`, `/var/log`, `/usr/lib`, `/tmp`, `/home`, etc. | 4h |
| 2.3.2 | `[MVP]` | Seed logs with normal entries | `/var/log/syslog`, `/var/log/auth.log` with realistic baseline entries | 1h |

---

## Epic 3: Network System

### 3.1 Network Graph (`js/network/NetworkGraph.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 3.1.1 | `[MVP]` | Create NetworkGraph class | Graph of 30 nodes (DMZ/Core/Archive), adjacency list | 2h |
| 3.1.2 | `[MVP]` | Node states | Clean / infected / isolated — state machine per node | 1h |
| 3.1.3 | `[MVP]` | Node isolation via `ifconfig` | `ifconfig eth0 down/up` toggles node connectivity | 1h |
| 3.1.4 | `[MVP]` | Segment isolation via `iptables` | `iptables -P FORWARD DROP/ACCEPT` toggles subnet connectivity | 1h |
| 3.1.5 | `[MVP]` | SSH access validation | Can only SSH to nodes that are in network reach (not isolated) | 1h |
| 3.1.6 | `[MVP]` | Load topology from JSON | Parse `data/network_topology.json` | 1h |

### 3.2 Mirror Router (`js/network/MirrorRouter.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 3.2.1 | `[MVP]` | Create MirrorRouter class | 4 proxy nodes with cross-routing (asymmetric routes) | 2h |
| 3.2.2 | `[MVP]` | Implement `traceroute` | Show path with `-s` flag for source IP option | 2h |
| 3.2.3 | `[MVP]` | Implement `route add` | Static route addition to resolve mirror routing | 1h |
| 3.2.4 | `[MVP]` | IP drift mechanic | Mirror IPs change every 15–20 seconds, predictable pattern (+5 to last octet) | 2h |
| 3.2.5 | `[MVP]` | Log warning on asymmetric routes | `[WARN] Asymmetric route` appears in logs as clue | 1h |
| 3.2.6 | `[POLISH]` | ASCII mirror effect | Output line briefly reverses (mirror reflection) on successful pass | 1h |

### 3.3 Network Topology Data

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 3.3.1 | `[MVP]` | Create `network_topology.json` | Define 30 nodes: 3 segments, connections, segment boundaries | 2h |
| 3.3.2 | `[MVP]` | Mirror nodes config | 4 proxy nodes with cross-route definitions and drift patterns | 1h |

---

## Epic 4: Virus System

### 4.1 Bloomd Virus (`js/virus/Bloomd.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 4.1.1 | `[MVP]` | Create Bloomd class | Virus state machine: dormant → active → mutating | 2h |
| 4.1.2 | `[MVP]` | Virus as file + process | Spawns hidden file `/usr/lib/.bloomd` and matching process | 1h |
| 4.1.3 | `[MVP]` | Process shows in `ps aux` / `top` | Visible as `bloomd` consuming 10–15% CPU | 30m |
| 4.1.4 | `[MVP]` | Spread mechanic | Infects one random clean neighbor every (7/5/3) minutes depending on stage | 2h |
| 4.1.5 | `[MVP]` | Virus renaming (mutation) | Changes filename on later stages to evade detection | 1h |
| 4.1.6 | `[MVP]` | Crontab persistence | Writes itself into `/etc/crontab` / `/etc/rc.local` on stage 4+ | 1h |
| 4.1.7 | `[MVP]` | Virus kill handling | Responds to `kill -9` — process stops, watchdog may restart it | 1h |
| 4.1.8 | `[MVP]` | File deletion handling | `rm` removes virus file — watchdog may restore it on stage 6 | 30m |
| 4.1.9 | `[ICE]` | Virus signature change | `md5sum` changes on mutation, player must search by pattern | 1h |

### 4.2 Watchdog (`js/virus/Watchdog.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 4.2.1 | `[MVP]` | Create Watchdog class | Process `bloom_watchdog`, scans every 15 seconds | 2h |
| 4.2.2 | `[MVP]` | Stage III — restore process | If virus file exists but process is killed, watchdog restarts process | 1h |
| 4.2.3 | `[MVP]` | Stage VI — restore file | If watchdog alive and virus file missing, restore file from hidden copy | 1h |
| 4.2.4 | `[MVP]` | Watchdog appears in `ps aux` | Visible as `/usr/sbin/.bloom_watchdog` | 15m |
| 4.2.5 | `[MVP]` | Watchdog kill sequence | Proper order: kill watchdog → rm virus file → kill virus process | 1h |
| 4.2.6 | `[MVP]` | Log watchdog activity | `[WATCHDOG] Restarting /usr/lib/.bloomd (file exists)` in syslog | 30m |

### 4.3 Virus Config (`data/virus_config.json`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 4.3.1 | `[MVP]` | Create virus_config.json | Stage timings, file names, mutation patterns, watchdog behavior params | 1h |

---

## Epic 5: USAT & Player Pressure System

### 5.1 USAT Manager (`js/story/USATManager.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 5.1.1 | `[MVP]` | Create USATManager class | Global satisfaction score 0–100%, tick-based updates | 1h |
| 5.1.2 | `[MVP]` | Isolation penalty per node type | DMZ –2%, Core –5%, Archive –3% per isolated node | 1h |
| 5.1.3 | `[MVP]` | Restoration gain | `ifconfig eth0 up` + clean node → USAT recovers proportionally | 30m |
| 5.1.4 | `[MVP]` | Auto-fix USAT every 30s | User complaints arrive every 30s while node isolated | 1h |
| 5.1.5 | `[MVP]` | USAT < 25% — auto restore | All isolated nodes reconnected, system message + email | 2h |
| 5.1.6 | `[MVP]` | USAT < 15% — firing timer | 5-minute countdown to bad ending | 1h |
| 5.1.7 | `[MVP]` | USAT < 40% — management warnings | Pressure emails, no mechanical penalty yet | 30m |
| 5.1.8 | `[MVP]` | USAT display in status bar | `█████░░░░░ 52%` style bar | 30m |

---

## Epic 6: Story Engine

### 6.1 Story Engine (`js/story/StoryEngine.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 6.1.1 | `[MVP]` | Create StoryEngine class | Act manager, flag-based progression through 7 stages | 3h |
| 6.1.2 | `[MVP]` | Stage progression triggers | Time-based + event-based progression hooks | 1h |
| 6.1.3 | `[MVP]` | Implement multiple endings | 4 endings: Expose, Loyalty, Shadow, Firefighting | 3h |
| 6.1.4 | `[MVP]` | Ending: Expose | Copy encryption keys via SCP, disable archive protection | 1h |
| 6.1.5 | `[MVP]` | Ending: Loyalty | Block hacker, delete all Echo project files | 1h |
| 6.1.6 | `[MVP]` | Ending: Shadow | Copy data to `/tmp/.shadow`, leave no trace | 1h |
| 6.1.7 | `[MVP]` | Ending: Firefighting | Isolate all infected nodes, USAT hits 0% → fired | 1h |

### 6.2 Email Client (`js/story/EmailClient.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 6.2.1 | `[MVP]` | Create EmailClient class | Inbox with messages from users, management | 2h |
| 6.2.2 | `[MVP]` | User complaint emails | Generated every 30s while nodes isolated, varied templates | 1h |
| 6.2.3 | `[MVP]` | Plot emails | Story-critical emails at stage transitions | 1h |
| 6.2.4 | `[MVP]` | Implement `mail` command | Read inbox, show unread count | 1h |

### 6.3 Story Events Data

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 6.3.1 | `[MVP]` | Create `story_events.json` | All story beats, email templates, trigger conditions | 2h |
| 6.3.2 | `[MVP]` | Werner's journal | Contents of `journal.txt` in `/archive/echo/` | 1h |
| 6.3.3 | `[MVP]` | System messages | Critical alerts (auto-restore, firing warning, etc.) | 30m |

### 6.4 Assistant / Tutorial

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 6.4.1 | `[MVP]` | In-game assistant | Guides player through Stage 0 (tutorial) with contextual hints | 3h |
| 6.4.2 | `[MVP]` | Tutorial tasks checklist | SSH connect, ls/cd, view logs, find/kill test virus, iptables | 2h |
| 6.4.3 | `[MVP]` | Assistant goes silent after tutorial | "Critical comm failure" — transitions to real threat | 30m |

---

## Epic 7: Puzzles & Stage Progression

### 7.1 Puzzle Stages (`js/puzzles/PuzzleStages.js`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 7.1.1 | `[MVP]` | Stage 0 — Tutorial | Sandbox with test virus, assistant guidance | 2h |
| 7.1.2 | `[MVP]` | Stage 1 — Single infection | One infected DMZ node, basic kill + rm | 2h |
| 7.1.3 | `[MVP]` | Stage 2 — Multi-node | 2-3 infected nodes, first isolation decisions, hidden files | 2h |
| 7.1.4 | `[MVP]` | Stage 3 — Mirrors + Watchdog | route add, IP drift introduced, watchdog appears | 3h |
| 7.1.5 | `[MVP]` | Stage 4 — Crontab persistence | 5 infected nodes, virus in crontab, mirror loops | 2h |
| 7.1.6 | `[MVP]` | Stage 5 — Archive discovery | `/archive/echo/` found, watchdog restores file, md5sum search | 3h |
| 7.1.7 | `[MVP]` | Stage 6 — Final choice | Ending selection based on state + player action | 2h |
| 7.1.8 | `[MVP]` | Stage transition effects | Bloom ASCII animation, system messages on stage change | 1h |

---

## Epic 8: ASCII Visualization & UI

### 8.1 Topology Map

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 8.1.1 | `[MVP]` | Implement `topology` command | Draw ASCII network map in terminal | 3h |
| 8.1.2 | `[MVP]` | Node symbols | `[ ]` clean, `[X]` infected, `[#]` isolated, dashed lines for mirrors | 1h |
| 8.1.3 | `[MVP]` | Drifting IP indicator | Flashing `*` on nodes with drifting IPs | 30m |
| 8.1.4 | `[POLISH]` | Bloom animation | `*`, `.`, `+` spread across screen when node gets infected | 1h |

### 8.2 Status Bar & HUD

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 8.2.1 | `[MVP]` | Top tab bar | Tab names, active tab highlighted, close button | 1h |
| 8.2.2 | `[MVP]` | Bottom status bar | Time, current host, threat level, USAT bar | 1h |
| 8.2.3 | `[POLISH]` | Threat level indicator | Color changes: green → yellow → red | 30m |
| 8.2.4 | `[POLISH]` | Scanline / CRT overlay | CSS pseudo-element for retro look | 30m |

### 8.3 Terminal Styling (`css/terminal.css`)

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 8.3.1 | `[MVP]` | Base terminal theme | Black background, green/amber monospace text, cursor blink | 1h |
| 8.3.2 | `[MVP]` | Tab bar styling | Horizontal tabs, active/inactive states, close icons | 1h |
| 8.3.3 | `[MVP]` | Status bar styling | Bottom fixed bar with flex layout | 30m |
| 8.3.4 | `[ICE]` | Custom scrollbar | Themed scrollbar for webkit | 30m |
| 8.3.5 | `[ICE]` | Responsive layout | Adapt to different window sizes, mobile fallback | 1h |

---

## Epic 9: Sound & Audio

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 9.1 | `[MVP]` | Keyboard click sounds | Play on each keypress | 1h |
| 9.2 | `[MVP]` | Server room ambient loop | Low hum background | 1h |
| 9.3 | `[MVP]` | Infection bloom sound | Ethereal tone when node gets infected | 30m |
| 9.4 | `[MVP]` | Mirror pass sound | Echo/reverb effect when solving mirror puzzle | 30m |
| 9.5 | `[ICE]` | Critical alert sound | Siren when USAT < 25% or auto-restore triggers | 30m |
| 9.6 | `[ICE]` | Ending theme music | Short ambient piece for each ending | 1h |
| 9.7 | `[ICE]` | Mute button | Toggle audio on/off from status bar | 30m |

---

## Epic 10: Story Content & Writing

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 10.1 | `[MVP]` | Write Act I script | Intro, complaint emails, discovery of first bloomd | 2h |
| 10.2 | `[MVP]` | Write Act II script | Bloom spread, user complaints escalate, isolation introduced | 2h |
| 10.3 | `[MVP]` | Write Act III script | Mirror puzzles, drift logs, watchdog reveal | 2h |
| 10.4 | `[MVP]` | Write Act IV script | Archive discovery, Werner's journal, Echo project reveal | 2h |
| 10.5 | `[MVP]` | Write 4 endings | Text/epilogue for each ending | 2h |
| 10.6 | `[MVP]` | Write 20+ email templates | User complaints, management warnings, plot emails | 2h |
| 10.7 | `[MVP]` | Write tutorial script | Assistant dialogue, step-by-step guidance | 2h |
| 10.8 | `[MVP]` | Write Werner's journal.txt | Multi-entry diary revealing the conspiracy | 1h |
| 10.9 | `[MVP]` | Write system messages | All critical alerts, stage transitions, tutorial prompts | 1h |
| 10.10 | `[ICE]` | Localization support | String table structure for potential translation | 1h |

---

## Epic 11: Game Loop & Integration

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 11.1 | `[MVP]` | Main game loop (`main.js`) | Initialize all systems, tick timer, event dispatch | 2h |
| 11.2 | `[MVP]` | Game state persistence | Save/load to localStorage (optional) | 2h |
| 11.3 | `[MVP]` | New game / reset | Clean slate, stage 0 | 30m |
| 11.4 | `[MVP]` | Pause menu | Escape key → pause overlay | 1h |
| 11.5 | `[ICE]` | Speedrun timer | Show elapsed time in status bar | 30m |
| 11.6 | `[ICE]` | Hint system | Contextual tips if player is stuck too long | 2h |

---

## Epic 12: Testing & QA

| ID | Priority | Title | Description | Estimate |
|---|---|---|---|---|
| 12.1 | `[MVP]` | Test all 20+ commands | Verify each command works correctly in VFS context | 2h |
| 12.2 | `[MVP]` | Test virus lifecycle | Spawn, spread, kill, rm, watchdog restore at all stages | 2h |
| 12.3 | `[MVP]` | Test USAT mechanics | Isolation penalties, auto-restore at 25%, firing at 15% | 1h |
| 12.4 | `[MVP]` | Test mirror puzzles | route add, traceroute, IP drift, cross-routing | 1h |
| 12.5 | `[MVP]` | Test all 4 endings | Verify triggers and epilogues | 1h |
| 12.6 | `[MVP]` | Test tab management | Create/close/switch/rename — edge cases | 1h |
| 12.7 | `[MVP]` | Full playthrough | 25–40 minute run, verify game is completable | 2h |
| 12.8 | `[ICE]` | Fuzz test command parser | Edge cases: pipe, redirect, special chars, empty input | 1h |
| 12.9 | `[ICE]` | Bug bash | Playtest with 3–5 people, collect and fix issues | 4h |

---

## Summary

| Epic | Title | MVP Tasks | ICE Tasks | Total Tasks | Est. MVP Hours |
|---|---|---|---|---|---|
| 0 | Project Scaffolding | 2 | 1 | 3 | 1.5 |
| 1 | Terminal Core | 14 | 4 | 18 | 19.5 |
| 2 | Virtual Filesystem | 22 | 5 | 27 | 29.5 |
| 3 | Network System | 9 | 1 | 10 | 14 |
| 4 | Virus System | 12 | 1 | 13 | 13.75 |
| 5 | USAT & Pressure | 8 | 0 | 8 | 9.5 |
| 6 | Story Engine | 14 | 0 | 14 | 24.5 |
| 7 | Puzzles & Stages | 8 | 0 | 8 | 17 |
| 8 | ASCII Vis & UI | 8 | 4 | 12 | 10 |
| 9 | Sound & Audio | 4 | 3 | 7 | 3 |
| 10 | Story Content | 9 | 1 | 10 | 16 |
| 11 | Game Loop & Integration | 4 | 2 | 6 | 5.5 |
| 12 | Testing & QA | 7 | 2 | 9 | 10 |
| **Total** | | **121** | **24** | **145** | **173.75h** |

> **Note:** 173.75 MVP hours ≈ 24.8 hours/day over 7 days. Realistically, scope must be cut by ~30-40% for a 7-day jam. Prioritize Epics 1-5 and trim Epics 6-10 to essential beats.
