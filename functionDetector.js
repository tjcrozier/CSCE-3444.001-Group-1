const vscode = require('vscode'); // VSCode API

async function generateDocstring() {
    return "Here is the generated docstring."
}

function detectCurrentFunction(editor) {
    // Get current position of the cursor
    const cursorPos = editor.selection.active;
    const cursorLine = editor.document.lineAt(cursorPos);

    const lineCount = getNumberOfLines(editor);
    console.log("Cursor at line:", cursorLine.lineNumber + 1);

    // Get all text before the cursor position
    const beginPos = new vscode.Position(0, 0); // Beginning of the document
    const range = new vscode.Range(beginPos, cursorPos); 
    const textBeforeCursor = editor.document.getText(range);

    /* Check if cursor is inside a function */

    // Matches Python function definitions
    const funcDefRegEx = /def\s+(\w+)\(.*\):/g;

    // Begin RegEx search at beginning of the document when attempting to
    // generate a new docstring
    funcDefRegEx.lastIndex = 0;

    // Find the last function definition before the position of the cursor
    let match;                  // Store a string matching the RegEx
    let lastMatch = null;       // Store the last string that matches the RegEx
    let lastMatchPos = null;
    
    while ((match = funcDefRegEx.exec(textBeforeCursor)) !== null) {
        lastMatch = match;
        lastMatchPos = match.index;
    }

    // Exit detectFunction() early if no function definitions are detected
    if (!lastMatch) {
        console.log("  No function definition found before cursor. Cursor is not inside of a function\n");
        return null;
    }

    console.log("  Last function definition before cursor:", lastMatch[0]);

    const funcDefPos = editor.document.positionAt(lastMatchPos);
    const funcDefLine = editor.document.lineAt(funcDefPos.line);

    // Get indentation of the function definition
    const funcDefIndentation = countIndentation(funcDefLine);

    console.log("  Function definition on line:", funcDefLine.lineNumber + 1);
    console.log("  Indentation of function definition:", funcDefIndentation);

    let lastLine = null;
    let lastLineNo = funcDefLine.lineNumber;

    for (let i = funcDefLine.lineNumber + 1; i < lineCount; i++) {
        const line = editor.document.lineAt(i);
        const lineIndent = countIndentation(line);
        const lineText = line.text.trim();

        // Skip blank lines
        if (lineText === '') continue; // Skip blank lines

        // Stop at the first line with indentation <= function definition
        if (lineIndent <= funcDefIndentation) {
            break;
        }

        lastLine = line;
        lastLineNo = i;
    }

    // Backtrack to last **non-blank** line (handles empty lines at the end)
    while (lastLineNo > funcDefLine.lineNumber && editor.document.lineAt(lastLineNo).text.trim() === '') {
        lastLineNo--;
        lastLine = editor.document.lineAt(lastLineNo);
    }

    // Log the last line of the function, if it exists
    if (lastLine) {
        console.log("  Last line of function:", lastLine.text);
    } else {
        console.log("  Function appears empty.");
    }

    // Say if the cursor is inside a function
    if (lastLineNo < cursorLine.lineNumber) {
        console.log("Cursor is not inside a function.\n");
    } else {
        console.log("Cursor is inside of", lastMatch[1] + "\(\)\n")
    }
}

/* HELPERS */
function getNumberOfLines(editor) {
    const lines = editor.document.getText().split('\n');
    const lineCount = lines.length;
    console.log("Number of lines in the document:", lineCount);
    return lineCount;
}

function countIndentation(line) {
    const lineText = line.text;

    // Count leading spaces
    let indentation = 0;
    while (lineText[indentation] === ' ') {
        indentation++;
    }

    // If whitespace is tab, count tabs
    if (indentation === 0) {
        while (lineText[indentation] === '\t') {
            indentation++;
        }
    }

    return indentation;
}

module.exports = { detectCurrentFunction };