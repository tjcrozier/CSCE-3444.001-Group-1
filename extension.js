const vscode = require("vscode");
const { runPylint } = require("./pylintHandler");
const { speakMessage } = require("./speechHandler");
const { exec } = require("child_process");
const Queue = require("./queue_system"); // Import the Queue class

let outputChannel;
let debounceTimer = null;
let isRunning = false;

const errorQueue = new Queue(); // Create an instance of the Queue class

/**
 * Checks if Pylint is installed.
 */
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

/**
 * Activates the extension.
 */
async function activate(context) {
  outputChannel = vscode.window.createOutputChannel("EchoCode");
  outputChannel.appendLine("EchoCode activated.");
  await ensurePylintInstalled();

  // Trigger on file save
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

      // Clear the previous debounce timer
      if (debounceTimer) {
        console.log("Clearing previous debounce timer");
        clearTimeout(debounceTimer);
      }

      // Set a new debounce timer
      debounceTimer = setTimeout(() => {
        console.log(
          "Debounce timer expired, calling handlePythonErrorsOnChange"
        );
        handlePythonErrorsOnChange(document.uri.fsPath);
      }, 500); // Adjust the delay (in milliseconds) as needed
    }
  });

  // Command to manually trigger error reading
  let disposable = vscode.commands.registerCommand(
    "echocode.readErrors",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        handlePythonErrorsOnSave(editor.document.uri.fsPath);
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Handles Pylint errors on file save.
 */
async function handlePythonErrorsOnSave(filePath) {
  // Prevent overlapping calls
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
    isRunning = false; // Reset the flag
  }
}

/**
 * Handles Pylint errors on text change.
 */
function handlePythonErrorsOnChange(filePath) {
  console.log("handlePythonErrorsOnChange triggered for:", filePath);
  errorQueue.playSound();
}

function deactivate() {
  console.log("EchoCode deactivated.");
}

module.exports = {
  activate,
  deactivate,
};

function deactivate() {
  console.log("EchoCode deactivated.");
}

module.exports = {
  activate,
  deactivate,
};
