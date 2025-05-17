const vscode = require("vscode");
const { runPylint } = require("../../program_settings/program_settings/pylintHandler");
const { speakMessage } = require("../../program_settings/speech_settings/speechHandler");

let outputChannel;
let isRunning = false;

function initializeErrorHandling(channel) {
  outputChannel = channel;
}

async function handlePythonErrorsOnSave(filePath) {
  if (isRunning) return;
  isRunning = true;

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

module.exports = {
  initializeErrorHandling,
  handlePythonErrorsOnSave,
};