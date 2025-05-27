const vscode = require("vscode");
const { getCursorPos } = require("./navigation_features/navigationHandler");

/* Currently supported languages */
const languages = {
    PYTHON: "python",
    CPP: "cpp",
    JAVA: "java"
};

const SUPPORTED_LANGUAGES = Object.values(languages);

/* Symbol kind aliases. This can be added to later, if we want to detect other
 * kinds */
const symKinds = {
    function: [vscode.SymbolKind.Method, vscode.SymbolKind.Function],
    class: [vscode.SymbolKind.Class, vscode.SymbolKind.Struct]
};

// This can also be added to if there are any other kinds we want to simplify
function getGenericKindLabel(symbolKind) {
  if (symKinds.function.includes(symbolKind)) return "function";
  if (symKinds.class.includes(symbolKind)) return "class";
  return vscode.SymbolKind[symbolKind].toLowerCase();
}

/**
 * NOTE: To make this return the innermost symbol of the specified kind, just
 * .reverse() curAncestry
 * 
 * @param {vscode.Position} position 
 * @param {"function" | "class"} symKind 
 * @param {vscode.TextEditor} editor 
 * @returns The entire text of the symbol as a string
 */
async function getSymbolText(position, symKind, editor) {
    // Get the ancestry path to the specified position
    const curAncestry = await getAncestry(editor, position);

    // Get the outermost symbol of the specified symbol kind.
    for (const level of curAncestry) {
        if (symKinds[symKind].includes(level.kind)) {
            return editor.document.getText(level.range);
        }
    }

    // No symbols of the specified kind found
    return null;
}

/**
 * Helpers defined below: getAncestryRecursive()
 * 
 * @param {vscode.Position} position = specified position in the file (line,col)
 * @returns ancestry, an array containing the symbols surrounding the cursor,
 * from outermost to innermost 
 */
async function getAncestry(editor, position) {
    // Retrieve the symbol tree
    const symbols = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider", editor.document.uri
    );

    // Build the cursor's ancestry
    const ancestry = getAncestryRecursive(symbols, position);

    return ancestry;
}

/** 
 * @param {vscode.DocumentSymbol} symbols 
 * @param {vscode.Position} position 
 * @param {vscode.DocumentSymbol[]} ancestry - Path to the requested position.
 * This parameter defaults to an empty array if nothing is provided 
 */
function getAncestryRecursive(symbols, position, ancestry = []) {
    // Check each symbol at the current nest level for the specified position
    for (const symbol of symbols) {
        // These are boolean values
        const contains = symbol.range.contains(position); 
        const isOnHeaderLine = position.line === symbol.range.start.line;

        // If the position is inside the current symbol, add it to the ancestry 
        // and begin checking its children
        if (contains || isOnHeaderLine) {
            ancestry.push(symbol);

            // Pass in the current symbol's children, if they exist, or just an
            // empty array
            return getAncestryRecursive(
                symbol.children || [], position, ancestry
            );
        }        
    }

    // Unroll the recursion
    return ancestry;
}

module.exports = { SUPPORTED_LANGUAGES, symKinds, getSymbolText, 
    getAncestry, getGenericKindLabel };