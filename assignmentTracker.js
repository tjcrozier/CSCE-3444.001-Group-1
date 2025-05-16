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

        const outputPath = path.join(vscode.workspace.rootPath || __dirname, 'generated_tasks.txt');
        fs.writeFileSync(outputPath, taskList.map((t, i) => `Task ${i + 1}: ${t}`).join('\n'));
        vscode.window.showInformationMessage(`Task list saved to ${outputPath}`);

        const outputChannel = vscode.window.createOutputChannel("EchoCode Task List");
        outputChannel.clear();
        outputChannel.appendLine("Generated Assignment Task List:");
        taskList.forEach((task, i) => {
            outputChannel.appendLine(`Task ${i + 1}: ${task}`);
        });
        outputChannel.show(true);

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
            new vscode.LanguageModelChatMessage(0, "You are helping a blind beginner Python student. Extract only the concrete steps required to complete the coding assignment below. Each step should be short and clear -- under 15 words. Format each step as a bullet point like '- [ ] Define a function named add().'"),
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
        .map(line => line.trim())
        .filter(line => line.startsWith('- [ ]'));

    taskList = lines.map(line => line.replace('- [ ]', '').trim());

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

async function rescanUserCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        speakMessage('No open code file to scan.');
        return;
    }

    const userCode = editor.document.getText();
    if (!userCode) {
        speakMessage('Open code file is empty.');
        return;
    }

    try {
        const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (!model) {
            vscode.window.showErrorMessage('Copilot model not available.');
            return;
        }

        const assignmentText = taskList.map((task, i) => `Task ${i + 1}: ${task}`).join('\n');

        const messages = [
            new vscode.LanguageModelChatMessage(0, 
                `You are helping a blind beginner Python student. \nCompare this assignment list to the student's code. \nRespond only with the task numbers that are already complete.`),
            new vscode.LanguageModelChatMessage(0, `Assignment Tasks:\n${assignmentText}`),
            new vscode.LanguageModelChatMessage(0, `User's Code:\n${userCode}`)
        ];

        const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

        let result = '';
        for await (const chunk of response.text) {
            result += chunk;
        }

        updateCompletedTasksFromAI(result);

    } catch (err) {
        vscode.window.showErrorMessage('AI rescan failed: ' + err.message);
        speakMessage('Failed to rescan code.');
    }
}

function updateCompletedTasksFromAI(responseText) {
    completedTasks.clear();

    const taskNumbers = responseText.match(/\d+/g);
    if (taskNumbers) {
        taskNumbers.forEach(num => {
            const index = parseInt(num) - 1;
            if (index >= 0 && index < taskList.length) {
                completedTasks.add(index);
            }
        });
    }

    speakMessage(`Updated task completion based on your code. ${completedTasks.size} tasks completed.`);
}

function readNextSequentialTask() {
    if (taskList.length === 0) {
        speakMessage('No tasks loaded.');
        return;
    }

    let startingIndex = currentTaskIndex;
    let foundNext = false;

    do {
        currentTaskIndex = (currentTaskIndex + 1) % taskList.length;
        if (!completedTasks.has(currentTaskIndex)) {
            foundNext = true;
            break;
        }
    } while (currentTaskIndex !== startingIndex);

    if (foundNext) {
        const task = taskList[currentTaskIndex];
        speakMessage(`Task ${currentTaskIndex + 1}: ${task}`);
    } else {
        speakMessage('All tasks completed.');
    }
}

module.exports = {
    loadAssignmentFile,
    readNextTask,
    rescanUserCode,
    readNextSequentialTask
};
