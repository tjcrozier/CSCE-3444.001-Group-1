const vscode = require('vscode'); // VSCode API
const { detectCurrentFunction } = require('./codeParser');

function insertSingleDocstring() {
    const editor = vscode.window.activeTextEditor;

    // Ensure there is an editor open
    if(!editor) {
        console.error("No editor open.");
        return;
    }
    
    // Ensure the current document is in Python
    if (editor.document.languageId !== 'python') {
        console.error("EchoCode can only generate docstrings for Python code.");
        return;
    }

    // Attempt to retrieve current function
    const currentFunction = detectCurrentFunction(editor);

    // Cannot insert docstring if the cursor is not in a function
    if (!currentFunction.cursorInFunction) {
        console.error("Cursor is not in a function. No docstring generated.\n");
        return;
    }

    // Otherwise, print the text of the current function to the console (for now)
    const functionText = currentFunction.functionText;
    console.error("Will generate docstring for the following function:")
    console.log("---FUNCTION TEXT---\n", functionText, "\n---END FUNCTION TEXT---\n");
}

module.exports = { insertSingleDocstring };