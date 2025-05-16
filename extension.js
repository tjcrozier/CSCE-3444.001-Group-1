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
  ANNOTATION_PROMPT, // Add this import
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

// Import the chat functionality
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

  // Register chat commands - this replaces all the chat-related code
  // that was previously in the activate function
  const chatViewProvider = registerChatCommands(context, outputChannel);

  // Register Big O commands
  registerBigOCommand(context);

  // Trigger on file save
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "python") {
      handlePythonErrorsOnSave(document.uri.fsPath);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    const document = event.document;

    if (document.languageId !== "python") {
      // Not a Python file, ignore it
      return;
    }

    outputChannel.appendLine("Python file changed: " + document.uri.fsPath);

    if (event.contentChanges.length > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        handlePythonErrorsOnChange(document.uri.fsPath);
      }, 1000);
    }
  });

  // Speech speed control
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode.increaseSpeechSpeed", () => {
      increaseSpeechSpeed();
      vscode.window.showInformationMessage(
        `Speech speed: ${getSpeechSpeed().toFixed(1)}x`
      );
    }),
    vscode.commands.registerCommand("echocode.decreaseSpeechSpeed", () => {
      decreaseSpeechSpeed();
      vscode.window.showInformationMessage(
        `Speech speed: ${getSpeechSpeed().toFixed(1)}x`
      );
    })
  );

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

  let disposableAnnotate = vscode.commands.registerTextEditorCommand(
    "echocode.annotate",
    async (textEditor) => {
      outputChannel.appendLine("echocode.annotate command triggered");

      if (annotationsVisible) {
        clearDecorations();
        annotationQueue.clear();
        annotationsVisible = false;
        vscode.window.showInformationMessage("Annotations cleared");
        return;
      }

      try {
        const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);
        const [model] = await vscode.lm.selectChatModels({
          vendor: "copilot",
          family: "gpt-4o",
        });
        if (!model) {
          vscode.window.showErrorMessage(
            "No language model available. Please ensure Copilot is enabled."
          );
          outputChannel.appendLine("No language model available");
          return;
        }
        const messages = [
          new vscode.LanguageModelChatMessage(0, ANNOTATION_PROMPT),
          new vscode.LanguageModelChatMessage(0, codeWithLineNumbers),
        ];
        const chatResponse = await model.sendRequest(
          messages,
          {},
          new vscode.CancellationTokenSource().token
        );
        await parseChatResponse(chatResponse, textEditor);
        annotationsVisible = true;
        outputChannel.appendLine("Annotations applied successfully");
      } catch (error) {
        outputChannel.appendLine("Error in annotate command: " + error.message);
        vscode.window.showErrorMessage(
          "Failed to annotate code: " + error.message
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

  let speakNextAnnotationDisposable = vscode.commands.registerCommand(
    "echocode.speakNextAnnotation",
    async () => {
      if (!annotationQueue.isEmpty()) {
        const nextAnnotation = annotationQueue.dequeue();
        const message = `Annotation on line ${nextAnnotation.line}: ${nextAnnotation.suggestion}`;
        vscode.window.showInformationMessage(message); // Display the annotation
        await speakMessage(message); // Read the annotation aloud
      } else {
        vscode.window.showInformationMessage("No more annotations to read.");
        await speakMessage("No more annotations to read.");
      }
    }
  );

  let readAllAnnotationsDisposable = vscode.commands.registerCommand(
    "echocode.readAllAnnotations",
    async () => {
      outputChannel.appendLine("Reading all annotations aloud...");
      const annotations = annotationQueue.items;
      if (annotations.length === 0) {
        vscode.window.showInformationMessage(
          "No annotations available to read."
        );
        return;
      }
      for (const annotation of annotations) {
        await speakMessage(
          `Annotation on line ${annotation.line}: ${annotation.suggestion}`
        );
      }
    }
  );

  let classSummary = vscode.commands.registerCommand(
    "echocode.summarizeClass",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        summarizeClass(editor);
      }
    }
  );

  let functionSummary = vscode.commands.registerCommand(
    "echocode.summarizeFunction",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        summarizeFunction(editor);
      }
    }
  );

  let programSummary = vscode.commands.registerCommand(
    "echocode.summarizeProgram",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        summarizeProgram(editor);
      }
    }
  );

  context.subscriptions.push(classSummary, functionSummary, programSummary);

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
    classSummary,
    functionSummary,
    programSummary,
    whereAmI,
    readAllAnnotationsDisposable,
    disposableReadErrors,
    disposableAnnotate,
    stopSpeechDisposable,
    speakNextAnnotationDisposable,
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
