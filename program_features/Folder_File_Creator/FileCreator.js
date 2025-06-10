const vscode = require("vscode");
const {
  speakMessage,
} = require("../../program_settings/speech_settings/speechHandler");
const fs = require("fs");
const path = require("path");

/**
 * Creates a new file, announces its creation, and opens it in the editor.
 */
async function createFile() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    await speakMessage("No workspace folder is open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  // Prompt the user for the file name
  const fileName = await vscode.window.showInputBox({
    prompt: "Enter the name of the new file (e.g., newFile.js):",
  });

  if (!fileName) {
    vscode.window.showInformationMessage("File creation canceled.");
    await speakMessage("File creation canceled.");
    return;
  }

  const filePath = path.join(workspacePath, fileName);

  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`File "${fileName}" already exists.`);
    await speakMessage(`File "${fileName}" already exists.`);
    return;
  }

  // Create the file
  fs.writeFileSync(filePath, "", "utf8");

  // Open the file in the editor
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);

  // Announce the file creation
  vscode.window.showInformationMessage(`File "${fileName}" has been created.`);
  await speakMessage(`File "${fileName}" has been created.`);
}

/**
 * Registers the command to create a file.
 */
function registerFileCreatorCommand(context) {
  const createFileCommand = vscode.commands.registerCommand(
    "echocode.createFile",
    createFile
  );

  context.subscriptions.push(createFileCommand);
}

module.exports = { registerFileCreatorCommand };
