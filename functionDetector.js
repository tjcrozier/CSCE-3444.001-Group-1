const vscode = require('vscode'); // VSCode API

function detectCurrentFunction(editor) {
    // Get current position of the cursor
    const cursorPos = editor.selection.active;
    const cursorLine = editor.document.lineAt(cursorPos);

    // Get number of lines in the document
    const lineCount = getNumberOfLines(editor);
    console.log("Cursor at line:", cursorLine.lineNumber + 1);

    /* Check if cursor is inside a function */

    // Detect the beginning of the current function
    const funcDefLine = detectFunctionStart(editor, cursorPos);

    // Detect the end of the current function
    const funcEndLine = detectFunctionEnd(editor, funcDefLine, lineCount, cursorLine);

    // Say if the cursor is inside a function
    if (!funcEndLine || funcEndLine.lineNumber < cursorLine.lineNumber) {
        console.log("Cursor is not inside a function.\n");
        return null;
    } else {
        console.log("Cursor is inside of", funcDefLine.text + "\n");
    }

    // Retrieve function text
    return getFunctionText(editor, funcDefLine, funcEndLine);
}

/* HELPERS */
function getNumberOfLines(editor) {
    const lines = editor.document.getText().split('\n');
    const lineCount = lines.length;
    console.log("Number of lines in the document:", lineCount);
    return lineCount;
}

function detectFunctionStart(editor, cursorPos) {
    // Get all text before the cursor position
    const beginPos = new vscode.Position(0, 0); // Beginning of the document
    const range = new vscode.Range(beginPos, cursorPos); 
    const textBeforeCursor = editor.document.getText(range);

    // Matches Python function definitions
    const funcDefRegEx = /def\s+(\w+)\(.*\):/g;

    // Begin RegEx search at beginning of the document
    funcDefRegEx.lastIndex = 0;

    // Find the last function definition before the position of the cursor
    let match;                  // Store a string matching the RegEx
    let lastMatch = null;       // Store the last string that matches the RegEx
    let lastMatchPos = null;
    
    while ((match = funcDefRegEx.exec(textBeforeCursor)) !== null) {
        lastMatch = match;
        lastMatchPos = match.index;
    }

    // Exit detectFunctionStart() early if no function definitions are detected
    if (!lastMatch) {
        console.log("  No function definition found before cursor. Cursor is not inside of a function\n");
        return null;
    }

    console.log("  Last function definition before cursor:", lastMatch[0]);

    const funcDefPos = editor.document.positionAt(lastMatchPos);
    const funcDefLine = editor.document.lineAt(funcDefPos.line);

    return funcDefLine;
}

function detectFunctionEnd(editor, funcDefLine, lineCount, cursorLine) {
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
    if (lastLine.lineNumber < cursorLine.lineNumber) {
        console.log("Cursor is not inside a function.\n");
        return null;
    } else {
        console.log("Cursor is inside of", funcDefLine.text + "\n");
        return lastLine;
    }    
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

function getFunctionText(editor, funcDefLine, funcEndLine) {
    while(funcEndLine) {
        // Convert line numbers to Positions
        const funcStartPos = editor.document.lineAt(funcDefLine.lineNumber).range.start;
        const funcEndPos = editor.document.lineAt(funcEndLine.lineNumber).range.end;

        // Create a range from start to end of the function
        const range = new vscode.Range(funcStartPos, funcEndPos); 
        const functionText = editor.document.getText(range);

        return functionText;
    }

    return null;
}


module.exports = { detectCurrentFunction };