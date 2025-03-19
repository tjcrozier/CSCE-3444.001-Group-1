const vscode = require('vscode'); // VSCode API
const { detectCurrentFunction } = require('./functionDetector');

function insertDocstring() {
    const editor = vscode.window.activeTextEditor;

    // Ensure there is an editor open
    if(!editor) {
        console.log("No editor open.");
        return;
    }
    
    // Ensure the current document is in Python
    if (editor.document.languageId !== 'python') {
        console.log("EchoCode can only generate docstrings for Python code.");
        return;
    }

    detectCurrentFunction(editor);
}

module.exports = { insertDocstring };