const vscode = require('vscode'); // VSCode API
const { speakMessage } = require('./speechHandler');
const { analyzeAI } = require('./AIrequest');

async function describeCursorPosition(editor) {
    const document = editor.document;
    const cursorPos = editor.selection.active;
    const cursorLineNo = cursorPos.line + 1;
    const cursorColNo = cursorPos.character + 1;

    const symbols = await vscode.commands.executeCommand(
        'vscode.executeDocumentSymbolProvider',
        document.uri
    );

    // Collect nested symbols from outermost to innermost
    function getSymbolAncestry(symbols, position, ancestry = []) {
        for (const symbol of symbols) {
            if (symbol.range.contains(position)) {
                ancestry.push(symbol);
                return getSymbolAncestry(symbol.children || [], position, ancestry);
            }
        }
        return ancestry;
    }

    const ancestry = getSymbolAncestry(symbols || [], cursorPos);

    if (ancestry.length > 0) {
        // Format: innermost first, outermost last
        const levels = ancestry.map(symbol => {
            const kind = vscode.SymbolKind[symbol.kind].toLowerCase();
            return `${kind} "${symbol.name}"`;
        }).reverse();

        const context = levels.join(", inside ");
        const message = `You are inside ${context}, at line ${cursorLineNo}, column ${cursorColNo}.`;

        console.log(message);
        await speakMessage(message);
    } else {
        // Fallback to AI if nothing found
        const fullText = document.getText();
        const prompt = `My cursor is at line ${cursorLineNo}, column ${cursorColNo} in the following Python code. Give a brief description of the cursor's location in the code in a TTS-friendly format.`;
        const posDescription = await analyzeAI(fullText, prompt);

        console.log(posDescription);
        await speakMessage(posDescription);
    }
}

module.exports = { describeCursorPosition }
 