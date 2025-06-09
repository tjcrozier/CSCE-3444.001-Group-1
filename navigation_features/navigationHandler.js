const vscode = require("vscode");
const {
  flattenSymbols, SUPPORTED_LANGUAGES, getInnermostSymbol, getGenericKindLabel
} = require("../getSymbols");
const {
  speakMessage,
} = require("../program_settings/speech_settings/speechHandler");

let lastTimeout = null; // Stores the last scheduled speech event

async function moveCursorToFunction(direction) {
    // Update the text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Get the current position of the cursor in the file
    const curPos = getCursorPos(editor);

    // Get the destination symbol (a DocumentSymbol object and a "wrap" flag)
    const destination = await calculateJumpPosition(editor, direction, curPos);

    // Build the message to announce when moving the cursor
    const message = buildJumpMessage(direction, curPos, destination);

    // Move the cursor and scroll to new location
    if (destination) {
        // This is the position of the left side of the first character in the 
        // class/function's header line
        const startPos = destination.symbol.range.start;

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

async function calculateJumpPosition(editor, direction, curPos) {
    // Get the class/struct and function/method symbols as a flat array
    const symbolsFlat = await flattenSymbols(editor);

    // Nowhere to jump if there are no function/class/struct definitions
    if (symbolsFlat.length === 0) {
        return {
            symbol: null,
            wrap: false,
            reason: "NO_SYMBOLS"
        }
    }

    // If there is only one symbol definition, that will be destination
    if (symbolsFlat.length === 1) {
        return {
            symbol: symbolsFlat[0],
            wrap: false,
            reason: "ONLY_ONE_SYMBOL"
        }
    }

    // Check the cursor's context
    const curSymbol = await getInnermostSymbol(editor, curPos.pos);
    
    // Safely get the index of the current symbol in the flat array--if there 
    // are no symbols, the index is -1
    const curSymbolIndex = curSymbol
        ? symbolsFlat.findIndex(sym =>
            sym.range.start.isEqual(curSymbol.range.start) &&
            sym.range.end.isEqual(curSymbol.range.end)
        )
        : -1;

    /* Calculate the cursor's destination */

    // Moving backward
    if (direction === "previous") {
        // Cursor is not inside a class/struct/function definition
        if (!curSymbol) {
            // Get all relevant symbols above the cursor
            const prevSyms = symbolsFlat.filter(
                sym => sym.range.start.line < curPos.line
            );

            // If the cursor is above all symbol definitions, destination 
            // symbol is the last in the file. Otherwise, it is the first 
            // before the cursor
            const prevSymbol = prevSyms.length > 0
                ? prevSyms[prevSyms.length - 1]
                : symbolsFlat[symbolsFlat.length - 1];

            return {
                symbol: prevSymbol,
                wrap: prevSyms.length === 0,
                reason: "NORMAL_JUMP"
            }
        }

        // If moving backward from inside the file's first symbol definition,
        // destination is the last in the file
        if (curSymbolIndex - 1 < 0) {
            return {
                symbol: symbolsFlat[symbolsFlat.length - 1],
                wrap: true,
                reason: "NORMAL_JUMP"
            };
        }

        // Otherwise, destination is first header line above the symbol 
        // containing the cursor's position
        return {
            symbol: symbolsFlat[curSymbolIndex - 1],
            wrap: false,
            reason: "NORMAL_JUMP"
        };
    }

    // Moving forward

    // Cursor is not inside a class/struct/function definition
    if (!curSymbol) {
        // Get the next function definition below the cursor
        const nextSymbol = symbolsFlat.find(
            sym => sym.range.start.line > curPos.line
        );

        // If cursor is below all function/class/struct definitions, destination
        // is the first in the file
        if (!nextSymbol) {
            return {
                symbol: symbolsFlat[0],
                wrap: true,
                reason: "NORMAL_JUMP"
            };
        }

        // Otherwise, destination is the next symbol below the cursor's position
        return {
            symbol: nextSymbol,
            wrap: false,
            reason: "NORMAL_JUMP"
        };
    }

    // If moving forward from the last symbol in the file, jump to the first
    if (curSymbolIndex + 1 > symbolsFlat.length - 1) {
        return {
            symbol: symbolsFlat[0],
            wrap: true,
            reason: "NORMAL_JUMP"
        }
    }

    // Otherwise, destination is the first symbol after the one containing the 
    // cursor
    return {
        symbol: symbolsFlat[curSymbolIndex + 1],
        wrap: false,
        reason: "NORMAL_JUMP"
    };
}

function buildJumpMessage(direction, curPos, destination) {
    // Nothing to do if there are no function/class definitions
    if (destination.reason === "NO_SYMBOLS") {
        return "No class or function definitions found. Not moving cursor.";
    }
    
    // Get the actual direction of the jump
    const actualDir = () => {
        // Only one function/class definition in the file
        if (destination.reason === "ONLY_ONE_SYMBOL") {
            return "to"; // Exiting lambda
        }

        // Moving backward
        if (direction === "previous") {
            // Exiting lambda
            return destination.wrap ? "down to the last" : "up to";
        }

        // Moving forward
        // Exiting lambda
        return destination.wrap ? "up to the first" : "down to";
    };

    // Is the destination a function, class, or struct?
    const destKind = getGenericKindLabel(destination.symbol.kind);
    
    // Get the name of the destination symbol, trimming off parameters if needed
    const destName = destination.symbol.name.includes('(')
        ? destination.symbol.name.split('(')[0]
        : destination.symbol.name;
    
    // Get the number of the destination symbol's header line
    const dLine = destination.symbol.range.start.line + 1;

    // Build and return the message to announce
    return `Moving cursor ${actualDir()} ${destKind} ${destName} on line ${dLine}`
}

function getCursorPos(editor) {
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
