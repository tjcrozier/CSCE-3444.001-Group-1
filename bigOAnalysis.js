const vscode = require("vscode");
const Queue = require("./queue_system"); // Import the Queue system

const bigOQueue = new Queue(); // Queue for Big O notation problems

const ANNOTATION_PROMPT = `
You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you. You will then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object without any additional formatting or code blocks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

/**
 * Analyzes the code for Big O problems using Copilot or a language model.
 */
async function analyzeBigO(editor) {
  const document = editor.document;
  const text = document.getText();
  const suggestions = [];

  // Prompt to send to the language model
  const BIG_O_PROMPT = `
  You are a code analysis assistant. Analyze the following Python code and identify any potential Big O notation inefficiencies. Provide suggestions for improvement in JSON format, with each suggestion containing the line number and a brief explanation of the issue. Do not include any additional formatting like \`\`\`json or \`\`\`. Use the following format:
  [
    { "line": <line_number>, "suggestion": "<description of the inefficiency>" },
    ...
  ]
  Here is the code:
  ${text}
  `;

  try {
    // Select the Copilot model
    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    if (!model) {
      vscode.window.showErrorMessage(
        "No language model available. Please ensure Copilot is enabled."
      );
      return;
    }

    // Send the prompt to the language model
    const messages = [
      new vscode.LanguageModelChatMessage(0, BIG_O_PROMPT), // 0 = User role
    ];
    const chatResponse = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );

    // Parse the response from the language model
    await parseChatResponse(chatResponse, editor);

    // Notify the user if no issues were found
    if (bigOQueue.isEmpty()) {
      vscode.window.showInformationMessage("No Big O issues detected!");
    } else {
      vscode.window.showInformationMessage(
        `${bigOQueue.size()} Big O issues detected and added to the queue.`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      "Failed to analyze Big O problems: " + error.message
    );
    console.error("Error in analyzeBigO:", error);
  }
}

/**
 * Parses the chat response and applies decorations.
 */
async function parseChatResponse(chatResponse, textEditor) {
  let accumulatedResponse = "";
  for await (const fragment of chatResponse.text) {
    accumulatedResponse += fragment;

    // Check if the accumulated response contains a complete JSON array
    if (accumulatedResponse.trim().endsWith("]")) {
      try {
        // Clean the response
        const cleanedResponse = cleanResponse(accumulatedResponse);
        console.log("Cleaned chat response:", cleanedResponse);

        // Parse the JSON
        const annotations = JSON.parse(cleanedResponse);

        // Apply each annotation
        annotations.forEach((annotation) => {
          applyDecoration(textEditor, annotation.line, annotation.suggestion);

          // Enqueue the annotation for later playback
          bigOQueue.enqueue({
            line: annotation.line,
            suggestion: annotation.suggestion,
          });
        });

        // Reset the accumulated response
        accumulatedResponse = "";
      } catch (error) {
        console.error("Failed to parse annotation:", error.message);
        vscode.window.showErrorMessage(
          "Failed to parse annotations: " + error.message
        );
      }
    }
  }
}

/**
 * Cleans the raw response from the language model.
 */
function cleanResponse(rawResponse) {
  return rawResponse
    .replace(/```json/g, "") // Remove ```json
    .replace(/```/g, "") // Remove ```
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Applies decorations to the editor.
 */
function applyDecoration(editor, line, suggestion) {
  const position = new vscode.Position(line - 1, 0);
  const range = new vscode.Range(position, position);

  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      color: "grey",
      fontStyle: "italic",
    },
  });

  const decoration = {
    range,
    hoverMessage: suggestion,
    renderOptions: {
      after: {
        contentText: ` ${suggestion.substring(0, 50)}...`,
      },
    },
  };

  editor.setDecorations(decorationType, [decoration]);
}

/**
 * Command to iterate over the Big O queue.
 */
function iterateBigOQueue() {
  if (!bigOQueue.isEmpty()) {
    const nextProblem = bigOQueue.dequeue();
    vscode.window.showInformationMessage(
      `Big O problem on line ${nextProblem.line}: ${nextProblem.suggestion}`
    );
  } else {
    vscode.window.showInformationMessage("No more Big O problems to read.");
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

  const iterateBigOCommand = vscode.commands.registerCommand(
    "code-tutor.iterateBigOQueue",
    () => {
      iterateBigOQueue();
    }
  );

  context.subscriptions.push(analyzeBigOCommand, iterateBigOCommand);
}

module.exports = {
  registerBigOCommand,
};
