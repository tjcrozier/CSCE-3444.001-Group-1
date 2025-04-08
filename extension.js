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

const BASE_PROMPT = 'You are a helpful assistant focused on the specific file the user is working on. Your job is to answer questions about the code in the active file, providing clear explanations and relevant examples specific to that file’s content. Do not give direct solutions unless asked, but guide the user to understand and solve their issue themselves. If the user asks a question unrelated to the active file or a non-programming question, politely decline to respond.';

const EXERCISES_PROMPT = 'You are a helpful assistant focused on the specific file the user is working on. Your job is to provide fun, simple exercises tailored to the code in the active file, helping the user practice and improve their understanding of that file’s concepts. Start with simple exercises and increase complexity as the user progresses. Do not move to a new concept until the user provides the correct answer. Offer hints to guide learning, and if the user is stuck, provide the answer with an explanation. If the user asks a question unrelated to the active file or a non-programming question, politely decline to respond.';

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

  const handler = async (request, chatContext, stream, token) => {
    try {
      let prompt = BASE_PROMPT;

      if (request.command === 'exercise') {
        prompt = EXERCISES_PROMPT;
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(prompt),
      ];

      const previousMessages = chatContext.history.filter(
        (h) => h instanceof vscode.ChatResponseTurn
      );

      previousMessages.forEach((m) => {
        let fullMessage = '';
        m.response.forEach((r) => {
          const mdPart = r;
          fullMessage += mdPart.value.value;
        });
        messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
      });

      messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

      const [model] = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "gpt-4o",
      });

      if (!model) {
        stream.markdown("No language model available. Please ensure GitHub Copilot is enabled.");
        outputChannel.appendLine("No language model available for chat");
        return;
      }

      const chatResponse = await model.sendRequest(messages, {}, token);

      for await (const fragment of chatResponse.text) {
        stream.markdown(fragment);
      }
    } catch (error) {
      stream.markdown("Sorry, I encountered an error while processing your request.");
      outputChannel.appendLine(`Chat handler error: ${error.message}`);
    }
  };

  let tutor;
  try {
    tutor = vscode.chat.createChatParticipant("echocode.tutor", handler);
    try {
      const iconPath = vscode.Uri.joinPath(context.extensionUri, 'tutor.jpeg');
      const fs = require('fs');
      if (fs.existsSync(iconPath.fsPath)) {
        tutor.iconPath = iconPath;
        outputChannel.appendLine("Chat participant icon set to tutor.jpeg");
      } else {
        outputChannel.appendLine("tutor.jpeg not found; using default icon");
      }
    } catch (iconError) {
      outputChannel.appendLine(`Failed to set chat icon: ${iconError.message}`);
    }
    outputChannel.appendLine("Chat participant echocode.tutor registered successfully");
  } catch (error) {
    outputChannel.appendLine(`Failed to register chat participant: ${error.message}`);
    vscode.window.showErrorMessage("Failed to initialize EchoCode Tutor chat.");
  }

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
    tutor
  );
  outputChannel.appendLine(
    "Commands registered: echocode.readErrors, echocode.annotate, echocode.speakNextAnnotation, echocode.readAllAnnotations, echocode.summarizeClass, echocode.summarizeFunction, echocode.jumpToNextFunction, echocode.jumpToPreviousFunction"
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