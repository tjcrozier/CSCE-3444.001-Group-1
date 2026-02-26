const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class ExternalIntentRouter {
  constructor() {
    this.index = {}; // Map<keyword, commandId[]>
    this.commandList = []; // Array<commandId>
    this.isIndexed = false;
  }

  /**
   * 1. Build the Index (Runs once on startup or if forced)
   */
  async buildIndex(context) {
    // Try to load from disk first
    const storagePath = context.globalStorageUri.fsPath;
    const indexPath = path.join(storagePath, "command_index.json");

    // Ensure storage folder exists
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    try {
      // If file exists and is less than 24h old, load it
      if (fs.existsSync(indexPath)) {
        const stats = fs.statSync(indexPath);
        const age = Date.now() - stats.mtimeMs;
        if (age < 86400000) {
          // 24 hours
          const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
          this.index = data.index;
          this.commandList = data.list;
          this.isIndexed = true;
          console.log(
            `[Router] Loaded ${this.commandList.length} commands from cache.`
          );
          return;
        }
      }
    } catch (e) {
      console.warn("[Router] Cache load failed, rebuilding...", e);
    }

    // --- REBUILD INDEX ---
    console.log("[Router] Building command index (this may take 2-3s)...");
    const allCommands = await vscode.commands.getCommands(true);

    // Filter noise (cursors, internal lists, debug internals)
    const cleanList = allCommands.filter(
      (cmd) =>
        !cmd.startsWith("_") &&
        !cmd.includes("cursor") &&
        !cmd.includes("list.focus") &&
        !cmd.includes("echocode.") // Don't index ourselves
    );

    const newIndex = {};

    cleanList.forEach((cmd) => {
      // Tokenize: "workbench.action.terminal.new" -> ["workbench", "action", "terminal", "new"]
      const parts = cmd.split(/[\.:-]/).filter((p) => p.length > 2);

      parts.forEach((part) => {
        const key = part.toLowerCase();
        if (!newIndex[key]) newIndex[key] = [];
        newIndex[key].push(cmd);
      });
    });

    this.index = newIndex;
    this.commandList = cleanList;
    this.isIndexed = true;

    // Save to disk
    fs.writeFileSync(
      indexPath,
      JSON.stringify({ index: newIndex, list: cleanList })
    );
    console.log("[Router] Index saved.");
  }

  /**
   * 2. Find Candidates using the Index
   */
  async findExternalCommand(userRequest, aiService, context) {
    if (!this.isIndexed) {
      await this.buildIndex(context);
    }

    const userWords = userRequest
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 2);

    // 1. Scoring System: Count how many keywords appear in the command ID
    const scores = {}; // Map<commandId, score>

    userWords.forEach((word) => {
      // Direct lookup in our optimized index
      const matches = this.index[word] || [];
      matches.forEach((cmd) => {
        scores[cmd] = (scores[cmd] || 0) + 1;
      });
    });

    // 2. Sort by score (most matching words first)
    // We get the top 30 most relevant commands
    const candidates = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30) // Only send top 30 to AI
      .map(([cmd]) => cmd);

    // Hard fallback: If scoring failed, try "contains" check on raw list (slower but safer)
    if (candidates.length === 0) {
      const fallback = this.commandList
        .filter((cmd) => userWords.some((w) => cmd.toLowerCase().includes(w)))
        .slice(0, 20);
      candidates.push(...fallback);
    }

    if (candidates.length === 0) return null;

    console.log(`[Router] AI Identifying from:`, candidates);

    // 3. Ask AI to pick the Best one
    const candidateObjects = candidates.map((c) => ({ id: c }));
    try {
      const bestMatchId = await aiService.classifyVoiceIntent(
        userRequest,
        candidateObjects,
        { temperature: 0.1 }
      );
      return bestMatchId && bestMatchId !== "none" ? bestMatchId : null;
    } catch (e) {
      return null;
    }
  }

  async executeCommand(commandId) {
    try {
      await vscode.commands.executeCommand(commandId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ExternalIntentRouter();
