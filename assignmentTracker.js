const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { speakMessage } = require('./speechHandler');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');


let taskList = [];
let currentTaskIndex = 0;
let completedTasks = new Set();

function resetTasks() {
    taskList = [];
    currentTaskIndex = 0;
    completedTasks.clear();
}

async function loadAssignmentFile() {
    const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'Text files': ['txt'],
            'PDF files': ['pdf'],
            'Word documents': ['docx'],
            'All files': ['*']
        },
        openLabel: 'Open Assignment File'
    });

    if (!fileUri || fileUri.length === 0) {
        speakMessage('No file selected.');
        return;
    }

    const filePath = fileUri[0].fsPath;

    try {
        let text = '';
        if (filePath.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            text = data.text;
        } else if (filePath.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } else {
            text = fs.readFileSync(filePath, 'utf8');
        }
        await parseTasksWithAI(text);
    } catch (err) {
        vscode.window.showErrorMessage('Failed to read file: ' + err.message);
        speakMessage('Failed to read the selected file.');
    }


}

async function parseTasksWithAI(text) {
    try {
        const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (!model) {
            vscode.window.showErrorMessage('Copilot model not available. Using fallback parser.');
            return parseTasksFromText(text);
        }

        const messages = [
            new vscode.LanguageModelChatMessage(0, "You are helping a blind beginner Python student. Convert the following assignment into clear step-by-step tasks. Use simple language and format each task as a bullet point."),
            new vscode.LanguageModelChatMessage(0, text)
        ];

        const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

        let result = '';
        for await (const chunk of response.text) {
            result += chunk;
        }

        parseTasksFromText(result);
    } catch (err) {
        vscode.window.showErrorMessage('AI parsing failed: ' + err.message);
        speakMessage('Failed to parse tasks with AI.');
        parseTasksFromText(text);
    }
}

function parseTasksFromText(text) {
    resetTasks();

    const lines = text
        .split(/\r?\n/)
        .flatMap(line => line.split(/[\-\*\d+\.]/))
        .map(line => line.trim())
        .filter(line => line.length > 3);

    taskList = lines;

    speakMessage(`Loaded ${taskList.length} tasks from the assignment.`);
    vscode.window.showInformationMessage(`Assignment loaded with ${taskList.length} tasks.`);
}

function readNextTask() {
    while (currentTaskIndex < taskList.length && completedTasks.has(currentTaskIndex)) {
        currentTaskIndex++;
    }

    if (currentTaskIndex >= taskList.length) {
        speakMessage('All tasks completed.');
        return;
    }

    const task = taskList[currentTaskIndex];
    speakMessage(`Task ${currentTaskIndex + 1}: ${task}`);
}

function markTaskComplete() {
    if (currentTaskIndex < taskList.length) {
        completedTasks.add(currentTaskIndex);
        speakMessage(`Marked task ${currentTaskIndex + 1} as complete.`);
        currentTaskIndex++;
    } else {
        speakMessage('No current task to mark as complete.');
    }
}

module.exports = {
    loadAssignmentFile,
    readNextTask,
    markTaskComplete
};
