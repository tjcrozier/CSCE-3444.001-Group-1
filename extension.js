const vscode = require('vscode');
const { runPylint } = require('./pylintHandler');
const { speakMessage } = require('./speechHandler');
const { exec } = require('child_process');
const { summarizeFunction, summarizeClass } = require('./summaryGenerator.js');
const { moveCursorToFunction } = require('./navigationHandler');
const Queue = require("./queue_system");

let outputChannel;
let debounceTimer = null;
let isRunning = false;

const annotationQueue = new Queue();

const ANNOTATION_PROMPT = `You are an EchoCode tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you. You will then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

const BASE_PROMPT = `You are a helpful assistant focused on the specific file the user is working on. I will provide the content of the active file below. Your job is to answer questions about that code, providing clear explanations and relevant examples specific to the file’s content. Do not give direct solutions unless explicitly asked, but guide the user to understand and solve their issue themselves. If the user asks a question unrelated to the provided file content or a non-programming question, politely decline to respond. Here is the file content:\n\n`;

const EXERCISES_PROMPT = `You are a helpful assistant focused on the specific file the user is working on. I will provide the content of the active file below. Your job is to provide fun, simple exercises tailored to that code, helping the user practice and improve their understanding of the file’s concepts. Start with simple exercises and increase complexity as the user progresses. Do not move to a new concept until the user provides the correct answer. Offer hints to guide learning, and if the user is stuck, provide the answer with an explanation. If the user asks a question unrelated to the provided file content or a non-programming question, politely decline to respond. Here is the file content:\n\n`;

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

  let chatPanel = null;

  const openChatDisposable = vscode.commands.registerCommand('echocode.openChat', async () => {
    outputChannel.appendLine("echocode.openChat command triggered");

    if (chatPanel) {
      chatPanel.reveal();
      return;
    }

    chatPanel = vscode.window.createWebviewPanel(
      'echoCodeChat', // Identifier
      'EchoCode Tutor', // Title
      vscode.ViewColumn.Beside, // Show next to the editor
      {
        enableScripts: true, // Allow JavaScript in the Webview
      }
    );

    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'chatView.html');
    chatPanel.webview.html = require('fs').readFileSync(htmlPath.fsPath, 'utf8');

    let conversationHistory = [];

    chatPanel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.type === 'userInput') {
          const userInput = message.text;
          const isExercise = userInput.startsWith('/exercise');
          let prompt = isExercise ? EXERCISES_PROMPT : BASE_PROMPT;

          const editor = vscode.window.activeTextEditor;
          let fileContent = '';
          if (editor && editor.document) {
            fileContent = editor.document.getText();
            outputChannel.appendLine("Active file content retrieved for chat");
            prompt += fileContent + "\n\nNow, please answer the user's question or provide an exercise based on this code.";
          } else {
            prompt = `You are a helpful coding assistant. The user has asked: "${userInput}". Since no active file is open, provide a general explanation or ask for more context (e.g., code) to give a specific answer. Do not give direct solutions unless explicitly asked, and guide the user to understand the concept.`;
            outputChannel.appendLine("No active file; using general prompt");
          }

          const messages = [
            vscode.LanguageModelChatMessage.User(prompt),
          ];

          conversationHistory.forEach((entry) => {
            messages.push(vscode.LanguageModelChatMessage.User(entry.user));
            messages.push(vscode.LanguageModelChatMessage.Assistant(entry.response));
          });

          messages.push(vscode.LanguageModelChatMessage.User(userInput));

          const [model] = await vscode.lm.selectChatModels({
            vendor: "copilot",
            family: "gpt-4o",
          });

          if (!model) {
            chatPanel.webview.postMessage({
              type: 'response',
              text: "No language model available. Please ensure GitHub Copilot is enabled."
            });
            outputChannel.appendLine("No language model available for chat");
            return;
          }

          const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
          let responseText = '';
          for await (const fragment of chatResponse.text) {
            responseText += fragment;
          }

          conversationHistory.push({ user: userInput, response: responseText });
          chatPanel.webview.postMessage({
            type: 'response',
            text: responseText
          });
        }
      },
      undefined,
      context.subscriptions
    );

    chatPanel.onDidDispose(() => {
      chatPanel = null;
      conversationHistory = [];
      outputChannel.appendLine("Chat panel disposed");
    }, null, context.subscriptions);
  });

  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "python") {
      handlePythonErrorsOnSave(document.uri.fsPath);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    console.log("onDidChangeTextDocument triggered");
    const document = event.document;

    if (document.languageId === "python" && event.contentChanges.length > 0) {
      console.log(
        "Python document detected with content changes:",
        document.uri.fsPath
      );

      if (debounceTimer) {
        console.log("Clearing previous debounce timer");
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        console.log(
          "Debounce timer expired, calling handlePythonErrorsOnChange"
        );
        handlePythonErrorsOnChange(document.uri.fsPath);
      }, 1000);
    }
  });

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
        outputChannel.appendLine("Annotations applied successfully");
      } catch (error) {
        outputChannel.appendLine("Error in annotate command: " + error.message);
        vscode.window.showErrorMessage(
          "Failed to annotate code: " + error.message
        );
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
      console.log("Reading all annotations aloud...");
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
    'echocode.summarizeClass',  () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'python') {
        summarizeClass(editor);
      }
    }
  );

  let functionSummary = vscode.commands.registerCommand(
    'echocode.summarizeFunction',  () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'python') {
        summarizeFunction(editor);
      }
    }
  );

  let nextFunction = vscode.commands.registerCommand('echocode.jumpToNextFunction', () => {
    moveCursorToFunction("next");
  });

  let prevFunction = vscode.commands.registerCommand('echocode.jumpToPreviousFunction', () => {
    moveCursorToFunction("previous");
  });

  context.subscriptions.push(
    disposableReadErrors,
    disposableAnnotate,
    speakNextAnnotationDisposable,
    readAllAnnotationsDisposable,
    classSummary,
    functionSummary,
    nextFunction,
    prevFunction,
    openChatDisposable
  );
  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction, echocode.openChat"
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
  console.log("Handling Python errors on change for:", filePath);
}

function getVisibleCodeWithLineNumbers(textEditor) {
  let currentLine = textEditor.visibleRanges[0].start.line;
  const endLine = textEditor.visibleRanges[0].end.line;
  let code = "";
  while (currentLine < endLine) {
    code += `${currentLine + 1}: ${
      textEditor.document.lineAt(currentLine).text
    } \n`;
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