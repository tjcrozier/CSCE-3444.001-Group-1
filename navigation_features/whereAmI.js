const vscode = require("vscode"); // VSCode API
const { getCursorPos } = require("../navigation_features/navigationHandler")
const {
  getAncestry, SUPPORTED_LANGUAGES, symKinds, getGenericKindLabel
} = require("../getSymbols");
const {
  speakMessage,
} = require("../program_settings/speech_settings/speechHandler");

async function describeCursorPosition(editor) {
  const curPos = getCursorPos(editor);

  // Get the ancestry path to the cursor's position
  const cursorAncestry = await getAncestry(editor, curPos.pos);

  if (cursorAncestry.length > 0) {
    // Format: innermost first, outermost last
    const levels = cursorAncestry
      .map((symbol) => {
        const kind = getGenericKindLabel(symbol.kind);
        return `${kind} "${symbol.name}"`;
      })
      .reverse();

    const context = levels.join(", inside ");
    const message = `You are in ${context}, at line ${
      curPos.line + 1
    }, column ${curPos.col + 1}.`;

    console.log(message);
    await speakMessage(message);
  } else {
    // Assume the user is in global scope
    const message = `You are in global scope, at line ${curPos.line + 1}`;
    console.log(message);
    await speakMessage(message);
  }
}

function registerWhereAmICommand(context) {
  const whereAmI = vscode.commands.registerCommand("echocode.whereAmI", () => {
    const editor = vscode.window.activeTextEditor;

    if (editor && SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
      describeCursorPosition(editor);
    }
  });

  context.subscriptions.push(whereAmI);
}

module.exports = { registerWhereAmICommand };
