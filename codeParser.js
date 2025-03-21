const vscode = require('vscode'); // VSCode API

function detectCurrentFunction(editor) {
    // To store the function as an object. definition and last line are stored
    // as vscode line objects
    const functionObject = {
        definition: null,
        lastLine: null,
        functionText: "No function text found",
        cursorInFunction: true
    };

    // Get current position of the cursor
    const cursorPos = editor.selection.active;
    const cursorLine = editor.document.lineAt(cursorPos);
    console.log("Cursor at line:", cursorLine.lineNumber + 1);

    // Detect the last function definition before the cursor
    functionObject.definition = detectFunctionStart(editor, cursorPos);

    // If no function definition was found, return default values
    if (!functionObject.definition) {
        functionObject.cursorInFunction = false;
        return functionObject;
    }

    // Detect the end of the current function
    functionObject.lastLine = detectFunctionEnd(
        editor, functionObject.definition
    );

    // If the cursor is after the last line of the function, it is not inside a
    // function
    if (cursorLine.lineNumber > functionObject.lastLine.lineNumber) {
        functionObject.cursorInFunction = false;
        return functionObject;
    }

    // Retrieve the function text
    functionObject.functionText = getFunctionText(
        editor, functionObject.definition, functionObject.lastLine
    );

    return functionObject;
}

function detectFunctionStart(editor, cursorPos) {
    // Matches Python function definitions
    const funcDefRegEx = /def\s+(\w+)\(.*\):/g;

    // Get the current line
    const cursorLine = editor.document.lineAt(cursorPos);

    // Check if the cursor line itself is a function definition
    if (funcDefRegEx.test(cursorLine.text)) {
        console.log("  Cursor is on a function definition:", cursorLine.text);
        return cursorLine;
    }

    // Get all text before the cursor position
    const beginPos = new vscode.Position(0, 0); // Beginning of the document
    const range = new vscode.Range(beginPos, cursorPos); 
    const textBeforeCursor = editor.document.getText(range);

    // Begin RegEx search at beginning of the document
    funcDefRegEx.lastIndex = 0;

    // Find the last function definition before the position of the cursor
    let match;                  // Store a string matching the RegEx
    let lastMatch = null;       // Store the last string that matches the RegEx
    let lastMatchPos = null;    // Store the position of the matched string
    
    while ((match = funcDefRegEx.exec(textBeforeCursor)) !== null) {
        lastMatch = match;
        lastMatchPos = match.index;
    }

    // Exit detectFunctionStart() early if no function definitions are detected
    if (!lastMatch) {
        console.log("  No function definition found before cursor."); 
        console.log("    Cursor is not inside of a function");
        return null;
    }

    // Otherwise, return the detected function definition
    console.log("  Last function definition before cursor:", lastMatch[0]);

    const funcDefPos = editor.document.positionAt(lastMatchPos);
    const funcDefLine = editor.document.lineAt(funcDefPos.line);
    console.log("  Function definition on line:", funcDefLine.lineNumber + 1);

    return funcDefLine;
}

function detectFunctionEnd(editor, funcDefLine) {
    const lineCount = getNumberOfLines(editor);

    // Get indentation of the function definition
    const funcDefIndentation = countIndentation(funcDefLine);

//    console.log("  Function definition on line:", funcDefLine.lineNumber + 1);
    console.log("  Indentation of function definition:", funcDefIndentation);
    
    let lastLine = null;
    let lastLineNo = funcDefLine.lineNumber;

    for (let i = funcDefLine.lineNumber + 1; i < lineCount; i++) {
        const line = editor.document.lineAt(i);
        const lineIndent = countIndentation(line);
        const lineText = line.text.trim();
    
        // Skip blank lines
        if (lineText === '') {
            continue; // Skip blank lines
        }
    
        // Stop at the first line with indentation <= function definition
        if (lineIndent <= funcDefIndentation) {
            break;
        }
    
        lastLine = line;
        lastLineNo = i;
    }
    
    // Backtrack to last **non-blank** line (handles empty lines at the end)
    while (lastLineNo > funcDefLine.lineNumber &&
                    editor.document.lineAt(lastLineNo).text.trim() === '') {
        lastLineNo--;
        lastLine = editor.document.lineAt(lastLineNo);
    }
    
    // Return the first line if the function is empty
    if (!lastLine) {
        console.log("  Function appears empty. Definition is last line");
        return funcDefLine;   
    }
    
    // Otherwise, return the last line of the function
    console.log("  Last line text:", lastLine.text);
    console.log("  Function ends on line:", lastLine.lineNumber);
    return lastLine;
}

function getNumberOfLines(editor) {
    const lines = editor.document.getText().split('\n');
    const lineCount = lines.length;
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

function getFunctionText(editor, funcDefLine, funcEndLine) {    
    // Convert line numbers to Positions
    const funcStartPos = editor.document.lineAt(funcDefLine.lineNumber).range.start;
    const funcEndPos = editor.document.lineAt(funcEndLine.lineNumber).range.end;

    // Create a range from start to end of the function
    const range = new vscode.Range(funcStartPos, funcEndPos); 
    const functionText = editor.document.getText(range);

    return functionText;
}


module.exports = { detectCurrentFunction };