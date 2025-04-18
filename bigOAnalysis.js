const vscode = require("vscode");

/**
 * Analyzes the code for bad Big O practices and provides suggestions.
 */
function analyzeBigO(editor) {
  const document = editor.document;
  const text = document.getText();
  const suggestions = [];

  // Patterns to detect bad Big O practices
  const patterns = [
    {
      regex: /for\s*\(.*\)\s*{[^}]*for\s*\(.*\)/g, // Nested loops
      message:
        "Nested loops detected. Consider reducing the nesting or using more efficient algorithms.",
    },
    {
      regex: /\.filter\([^)]*\)\.map\([^)]*\)/g, // Chained filter and map
      message:
        "Chained filter and map detected. Consider combining them into a single loop for better performance.",
    },
    {
      regex: /\.sort\([^)]*\)\.map\([^)]*\)/g, // Sorting followed by mapping
      message:
        "Sorting followed by mapping detected. Consider optimizing the sorting logic or combining operations.",
    },
    {
      regex: /while\s*\(.*\)\s*{[^}]*while\s*\(.*\)/g, // Nested while loops
      message:
        "Nested while loops detected. Consider reducing the nesting or using more efficient algorithms.",
    },
    {
      regex: /\.reduce\([^)]*\)\.map\([^)]*\)/g, // Chained reduce and map
      message:
        "Chained reduce and map detected. Consider combining them into a single loop for better performance.",
    },
  ];

  // Analyze the code for each pattern
  patterns.forEach((pattern) => {
    const matches = text.match(pattern.regex);
    if (matches) {
      matches.forEach((match) => {
        const startIndex = text.indexOf(match);
        const position = document.positionAt(startIndex);
        const lineNumber = position.line + 1;

        suggestions.push({
          line: lineNumber,
          suggestion: pattern.message,
          range: new vscode.Range(
            position,
            position.translate(0, match.length)
          ),
        });
      });
    }
  });

  // Apply decorations for each suggestion
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      color: "grey",
      fontStyle: "italic",
    },
  });

  const decorations = suggestions.map((suggestion) => ({
    range: suggestion.range,
    hoverMessage: suggestion.suggestion,
    renderOptions: {
      after: {
        contentText: ` ${suggestion.suggestion.substring(0, 50)}...`,
      },
    },
  }));

  editor.setDecorations(decorationType, decorations);

  // Notify the user if no issues were found
  if (suggestions.length === 0) {
    vscode.window.showInformationMessage("No Big O issues detected!");
  }
}

/**
 * Registers the Big O analysis command.
 */
function registerBigOCommand(context) {
  const analyzeBigOCommand = vscode.commands.registerCommand(
    "code-tutor.analyzeBigO",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python") {
        analyzeBigO(editor);
      } else {
        vscode.window.showWarningMessage(
          "Please open a Python file to analyze Big O practices."
        );
      }
    }
  );

  context.subscriptions.push(analyzeBigOCommand);
}

module.exports = {
  registerBigOCommand,
};
