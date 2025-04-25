const vscode = require("vscode");
const { runPylint } = require("./pylintHandler");
const { speakMessage, stopSpeaking } = require("./speechHandler");
const { exec } = require("child_process");
const { summarizeFunction, summarizeClass } = require("./summaryGenerator.js");
const { moveCursorToFunction } = require("./navigationHandler");

const Queue = require("./queue_system");
const { registerBigOCommand } = require("./bigOAnalysis");

const {
  loadAssignmentFile,
  readNextTask,
  markTaskComplete,
} = require("./assignmentTracker");
const {
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
  getSpeechSpeed,
} = require("./speechHandler");

let activeDecorations = [];
let annotationsVisible = false;

let outputChannel;
let debounceTimer = null;
let isRunning = false;
let chatViewProvider = null;

const annotationQueue = new Queue();

const ANNOTATION_PROMPT = `You are an EchoCode tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you. You will then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

const BASE_PROMPT = `You are a friendly and helpful coding tutor named EchoCode. Your goal is to help students learn programming in a conversational and encouraging way. When responding:

1. Use a friendly, conversational tone as if you're having a one-on-one chat
2. Be encouraging and supportive, even when pointing out areas for improvement
3. Break down complex concepts into simple, easy-to-understand explanations
4. Use analogies and examples to make technical concepts more relatable
5. Ask follow-up questions to check understanding
6. Be patient and willing to explain things multiple times if needed
7. Keep responses concise but warm and engaging
8. Use natural language - avoid sounding like a textbook
10. When giving feedback, use the "sandwich" method: start with something positive, then suggest improvements, and end with encouragement

Remember to:
- Keep responses at a MAXIMUM of 4 sentences as concise as reasonable
- Format responses for text-to-speech (avoid markdown and code blocks)
- Focus on the specific file the user is working on
- Politely decline non-programming or non-Python questions
- Guide users to solve problems themselves rather than giving complete solutions

Below is the content of the active file. Here is the file content:\n\n`;

// Mock voice recognition for demo/development purposes
function performVoiceRecognition() {
  return new Promise((resolve) => {
    // Simulate voice recognition with a short delay
    setTimeout(() => {
      resolve("Can you explain this Python code?");
    }, 2000);
  });
}

// Custom WebViewProvider for the chat view
class EchoCodeChatViewProvider {
  constructor(context) {
    this.context = context;
    this._view = null;
    this.conversationHistory = [];
    this._isListening = false;
  }

  resolveWebviewView(webviewView, context, token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Set the initial HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        outputChannel.appendLine(
          `Received message from webview: ${message.type}`
        );
        if (message.type === "userInput") {
          await this.handleUserMessage(message.text);
        } else if (message.type === "startVoiceRecognition") {
          await this.startVoiceRecognition();
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  async startVoiceRecognition() {
    if (this._isListening || !this._view) return;

    this._isListening = true;
    outputChannel.appendLine("Starting voice recognition");

    // Signal the webview that we're listening
    this._view.webview.postMessage({ type: "voiceListeningStarted" });

    try {
      const recognizedText = await performVoiceRecognition();

      if (recognizedText && this._view) {
        // Send the recognized text to the webview to display in the input field
        this._view.webview.postMessage({
          type: "voiceRecognitionResult",
          text: recognizedText,
        });

        // Don't automatically process the recognized text
        // Let the user press enter to send it
      }
    } catch (error) {
      outputChannel.appendLine(`Voice recognition error: ${error.message}`);
      if (this._view) {
        this._view.webview.postMessage({
          type: "voiceRecognitionError",
          error: error.message,
        });
      }
    } finally {
      this._isListening = false;
      if (this._view) {
        this._view.webview.postMessage({ type: "voiceListeningStopped" });
      }
    }
  }

  async handleUserMessage(userInput) {
    if (!this._view) return;
    let prompt = BASE_PROMPT;

    // Try to get an active Python editor
    let editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      !editor.document ||
      editor.document.languageId !== "python"
    ) {
      const visibleEditors = vscode.window.visibleTextEditors;
      editor = visibleEditors.find(
        (ed) => ed.document && ed.document.languageId === "python"
      );
      outputChannel.appendLine(
        editor
          ? "Found a visible Python editor: " + editor.document.fileName
          : "No active or visible Python editor found."
      );
    } else {
      outputChannel.appendLine("Active editor: " + editor.document.fileName);
    }

    let fileContent = "";
    if (editor && editor.document) {
      fileContent = editor.document.getText();
      outputChannel.appendLine("Active file content retrieved for chat");
    } else {
      this._view.webview.postMessage({
        type: "response",
        text: "No active Python file is open. Please open a Python file to get help with its code.",
      });
      outputChannel.appendLine("No active Python file found for chat");
      return;
    }

    prompt +=
      fileContent +
      "\n\nNow, please answer the user's question or provide an exercise based on this code.";

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];

    this.conversationHistory.forEach((entry) => {
      messages.push(vscode.LanguageModelChatMessage.User(entry.user));
      messages.push(vscode.LanguageModelChatMessage.Assistant(entry.response));
    });

    messages.push(vscode.LanguageModelChatMessage.User(userInput));

    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    if (!model) {
      this._view.webview.postMessage({
        type: "response",
        text: "No language model available. Please ensure GitHub Copilot is enabled.",
      });
      outputChannel.appendLine("No language model available for chat");
      return;
    }

    // Show loading indicator
    this._view.webview.postMessage({ type: "responseLoading", started: true });

    try {
      const chatResponse = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );
      let responseText = "";

      // Create a cancellation token source for speech
      const speechCancellationToken = new vscode.CancellationTokenSource();

      for await (const fragment of chatResponse.text) {
        responseText += fragment;
        // Send incremental updates to the webview
        this._view.webview.postMessage({
          type: "responseFragment",
          text: fragment,
        });
      }

      this.conversationHistory.push({
        user: userInput,
        response: responseText,
      });
      this._view.webview.postMessage({
        type: "responseComplete",
        text: responseText,
      });
      outputChannel.appendLine("Chat response: " + responseText);

      // Speak the chat response aloud using speechHandler
      // Check if speech hasn't been cancelled
      if (!speechCancellationToken.token.isCancellationRequested) {
        await speakMessage(responseText);
      }
    } catch (error) {
      outputChannel.appendLine(`Error getting response: ${error.message}`);
      this._view.webview.postMessage({
        type: "responseError",
        error: `Error: ${error.message}`,
      });
    } finally {
      this._view.webview.postMessage({
        type: "responseLoading",
        started: false,
      });
    }
  }

  startVoiceInput() {
    if (this._view) {
      this.startVoiceRecognition();
    } else {
      vscode.window.showInformationMessage(
        "Please open the EchoCode Tutor view to use voice input."
      );
      outputChannel.appendLine(
        "Voice input command invoked with no active chat view."
      );
    }
  }

  _getHtmlForWebview(webview) {
    // Create URI for styles and scripts
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "chat.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "chat.js")
    );

    // Generate a nonce to use for inline script
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>EchoCode Tutor</title>
    </head>
    <body>
        <div id="chat-container">
            <div id="messages-container"></div>
            <div id="input-container">
                <textarea id="user-input" placeholder="Ask a question about your code..."></textarea>
                <div id="button-container">
                    <button id="send-button" title="Send message" class="icon-button">
                        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M8.08073 5.36896L11.8807 4.06896L10.5807 7.86896L8.08073 5.36896ZM13.1399 2.81L3.1399 7.81C2.9899 7.88 2.9099 8.05 2.9399 8.21C2.9699 8.38 3.0999 8.5 3.2699 8.5H7.9999V13.24C7.9999 13.4 8.1299 13.54 8.2999 13.56C8.3099 13.56 8.3199 13.56 8.3299 13.56C8.4799 13.56 8.6199 13.48 8.6899 13.35L13.6899 3.35C13.7599 3.19 13.7399 3 13.6399 2.87C13.5399 2.74 13.3499 2.69 13.1799 2.76L13.1399 2.81Z"/>
                        </svg>
                    </button>
                    <button id="voice-button" title="Start voice input" class="icon-button">
                        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M8 10.9844C9.46875 10.9844 10.4844 9.95312 10.4844 8V3C10.4844 1.04688 9.45312 0 8 0C6.53125 0 5.51562 1.04688 5.51562 3V8C5.51562 9.95312 6.53125 10.9844 8 10.9844ZM4 5.51562V8C4 10.7344 5.71875 12.4844 8.25 12.4844C10.7812 12.4844 12.5 10.7344 12.5 8V5.51562H14V8C14 11.4062 11.7812 13.5156 9 13.9375V16H7V13.9375C4.21875 13.5156 2 11.4062 2 8V5.51562H4Z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="status-container">
                <div id="listening-indicator" class="status-indicator hidden">
                    Listening...
                </div>
                <div id="loading-indicator" class="status-indicator hidden">
                    Thinking...
                </div>
            </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

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
  await ensurePylintInstalled();

  // Register chat view provider
  chatViewProvider = new EchoCodeChatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "echocode.chatView",
      chatViewProvider
    )
  );

  // Register the command to open the chat panel (will now focus the sidebar view)
  const openChatDisposable = vscode.commands.registerCommand(
    "echocode.openChat",
    async () => {
      outputChannel.appendLine("echocode.openChat command triggered");
      // Focus on the webview if it exists
      await vscode.commands.executeCommand("echocode.chatView.focus");
    }
  );

  // Register a new command to start voice input
  const startVoiceInputDisposable = vscode.commands.registerCommand(
    "echocode.startVoiceInput",
    () => {
      if (chatViewProvider) {
        chatViewProvider.startVoiceInput();
      } else {
        vscode.window.showInformationMessage(
          "Please open the EchoCode Tutor view to use voice input."
        );
        outputChannel.appendLine(
          "Voice input command invoked with no active chat view."
        );
      }
    }
  );

  // Register Big O commands
  registerBigOCommand(context);

  // Trigger on file save

  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "python") {
      handlePythonErrorsOnSave(document.uri.fsPath);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    outputChannel.appendLine(
      "onDidChangeTextDocument triggered for: " + event.document.uri.fsPath
    );
    const document = event.document;

    if (document.languageId === "python" && event.contentChanges.length > 0) {
      outputChannel.appendLine(
        "Python document detected with content changes: " + document.uri.fsPath
      );

      if (debounceTimer) {
        outputChannel.appendLine("Clearing previous debounce timer");
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        outputChannel.appendLine(
          "Debounce timer expired, calling handlePythonErrorsOnChange for: " +
            document.uri.fsPath
        );
        handlePythonErrorsOnChange(document.uri.fsPath);
      }, 1000);
    }
  });

  //Speech speed control
  context.subscriptions.push(
    vscode.commands.registerCommand("echocode.increaseSpeechSpeed", () => {
      increaseSpeechSpeed();
      vscode.window.showInformationMessage(
        `Speech speed: ${getSpeechSpeed().toFixed(1)}x`
      );
    })
  );

  context.subscriptions.push(
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

      // If annotations are visible, clear them
      if (annotationsVisible) {
        clearDecorations();
        annotationQueue.clear(); // Assuming your Queue class has a clear method
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
      // Call the stopSpeaking function from your speechHandler
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
        await speakMessage(
          `Annotation on line ${nextAnnotation.line}: ${nextAnnotation.suggestion}`
        );
      } else {
        vscode.window.showInformationMessage("No more annotations to read.");
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

  // Summarize the current class
  let classSummary = vscode.commands.registerCommand(
    "echocode.summarizeClass",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        summarizeClass(editor);
      }
    }
  );

  // Summarize the current function
  let functionSummary = vscode.commands.registerCommand(
    "echocode.summarizeFunction",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        summarizeFunction(editor);
      }
    }
  );

  // Add navigation commands
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
    readAllAnnotationsDisposable,
    disposableReadErrors,
    disposableAnnotate,
    speakNextAnnotationDisposable,
    classSummary,
    functionSummary,
    nextFunction,
    prevFunction,
    openChatDisposable,
    startVoiceInputDisposable,
    stopSpeechDisposable,
    vscode.commands.registerCommand(
      "echocode.loadAssignmentFile",
      loadAssignmentFile
    ),
    vscode.commands.registerCommand("echocode.readNextTask", readNextTask),
    vscode.commands.registerCommand(
      "echocode.markTaskComplete",
      markTaskComplete
    )
  );

  context.subscriptions.push(classSummary, functionSummary);

  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, echocode.openChat, echocode.startVoiceInput"
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

function getVisibleCodeWithLineNumbers(textEditor) {
  let currentLine = textEditor.visibleRanges[0].start.line;
  const endLine = textEditor.visibleRanges[0].end.line;
  let code = "";
  while (currentLine < endLine) {
    code += `${currentLine + 1}: ${
      textEditor.document.lineAt(currentLine).text
    }\n`;
    currentLine++;
  }
  return code;
}

async function parseChatResponse(chatResponse, textEditor) {
  let accumulatedResponse = "";
  for await (const fragment of chatResponse.text) {
    accumulatedResponse += fragment;
    if (fragment.includes("}")) {
      try {
        const annotation = JSON.parse(accumulatedResponse);
        applyDecoration(textEditor, annotation.line, annotation.suggestion);
        const annotationData = {
          line: annotation.line,
          suggestion: annotation.suggestion,
        };
        annotationQueue.enqueue(annotationData);
        accumulatedResponse = "";
      } catch {
        // Wait for more fragments if JSON parsing fails
      }
    }
  }
}

function applyDecoration(editor, line, suggestion) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: ` ${suggestion.substring(0, 25) + "..."}`,
      color: "grey",
    },
  });
  const lineLength = editor.document.lineAt(line - 1).text.length;
  const range = new vscode.Range(
    new vscode.Position(line - 1, lineLength),
    new vscode.Position(line - 1, lineLength)
  );
  editor.setDecorations(decorationType, [
    { range: range, hoverMessage: suggestion },
  ]);

  // Store the decoration for later removal
  activeDecorations.push({
    decorationType,
    editor,
  });
}

function clearDecorations() {
  for (const decoration of activeDecorations) {
    decoration.editor.setDecorations(decoration.decorationType, []);
  }
  activeDecorations = [];
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
