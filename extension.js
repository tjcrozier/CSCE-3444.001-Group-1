const vscode = require("vscode");
const { runPylint } = require("./pylintHandler");
const {
  speakMessage,
  stopSpeaking,
  loadSavedSpeechSpeed,
} = require("./speechHandler");
const { exec } = require("child_process");
const {
  summarizeFunction,
  summarizeClass,
  summarizeProgram,
  registerSummarizerCommands,
} = require("./program_features/Summarizer/summaryGenerator.js");
const { moveCursorToFunction } = require("./navigationHandler");

const { showHotkeyGuide } = require("./hotkeyGuide");
const Queue = require("./program_features/Annotations_BigO/queue_system");
const {
  registerBigOCommand,
} = require("./program_features/Annotations_BigO/bigOAnalysis");
const {
  parseChatResponse,
  applyDecoration,
  clearDecorations,
  getVisibleCodeWithLineNumbers,
  annotationQueue,
  ANNOTATION_PROMPT,
  registerAnnotationCommands,
} = require("./program_features/Annotations_BigO/annotations");

const {
  loadAssignmentFile,
  readNextTask,
  rescanUserCode,
  readNextSequentialTask,
} = require("./program_features/Assignment_Tracker/assignmentTracker");
const {
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
  getSpeechSpeed,
} = require("./speechHandler");
const {
  registerAssignmentTrackerCommands,
} = require("./program_features/Assignment_Tracker/assignmentTracker");

const { registerChatCommands } = require("./program_features/ChatBot/chat_tutor");

let activeDecorations = [];
let annotationsVisible = false;
const { describeCursorPosition } = require("./whereAmI.js");

let outputChannel;
let debounceTimer = null;
let isRunning = false;

function ensurePylintInstalled() {
  return new Promise((resolve, reject) => {
    exec(`python -m pylint --version`, (error) => {
      if (error) {
        vscode.window
          .showErrorMessage(
            "Pylint is not installed. Click here to install it.",
            "Install"
          )
          .then((selection) => {
            if (selection === "Install") {
              vscode.commands.executeCommand("workbench.action.terminal.new");
              vscode.window.showInformationMessage(
                "Run: pip install pylint in the terminal."
              );
            }
          });
        reject("Pylint not installed");
        return;
      }
      resolve(true);
    });
  });
}

async function activate(context) {
  outputChannel = vscode.window.createOutputChannel("EchoCode");
  outputChannel.appendLine("EchoCode activated.");
  loadSavedSpeechSpeed();
  await ensurePylintInstalled();

  // Register assignment tracker commands
  registerAssignmentTrackerCommands(context);

  let hotkeyMenuCommand = vscode.commands.registerCommand(
    "echocode.readHotkeyGuide",
    showHotkeyGuide
  );
  context.subscriptions.push(hotkeyMenuCommand);

  // Register chat commands
  const chatViewProvider = registerChatCommands(context, outputChannel);

  // Register Big O commands
  registerBigOCommand(context);

  // Register annotation commands
  registerAnnotationCommands(context, outputChannel);
  
  // Register summarizer commands
  registerSummarizerCommands(context, outputChannel);

  let disposableReadErrors = vscode.commands.registerCommand(
    "echocode.readErrors",
    () => {
      outputChannel.appendLine("echocode.readErrors command triggered");
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        handlePythonErrorsOnSave(editor.document.uri.fsPath);
      } else {
        vscode.window.showWarningMessage(
          "Please open a Python file to read errors."
        );
      }
    }
  );

  let stopSpeechDisposable = vscode.commands.registerCommand(
    "echocode.stopSpeech",
    async () => {
      const wasSpeaking = stopSpeaking();
      if (wasSpeaking) {
        vscode.window.showInformationMessage("Speech stopped");
        outputChannel.appendLine("Speech stopped by user");
      }
    }
  );

  let whereAmI = vscode.commands.registerCommand("echocode.whereAmI", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === "python") {
      describeCursorPosition(editor);
    }
  });

  let nextFunction = vscode.commands.registerCommand(
    "echocode.jumpToNextFunction",
    () => {
      moveCursorToFunction("next");
    }
  );

  let prevFunction = vscode.commands.registerCommand(
    "echocode.jumpToPreviousFunction",
    () => {
      moveCursorToFunction("previous");
    }
  );

  context.subscriptions.push(
    hotkeyMenuCommand,
    whereAmI,
    disposableReadErrors,
    stopSpeechDisposable,
    nextFunction,
    prevFunction
  );

  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, echocode.openChat, echocode.startVoiceInput, echocode.loadAssignmentFile, echocode.rescanUserCode, echocode.readNextSequentialTask"
  );
}
async function handlePythonErrorsOnSave(filePath) {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    const errors = await runPylint(filePath);
    if (errors.length === 0) {
      vscode.window.showInformationMessage("✅ No issues detected!");
      isRunning = false;
      return;
    }
    outputChannel.appendLine(`📢 Found ${errors.length} Pylint error(s):`);
    for (const error of errors) {
      const message = `Line ${error.line}: ${error.message}`;
      outputChannel.appendLine(message);
      if (error.critical) {
        await speakMessage(message);
      }
    }
    outputChannel.show();
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to run Pylint: ${err}`);
  } finally {
    isRunning = false;
  }
}

async function handlePythonErrors(filePath) {
  try {
    const errors = await runPylint(filePath);
    if (errors.length === 0) {
      vscode.window.showInformationMessage("✅ No issues detected!");
      return;
    }
    outputChannel.appendLine(`📢 Found ${errors.length} Pylint error(s):`);
    for (const error of errors) {
      const message = `Line ${error.line}: ${error.message}`;
      outputChannel.appendLine(message);
    }
    outputChannel.show();
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to run Pylint: ${err}`);
  }
}

function handlePythonErrorsOnChange(filePath) {
  outputChannel.appendLine("Handling Python errors on change for: " + filePath);
}

function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine("EchoCode deactivated.");
    outputChannel.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
