const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const DependencyManager = require("./program_features/Voice/dependencyManager"); // Import manager

const {
  startRecording,
  stopAndTranscribe,
  selectMicrophone, // Import this new function
  isRecording,
} = require("./program_features/Voice/whisperService");

const {
  generateCodeFromVoice,
  determineMode, // Import the new function
} = require("./Core/program_settings/program_settings/AIrequest");

// Helper to map VS Code language IDs to friendly names for LLM
function getFriendlyLanguageName(languageId) {
  const map = {
    cpp: "C++",
    c: "C",
    csharp: "C#",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    html: "HTML",
    css: "CSS",
    php: "PHP",
    ruby: "Ruby",
    go: "Go",
    rust: "Rust",
    swift: "Swift",
    kotlin: "Kotlin",
    sql: "SQL",
    r: "R",
    shellscript: "Shell Script",
    powershell: "PowerShell",
    json: "JSON",
    xml: "XML",
    markdown: "Markdown",
    plaintext: "Pseudocode", // Fallback for plain text
    bat: "Batch file",
    clojure: "Clojure",
    coffeescript: "CoffeeScript",
    dockerfile: "Dockerfile",
    fsharp: "F#",
    groovy: "Groovy",
    handlebars: "Handlebars",
    ini: "Ini",
    lua: "Lua",
    makefile: "Makefile",
    "objective-c": "Objective-C",
    perl: "Perl",
    r: "R",
    scss: "SCSS",
    vb: "Visual Basic",
    yaml: "YAML",
  };
  return map[languageId] || languageId; // Return mapped name or original ID if not found
}

async function tryExecuteVoiceCommand(transcript, outputChannel) {
  try {
    const cleaned = transcript.trim();
    if (!cleaned || cleaned.toLowerCase().includes("no speech detected")) {
      return { handled: true };
    }

    outputChannel.appendLine(`[Voice] Analyzing Intent for: "${cleaned}"...`);

    // 1. ASK AI TO DECIDE THE MODE
    const mode = await determineMode(cleaned);
    outputChannel.appendLine(`[Voice] Determined Mode: ${mode}`);

    // 2. ROUTE BASED ON MODE
    switch (mode) {
      case "COMMAND_EXEC":
        // Pass 'context' as the 3rd argument!
        const cmdId = await ExternalIntentRouter.findExternalCommand(
          cleaned,
          aiService,
          context
        );
        return { handled: true, mode: "command" }; // Placeholder return

      case "CODE_GEN":
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          vscode.window.setStatusBarMessage("EchoCode: Generating...", 3000);
          const generatedCode = await generateCodeFromVoice(
            cleaned,
            editor.document.languageId
          );
          if (generatedCode) {
            await editor.edit((editBuilder) => {
              editBuilder.insert(editor.selection.active, generatedCode);
            });
            return { handled: true, mode: "code" };
          }
        }
        break;

      case "EXPLAIN_FEATURE":
        // Pass specifically to Chat, but maybe prefix with "Explain feature:"
        // The chat tutor can handle this if prompted correctly
        await vscode.commands.executeCommand("echocode.openChat");
        // You'd need a way to pass the message to the chat here
        return { handled: false, mode: "explain" };

      case "CHAT_TUTOR":
      default:
        // Let the webview handle it as a normal chat message
        outputChannel.appendLine(`[Voice] Routing to Chat Tutor.`);
        return { handled: false, mode: "chat" }; // handled: false lets ChatTutor pick it up
    }

    return { handled: false };
  } catch (err) {
    outputChannel.appendLine(`[Voice Error] ${err.message}`);
    return { handled: false };
  }
}

// Python (optional adapter)
const { ensurePylintInstalled } = require("./Language/Python/pylintHandler");
const {
  initializeErrorHandling,
  registerErrorHandlingCommands,
} = require("./Language/Python/errorHandler");
const {
  checkCurrentPythonFile,
} = require("./program_features/C++_Error_Parser/Python_Error_Parser");

// Speech (core)
const {
  speakMessage,
  loadSavedSpeechSpeed,
  registerSpeechCommands,
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
} = require("./Core/program_settings/speech_settings/speechHandler");

// Core features
const {
  registerSummarizerCommands,
} = require("./Core/Summarizer/summaryGenerator.js");
const {
  registerHotkeyGuideCommand,
} = require("./Core/program_settings/guide_settings/hotkeyGuide");
const {
  registerChatCommands,
} = require("./program_features/ChatBot/chat_tutor");

// Navigation + “What’s this”
const {
  registerMoveCursor,
} = require("./navigation_features/navigationHandler");
const { registerWhereAmICommand } = require("./navigation_features/whereAmI");
const {
  registerFileCreatorCommand,
} = require("./program_features/Folder_File_Creator/FileCreator");
const {
  registerFolderCreatorCommand,
} = require("./program_features/Folder_File_Creator/FolderCreator");
const {
  registerFileNavigatorCommand,
} = require("./navigation_features/Folder_File_Navigator/file_navigator");
const {
  initializeFolderList,
  registerFolderNavigatorCommands,
} = require("./navigation_features/Folder_File_Navigator/folder_navigator");
const {
  registerReadCurrentLineCommand,
} = require("./program_features/WhatIsThis/WhatIsThis");
const {
  registerDescribeCurrentLineCommand,
} = require("./program_features/WhatIsThis/DescribeThis");
const {
  registerCharacterReadOutCommand,
} = require("./program_features/WhatIsThis/CharacterReadOut");

const {
  compileCurrentCppFile,
} = require("./program_features/C++_Error_Parser/CPP_Error_Parser");

const {
  connectFile,
  handleCopyFileNameCommand,
  handlePasteImportCommand,
  registerFileConnectorCommands,
} = require("./program_features/FileConnector/File_Connector");

// Big-O + Annotations
const {
  registerBigOCommand,
} = require("./program_features/Annotations_BigO/bigOAnalysis");
const {
  registerAnnotationCommands,
} = require("./program_features/Annotations_BigO/annotations");

// Assignment tracker
const {
  registerAssignmentTrackerCommands,
} = require("./program_features/Assignment_Tracker/assignmentTracker");

let outputChannel;

const copilotExtensionIds = [
  "GitHub.copilot",
  "GitHub.copilot-nightly",
  "GitHub.copilot-chat",
];

async function ensureCopilotActivated(channel) {
  const copilotExtension = copilotExtensionIds
    .map((id) => vscode.extensions.getExtension(id))
    .find(Boolean);

  if (!copilotExtension) {
    channel.appendLine(
      "[EchoCode] Warning: GitHub Copilot / Copilot Chat extension not found. AI features will be unavailable."
    );
    return null;
  }

  if (!copilotExtension.isActive) {
    channel.appendLine("[EchoCode] Activating GitHub Copilot dependency...");
    await copilotExtension.activate();
  }

  return copilotExtension;
}

async function activate(context) {
  outputChannel = vscode.window.createOutputChannel("EchoCode");
  outputChannel.appendLine("[EchoCode] Activated");

  // --- DEPENDENCY CHECK START ---
  // This runs once on startup and ensures the venv exists
  const depManager = new DependencyManager(context, outputChannel);
  // We don't await this blocking if we want faster startup,
  // but for safety we await to ensure python is ready before first voice command
  depManager.ensureDependencies().catch((err) => {
    outputChannel.appendLine(`[Dependency Error] ${err.message}`);
  });
  // --- DEPENDENCY CHECK END ---

  // Speech prefs
  loadSavedSpeechSpeed();

  // Register core commands first (code-agnostic)
  // Register core commands first (code-agnostic)
  registerSpeechCommands(context, outputChannel);
  registerSummarizerCommands(context, outputChannel);
  registerHotkeyGuideCommand(context);
  const chatProvider = registerChatCommands(context, outputChannel);

  // Inside activate(context)...
  const ExternalIntentRouter = require("./Core/program_settings/program_settings/ExternalIntentRouter");

  // Pre-build index on startup so it's ready when user speaks
  ExternalIntentRouter.buildIndex(context);

  // start recording (no transcript yet)
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode._voiceStart", async () => {
      // Pass 'context' so we can access globalState for microphone settings
      startRecording(outputChannel, context);
    })
  );

  // New command to change microphone manually
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode.selectMicrophone", async () => {
      await selectMicrophone(context);
    })
  );

  // Toggle Voice Command
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode.toggleVoice", async () => {
      if (isRecording()) {
        // Sync UI: Stop immediately
        if (chatProvider) chatProvider.setRecordingState(false);

        // Announce processing (don't await to avoid blocking stop)
        speakMessage("Processing");

        const result = await vscode.commands.executeCommand(
          "echocode._voiceStop"
        );

        if (result && result.ok && result.text) {
          // Attempt to execute as a voice command first
          const voiceResult = await tryExecuteVoiceCommand(
            result.text,
            outputChannel
          );

          if (!voiceResult.handled) {
            // Fallback: Send to Chat Tutor
            await vscode.commands.executeCommand("echocode.openChat");
            if (chatProvider) {
              await chatProvider.handleUserMessage(result.text);
            }
          }
        }
      } else {
        // Sync UI: Start immediately
        if (chatProvider) chatProvider.setRecordingState(true);

        await speakMessage("Listening");
        await vscode.commands.executeCommand("echocode._voiceStart");
      }
    })
  );

  // stop recording and transcribe (returns text)
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode._voiceStop", async () => {
      try {
        // Pass context.globalState so we know where the venv python is
        const text = await stopAndTranscribe(
          outputChannel,
          context.globalState
        );
        return { ok: true, text };
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        vscode.window.showErrorMessage("EchoCode Whisper STT error: " + msg);
        outputChannel.appendLine("[Whisper] Error: " + msg);
        return { ok: false, error: msg };
      }
    })
  );
  registerBigOCommand(context);
  registerAnnotationCommands(context, outputChannel);
  registerAssignmentTrackerCommands(context);
  registerWhereAmICommand(context);
  registerMoveCursor(context);
  registerFileCreatorCommand(context);
  registerFolderCreatorCommand(context);
  registerFileNavigatorCommand(context);
  registerFolderNavigatorCommands(context);

  // What is this commands
  registerReadCurrentLineCommand(context);
  registerDescribeCurrentLineCommand(context);
  registerCharacterReadOutCommand(context);

  // Register file connector commands
  registerFileConnectorCommands(context, vscode);

  // Register C++ compilation command
  const compileCppCommand = vscode.commands.registerCommand(
    "echocode.compileAndParseCpp",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "cpp") {
        compileCurrentCppFile(editor.document.uri.fsPath);
      } else {
        vscode.window.showInformationMessage(
          "This command is only available for C++ files."
        );
      }
    }
  );
  context.subscriptions.push(compileCppCommand);

  // Register Python error checking command
  const checkPythonCommand = vscode.commands.registerCommand(
    "echocode.checkPythonErrors",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        checkCurrentPythonFile(editor.document.uri.fsPath);
      } else {
        vscode.window.showInformationMessage(
          "This command is only available for Python files."
        );
      }
    }
  );
  context.subscriptions.push(checkPythonCommand);

  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, echocode.openChat, echocode.startVoiceInput, echocode.loadAssignmentFile, echocode.rescanUserCode, echocode.readNextSequentialTask, echocode.increaseSpeechSpeed, echocode.decreaseSpeechSpeed, echocode.moveToNextFolder, echocode.moveToPreviousFolder"
  );

  // Guidance level commands - for controlling how verbose/guided the AI responses are across features that use AI (summarizer, big O, annotations, what's this)
  const setGuidanceLevelCommand = vscode.commands.registerCommand(
    "echocode.setGuidanceLevel",
    async () => {
      // Show a quick pick to select the guidance level
      const pick = await vscode.window.showQuickPick(
        [
          {
            label: "Guided",
            value: "guided",
            detail: "Step-by-step, minimal jargon",
          },
          {
            label: "Balanced",
            value: "balanced",
            detail: "Rule + a couple fix options",
          },
          {
            label: "Concise",
            value: "concise",
            detail: "Technical, raw error included",
          },
        ],
        { placeHolder: "Choose EchoCode Guidance Level" }
      );

      if (!pick) return;

      await vscode.workspace
        .getConfiguration("echocode")
        .update("guidanceLevel", pick.value, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(
        `EchoCode guidance level set to ${pick.label}.`
      );
    }
  );

  // Optional: command to cycle through guidance levels quickly
  const cycleGuidanceLevelCommand = vscode.commands.registerCommand(
    "echocode.cycleGuidanceLevel",
    // Cycles through guided -> balanced -> concise -> back to guided
    async () => {
      const config = vscode.workspace.getConfiguration("echocode");
      const current = config.get("guidanceLevel", "balanced");

      const order = ["guided", "balanced", "concise"];
      const idx = order.indexOf(current);
      const next =
        order[
          (idx >= 0 ? idx : 1) + 1 >= order.length
            ? 0
            : (idx >= 0 ? idx : 1) + 1
        ];

      await config.update(
        "guidanceLevel",
        next,
        vscode.ConfigurationTarget.Global
      );

      const label =
        next === "guided"
          ? "Guided"
          : next === "balanced"
          ? "Balanced"
          : "Concise";

      vscode.window.showInformationMessage(`EchoCode guidance level: ${label}`);

      // Optional: speak confirmation (uses your existing TTS setup)
      try {
        // speakMessage is not imported in extension.js, so require it here
        const {
          speakMessage,
        } = require("./Core/program_settings/speech_settings/speechHandler");
        await speakMessage(`Guidance level set to ${label}.`);
      } catch (_) {
        // If TTS unavailable, silently ignore
      }
    }
  );

  context.subscriptions.push(cycleGuidanceLevelCommand);

  context.subscriptions.push(setGuidanceLevelCommand);

  // Initialize folder list when the extension starts
  initializeFolderList();

  // Listen for workspace folder changes and reinitialize the folder list
  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    outputChannel.appendLine(
      "Workspace folders changed. Reinitializing folder list..."
    );
    initializeFolderList();
  });
}

function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine("[EchoCode] Deactivated");
    outputChannel.dispose();
  }
}

module.exports = { activate, deactivate, tryExecuteVoiceCommand };
