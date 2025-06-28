const vscode = require("vscode");
const {
  speakMessage,
} = require("../../program_settings/speech_settings/speechHandler");

let currentFileIndex = 0;

/**
 * Navigates to the next file in the workspace and announces its name.
 */
async function navigateToNextFile() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    await speakMessage("No workspace folder is open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  // Get all files in the workspace
  const files = await vscode.workspace.findFiles("**/*", "**/node_modules/**");

  if (files.length === 0) {
    vscode.window.showErrorMessage("No files found in the workspace.");
    await speakMessage("No files found in the workspace.");
    return;
  }

  // Navigate to the next file
  currentFileIndex = (currentFileIndex + 1) % files.length;
  const nextFile = files[currentFileIndex];

  // Open the file in the editor
  const document = await vscode.workspace.openTextDocument(nextFile);
  await vscode.window.showTextDocument(document);

  // Announce the file name
  const fileName = nextFile.path.split("/").pop();
  vscode.window.showInformationMessage(`Navigated to file: ${fileName}`);
  await speakMessage(`Navigated to file: ${fileName}`);
}

/**
 * Registers the command to navigate to the next file.
 */
function registerFileNavigatorCommand(context) {
  const navigateCommand = vscode.commands.registerCommand(
    "echocode.navigateToNextFile",
    navigateToNextFile
  );

  context.subscriptions.push(navigateCommand);
}

module.exports = { registerFileNavigatorCommand };
