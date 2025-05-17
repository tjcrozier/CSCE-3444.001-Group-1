const vscode = require("vscode");

// Set up and run Pylint
const {
  ensurePylintInstalled, runPylint,
} = require("./program_settings/program_settings/pylintHandler");

const {
  speakMessage,
  stopSpeaking,
  loadSavedSpeechSpeed,
  registerSpeechCommands,
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
} = require("./program_settings/speech_settings/speechHandler");

const {
  registerSummarizerCommands,
} = require("./program_features/Summarizer/summaryGenerator.js");

const {
  registerHotkeyGuideCommand,
} = require("./program_settings/guide_settings/hotkeyGuide");
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
  registerAssignmentTrackerCommands,
} = require("./program_features/Assignment_Tracker/assignmentTracker");

const {
  registerChatCommands,
} = require("./program_features/ChatBot/chat_tutor");

// Navigation features
const {registerMoveCursor} = require("./navigation_features/navigationHandler");
const {registerWhereAmICommand} = require("./navigation_features/whereAmI");

let activeDecorations = [];
let annotationsVisible = false;

let outputChannel;
let debounceTimer = null;
let isRunning = false;

async function activate(context) {
  outputChannel = vscode.window.createOutputChannel("EchoCode");
  outputChannel.appendLine("EchoCode activated.");
  loadSavedSpeechSpeed();
  await ensurePylintInstalled();

  // Register assignment tracker commands
  registerAssignmentTrackerCommands(context);

  // Register hotkey guide command
  registerHotkeyGuideCommand(context);

  // Register chat commands
  const chatViewProvider = registerChatCommands(context, outputChannel);

  // Register Big O commands
  registerBigOCommand(context);

  // Register annotation commands
  registerAnnotationCommands(context, outputChannel);

  // Register summarizer commands
  registerSummarizerCommands(context, outputChannel);

  // Register speech commands
  registerSpeechCommands(context, outputChannel);

  // Trigger on file save
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "python") {
      handlePythonErrorsOnSave(document.uri.fsPath);
    }
  });

  let readErrors = vscode.commands.registerCommand(
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

  // Navigation commands
  registerWhereAmICommand(context);
  registerMoveCursor(context);

  context.subscriptions.push(
    readErrors,
  );

  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, echocode.openChat, echocode.startVoiceInput, echocode.loadAssignmentFile, echocode.rescanUserCode, echocode.readNextSequentialTask, echocode.increaseSpeechSpeed, echocode.decreaseSpeechSpeed"
  );
}

async function handlePythonErrorsOnSave(filePath) {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    const errors = await runPylint(filePath, outputChannel);
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
    const errors = await runPylint(filePath, outputChannel);
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
