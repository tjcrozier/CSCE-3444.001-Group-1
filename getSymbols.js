const vscode = require("vscode");

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
    if (symbolKind === vscode.SymbolKind.Class) return "class";
    if (symbolKind === vscode.SymbolKind.Struct) return "struct";

    const kindName = Object.entries(vscode.SymbolKind).find(
        ([, value]) => value === symbolKind
    )?.[0];

    return kindName ? kindName.toLowerCase() : "unknown";
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

// Returns a flat array of all the class and function symbols in the file
async function flattenSymbols(editor) {
    // Retrieve the symbol tree
    const symbols = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider", editor.document.uri
    );

    // Push all class/struct and function/method symbols into a flat array
    const symbolsFlat = flattenSymbolsRecursive(symbols);
    
    // Sort the symbols by their range's start line
    symbolsFlat.sort((a, b) => a.range.start.line - b.range.start.line);

    // Print for debugging
    console.log("Flattened symbols:");
    for (const symbol of symbolsFlat) {
        const kindLabel = getGenericKindLabel(symbol.kind);
        console.log(`- ${kindLabel}: ${symbol.name} at line ${symbol.range.start.line + 1}`);
    }

    return symbolsFlat;
}

function flattenSymbolsRecursive(symbols, symbolsFlat = []) {
    // Push each symbol into the array
    for (const symbol of symbols) {
        // Check if the symbol is a class/struct or function/method
        const isRelevant = Object.values(symKinds).some(kinds =>
            kinds.includes(symbol.kind)
        );

        // If the symbol is relevant, push it into the flat array
        if (isRelevant) {
            symbolsFlat.push(symbol);
        }

        // Always recurse regardless of parent relevance
        flattenSymbolsRecursive(symbol.children || [], symbolsFlat);
    }

    // Unroll the recursion
    return symbolsFlat;
}


// Returns the innermost function or class symbol at a position
async function getInnermostSymbol(editor, position) {
    // Retrieve the symbol tree
    const symbols = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider", editor.document.uri
    );

    // Get the innermost symbol containing the cursor
    return getInnermostSymbolRecursive(symbols, position);
}

function getInnermostSymbolRecursive(symbols, position, curSymbol = null) {
    // Get the next inner symbol containing the position
    for (const symbol of symbols) {
        for (const kind of Object.keys(symKinds)) {
            const isFuncOrClass = symKinds[kind].includes(symbol.kind);
            const posIsInSymbol = symbol.range.contains(position);

            // If the current symbol has no children, return it. Otherwise, 
            // enter the curent symbol's children
            if (isFuncOrClass && posIsInSymbol) {
                // Recurse into children *before* returning
                const childSymbol = getInnermostSymbolRecursive(
                    symbol.children || [], position
                );
                return childSymbol || symbol;
            }
        }
    }

    // Return the innermost symbol at the position
    return curSymbol
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
    getAncestry, getGenericKindLabel, flattenSymbols, getInnermostSymbol };