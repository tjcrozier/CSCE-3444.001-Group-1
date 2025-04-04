const vscode = require('vscode'); // VSCode API

class Selection {
    // TextLine objects
    firstLine;
    lastLine;

    // Is the cursor actually inside the selection, or just below it?
    cursorInSelection;

    // Text
    blockType;
    name;
    text;

    // Is the selection inside of another structure?
    selectionInClass;

    // Types of blocks to select and regexes matching their first lines
    #headerPatterns = {
        class: '^\\s*class\\s+(\\w+)(\\(.*\\))?:',
        function: '^\\s*def\\s+(\\w+)\\(.*\\):'
    }

    constructor(blockType) {
        this.firstLine = null;
        this.lastLine = null;
        this.cursorInSelection = true;
        this.blockType = blockType;
        this.name = "";
        this.text = "";
        this.selectionInClass = true;
    }

    detectCurrentBlock(editor) {
        // Get current position of the cursor
        const cursorPos = editor.selection.active;
        const cursorLineNo = editor.document.lineAt(cursorPos).lineNumber;
        console.log("Cursor at line:", cursorLineNo + 1);

        // Detect the last header line of specified type before the cursor
        this.firstLine = this.#detectFirstLine(
            editor, cursorPos, this.#headerPatterns[this.blockType]
        );

        // If no matching headers are found, cursor is not inside block of
        // specified type
        if (!this.firstLine) {
            this.cursorInSelection = false;
            return;
        }

        // Detect the end of the selected block
        this.lastLine = this.#detectLastLine(editor, this.firstLine);

        // If the cursor is after the last line of the selection, is is not 
        // inside the selection.
        if (cursorLineNo > this.lastLine.lineNumber) {
            this.cursorInSelection = false;
            return;
        }

        // Retrieve the name/header of the selection
        this.name = this.#getName(editor, this.firstLine);

        // Retrieve the selected text
        this.text = this.#getSelectedText(
            editor, this.firstLine.lineNumber, this.lastLine.lineNumber
        );
    }

    #detectFirstLine(editor, cursorPos, headerPattern) {
        const headerRegEx = new RegExp(headerPattern);

        // Start from the cursor's line and move upward
        for (let lineNo = cursorPos.line; lineNo >= 0; lineNo--) {
            const line = editor.document.lineAt(lineNo);
            if (headerRegEx.test(line.text)) {
                console.log(
                    "  Found", this.blockType, "header on line", lineNo + 1 + ":", line.text
                );
                return line;
            }
        }

        console.log("  No", this.blockType, "header found before cursor.");
        return null;
    }

    #detectLastLine(editor, firstLine) {
        const lineCount = getNumberOfLines(editor);

        // Get indentation of the function definition
        const firstLineIndent = countIndentation(firstLine);

        console.log("  Indentation of header:", firstLineIndent);
        
        let lastLine = null;
        let lastLineNo = firstLine.lineNumber;

        for (let i = firstLine.lineNumber + 1; i < lineCount; i++) {
            const line = editor.document.lineAt(i);
            const lineIndent = countIndentation(line);
            const lineText = line.text.trim();
        
            // Skip blank lines
            if (lineText === '') {
                continue; // Skip blank lines
            }
        
            // Stop at the first line with indentation <= function definition
            if (lineIndent <= firstLineIndent) {
                break;
            }
        
            lastLine = line;
            lastLineNo = i;
        }
        
        // Backtrack to last **non-blank** line (handles empty lines at the end)
        while (lastLineNo > firstLine.lineNumber &&
                        editor.document.lineAt(lastLineNo).text.trim() === '') {
            lastLineNo--;
            lastLine = editor.document.lineAt(lastLineNo);
        }
        
        // Return the first line if the function is empty
        if (!lastLine) {
            console.log("  Block appears empty. Header is also last line");
            return firstLine;   
        }
        
        // Otherwise, return the last line of the function
        console.log("  Last line text:", lastLine.text);
        console.log("  Selection ends on line:", lastLine.lineNumber + 1);
        return lastLine;
    }

    #getName(editor, firstLine) {
        const headerRegEx = new RegExp(this.#headerPatterns[this.blockType]);
        const match = firstLine.text.match(headerRegEx);
        return match ? match[1] : "";
    }

    #getSelectedText(editor, firstLineNo, lastLineNo) {
        // Convert line numbers to Positions
        const selectionStart = editor.document.lineAt(firstLineNo).range.start;
        const selectionEnd = editor.document.lineAt(lastLineNo).range.end;

        // Create a range from start to end of the function
        const range = new vscode.Range(selectionStart, selectionEnd); 
        const selectionText = editor.document.getText(range);

        return selectionText;
    }
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

module.exports = { Selection };