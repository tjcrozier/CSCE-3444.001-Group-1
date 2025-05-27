const vscode = require("vscode");
const {
  flattenSymbols, SUPPORTED_LANGUAGES, getInnermostSymbol, getGenericKindLabel
} = require("../getSymbols");
const {
  speakMessage,
} = require("../program_settings/speech_settings/speechHandler");

let lastTimeout = null; // Stores the last scheduled speech event

let currentSymbol; // The symbol the cursor is currently inside
let currSymbolIndex; // The current symbol's position in the flat symbol array

async function moveCursorToFunction(direction) {
    // The class or function to move the cursor into
    let destination;
  
    // The message to speak
    let message;

    // Update the text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // This is only a loop because I hate lambda functions. It only runs once
    while (editor) {
        // Get the class/struct and function/method symbols as a flat array
        const navSymbols = await flattenSymbols(editor);
        const lastNavSymIndex = navSymbols.length - 1;

        // Get the cursor's position in the file
        const curPos = getCursorPos(editor);

        // There are no class or function definitions in the file--not an error,
        // but nothing to do.
        if (navSymbols.length === 0) {
            destination = curPos.pos;
            message = "No classes or functions. Cannot jump."
            break; // Break from the outer loop
        }

        // Get the innermost symbol containing the cursor's position in the file
        currentSymbol = await getInnermostSymbol(editor, curPos.pos);

        // If the cursor is not inside a class or function
        if (!currentSymbol) {
            const cursorLine = curPos.line;

            if (direction === "next") {
                const nextSymbol = navSymbols.find(
                  sym => sym.range.start.line > cursorLine
                );
                // jump to first if past last
                destination = nextSymbol || navSymbols[0]; 
                message = `Cursor is not in a function or class. Jumping \
                down to ${destination.name} on line \
                ${destination.range.start.line}.`;
            } else {
                const prevSymbols = navSymbols.filter(sym => sym.range.start.line < cursorLine);
                // jump to last if before first
                destination = prevSymbols.length > 0
                    ? prevSymbols[prevSymbols.length - 1]
                    : navSymbols[navSymbols.length - 1]; 
                message = `Cursor is not in a function or class. Jumping \
                up to ${destination.name} on line \
                ${destination.range.start.line}.`;
            }

            break; // Break from the outer loop
        }

        // Always start at the first element of the symbols array
        currSymbolIndex = 0;

        // Get the position of the current class/function symbol in the array
        for (const symbol of navSymbols) {
            // Use positions here, because only those are unique
            const sameStartPos = symbol.range.start.isEqual(
              currentSymbol.range.start
            );
            const sameEndPos = symbol.range.end.isEqual(
              currentSymbol.range.end
            );
            
            // Check if the symbol's start and end positions match the current
            if (sameStartPos && sameEndPos) {
                // Found the current symbol in the array
                break; // Break from an inner loop
            }
            currSymbolIndex++;
        }

        // A description of the destination
        let destDescription;

        // Get the symbol to move the cursor into
        if (direction == "next") {
            // If moving forward from the last class/function in the file, set
            // destination to the first class/function
            if (currSymbolIndex + 1 > lastNavSymIndex) {
                destination = navSymbols[0];
                destDescription = "up to the first"
            // Otherwise, destination is the next class/function in the file
            } else {
                destination = navSymbols[currSymbolIndex + 1];
                destDescription = "down to"
            }
        } else if (direction == "previous") {
            // If moving backward from the first class/function in the file, set
            // destination to the last class/function
            if (currSymbolIndex - 1 < 0) {
                destination = navSymbols[lastNavSymIndex];
                destDescription = "down to the last"
            // Otherwise, destination is the previous class/function in the file
            } else {
                destination = navSymbols[currSymbolIndex - 1];
                destDescription = "up to"
            }
        }

        // Set the message to speak
        message = `Moving cursor ${destDescription} \
        ${getGenericKindLabel(destination.kind)} ${destination.name} on \
        line ${destination.range.start.line}.`;
        break; // Break from the outer loop
    }

    // Move the cursor and scroll to new location
    if (destination) {
        // This is the position of the left side of the first character in the 
        // class/function's header line
        const startPos = destination.range.start;

        // This moves the cursor to the new position
        editor.selection = new vscode.Selection(startPos, startPos);

        // This scrolls the editor view to place the cursor near the top of the
        // window.
        editor.revealRange(
            new vscode.Range(startPos, startPos),
            vscode.TextEditorRevealType.NearTop
        );
    }

    /** Speak the message. Don't let it speak over itself. */
    if (message) {
        // Cancel previous speech request if a new movement happens quickly
        if (lastTimeout) {
            clearTimeout(lastTimeout);
        }

        // Debounce: Speak after half a second to prevent rapid speech overlap
        lastTimeout = setTimeout(() => {
            speakMessage(message);
            console.log(message);
        }, 500);
    }
}

function getCursorPos(editor) {
    const document = editor.document; // Document in the editor
    const cursorPos = editor.selection.active; // Cursor position object

    // Return a position object
    return {
        pos: cursorPos,
        line: cursorPos.line,
        col: cursorPos.character
    };
}

function registerMoveCursor(context) {
  const nextFunction = vscode.commands.registerCommand(
    "echocode.jumpToNextFunction",
    () => {
      moveCursorToFunction("next");
    }
  );

  const prevFunction = vscode.commands.registerCommand(
    "echocode.jumpToPreviousFunction",
    () => {
      moveCursorToFunction("previous");
    }
  );

  context.subscriptions.push(nextFunction, prevFunction);
}

module.exports = { registerMoveCursor, getCursorPos };
