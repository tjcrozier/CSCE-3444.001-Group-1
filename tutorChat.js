const vscode = require('vscode');

const BASE_PROMPT = 'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.';

const EXERCISES_PROMPT = 'You are a helpful tutor. Your job is to teach the user with fun, simple exercises that they can complete in the editor. Your exercises should start simple and get more complex as the user progresses. Move one concept at a time, and do not move on to the next concept until the user provides the correct answer. Give hints in your exercises to help the user learn. If the user is stuck, you can provide the answer and explain why it is the answer. If the user asks a non-programming question, politely decline to respond.';

async function activate(context) {
  const handler = async (request, chatContext, stream, token) => {
    let prompt = BASE_PROMPT;

    if (request.command === 'exercise') {
      prompt = EXERCISES_PROMPT;
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(prompt),
    ];

    const previousMessages = chatContext.history.filter(
      (h) => h instanceof vscode.ChatResponseTurn
    );

    previousMessages.forEach((m) => {
      let fullMessage = '';
      m.response.forEach((r) => {
        const mdPart = r;
        fullMessage += mdPart.value.value;
      });
      messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
    });

    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

    const chatResponse = await request.model.sendRequest(messages, {}, token);

    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  };

  const tutor = vscode.chat.createChatParticipant("chat-tutorial.echocode", handler);
  tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'tutor.jpeg');
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
