const vscode = require("vscode");

// Helper to get model safely
async function selectModel() {
  // 1. Get all copilot models
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });

  // 2. Safety check
  if (!models || models.length === 0) {
    throw new Error(
      "No Copilot models available. Please check your GitHub Copilot Chat extension."
    );
  }

  // 3. Prefer GPT-4, fallback to default
  let selected = models.find((m) => m.family && m.family.includes("gpt-4"));
  if (!selected) {
    selected = models[0];
  }
  return selected;
}

/**
 * NEW: Analyzes natural language to determine which "Mode" to activate.
 * Returns: 'CODE_GEN' | 'CHAT_TUTOR' | 'EXPLAIN_FEATURE' | 'COMMAND_EXEC'
 */
async function determineMode(transcript) {
  try {
    const model = await selectModel();

    const systemInstruction = `You are a hidden intent classifier for a coding assistant.
    Analyze the USER INPUT and categorize it into exactly one of these categories:

    1. "CODE_GEN": The user explicitly wants to write, insert, generate, or create new code. (e.g., "Write a loop", "Create a function", "Print hello world").
    2. "CHAT_TUTOR": The user is asking a general coding question, asking for help, or wants to chat. (e.g., "How do I center a div?", "What is a variable?", "Help me fix this").
    3. "EXPLAIN_FEATURE": The user is asking specifically about "features", "commands", or "how to use" this VS Code extension itself. (e.g. "How do I use the summarizer?", "What commands do you have?", "Explain Big O feature").
    4. "COMMAND_EXEC": The user is trying to trigger a specific editor action or voice command. (e.g., "Run the code", "Open terminal", "Zoom in", "Format document").

    Reply ONLY with the category name string. No other text.`;

    const combinedPrompt = `SYSTEM:\n${systemInstruction}\n\nUSER INPUT: "${transcript}"`;
    const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];

    // Low temperature for consistent classification
    const chatReq = await model.sendRequest(messages, { temperature: 0.0 });

    let result = "";
    for await (const fragment of chatReq.text) {
      result += fragment;
    }

    // Clean up result
    result = result.trim().replace(/['"`]/g, "").toUpperCase();

    // Fallback if AI hallucinates something else
    const validModes = [
      "CODE_GEN",
      "CHAT_TUTOR",
      "EXPLAIN_FEATURE",
      "COMMAND_EXEC",
    ];
    if (!validModes.includes(result)) {
      return "CHAT_TUTOR"; // Default to safety
    }

    return result;
  } catch (err) {
    console.error("Mode classification failed:", err);
    return "CHAT_TUTOR"; // Safe fallback
  }
}

async function analyzeAI(code, instructionPrompt) {
  try {
    const model = await selectModel();
    const combinedPrompt = `${instructionPrompt}\n\nCode to analyze:\n${code}`;
    const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];

    const chatRequest = await model.sendRequest(messages, {});

    let results = "";
    for await (const fragment of chatRequest.text) {
      results += fragment;
    }
    return results;
  } catch (err) {
    // Handle off-topic refusals cleanly
    if (err.message && err.message.includes("off_topic")) {
      return "I cannot analyze this code (Copilot refusal).";
    }
    throw err;
  }
}

async function classifyVoiceIntent(transcript, commands, opts = {}) {
  try {
    const temperature = opts.temperature ?? 0.0;
    const model = await selectModel();

    // System prompt engineered as User message
    const systemInstruction =
      'Output only JSON like {"command": "<id>"}. Reply ONLY with strict minified JSON.';

    const combinedPrompt = `SYSTEM:\n${systemInstruction}\n\nUSER DATA:\n${JSON.stringify(
      { transcript, commands: commands.map((c) => ({ id: c.id })) }
    )}`;

    const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];
    const chatReq = await model.sendRequest(messages, { temperature });

    let text = "";
    for await (const frag of chatReq.text) text += frag;

    const match = text.match(/\{[\s\S]*\}/);
    const candidate = match ? match[0] : text;
    try {
      const parsed = JSON.parse(candidate);
      return parsed.command || "none";
    } catch {
      return "none";
    }
  } catch (err) {
    return "none";
  }
}

async function generateCodeFromVoice(transcript, languageId, indentation = "") {
  try {
    const model = await selectModel();

    const combinedPrompt = `SYSTEM: You are an expert coding assistant. Convert request to valid ${languageId} code. 
    - Return ONLY the code. 
    - No markdown blocks. 
    - No conversational text or explanations.
    \nUSER REQUEST: ${transcript}`;

    const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];

    const chatReq = await model.sendRequest(messages, { temperature: 0.1 });

    let code = "";
    for await (const fragment of chatReq.text) {
      code += fragment;
    }

    // Cleanup any leaked markdown formatting
    return code
      .replace(/^```[a-z]*\n/i, "")
      .replace(/```$/, "")
      .trim();
  } catch (err) {
    throw new Error(`Copilot Error: ${err.message}`);
  }
}

module.exports = {
  determineMode, // Export the new function
  analyzeAI,
  classifyVoiceIntent,
  generateCodeFromVoice,
};
