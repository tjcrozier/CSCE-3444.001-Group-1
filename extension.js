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

// Error handling
const {
  initializeErrorHandling,
  registerErrorHandlingCommands
} = require("./program_features/ErrorHandling/errorHandler");

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
  annotationQueue,      // Unused?
  ANNOTATION_PROMPT,    // Unused?
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
  initializeErrorHandling(outputChannel);
  outputChannel.appendLine("Pylint installed and initialized.");
  registerErrorHandlingCommands(context);
  outputChannel.appendLine("Error handling commands registered.");

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

  // Navigation commands
  registerWhereAmICommand(context);
  registerMoveCursor(context);

  // Do we need this?
  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, \
    echocode.speakNextAnnotation, echocode.readAllAnnotations, \
    echocode.summarizeClass, echocode.summarizeFunction, \
    echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, \
    echocode.openChat, echocode.startVoiceInput, echocode.loadAssignmentFile, \
    echocode.rescanUserCode, echocode.readNextSequentialTask, \
    echocode.increaseSpeechSpeed, echocode.decreaseSpeechSpeed"
  );
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
