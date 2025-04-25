# Echo Code — AI-Assisted Python Debugging for Visually Impaired Programmers

**Echo Code** is a Visual Studio Code extension that combines **AI-powered code tutoring** with **audible Python error reporting**. Designed to assist **visually impaired students**, this tool reads out Python errors detected by **Pylint**, provides inline code annotations, and offers an interactive chat tutor that analyzes your active file to answer questions and provide exercises.

---

## **Features**

- **Automatic Python Error Detection**  
  Automatically detects errors using Pylint when a Python file is saved.

- **Reads Critical Errors Aloud**  
  Uses text-to-speech to read only essential errors (e.g., syntax errors, undefined variables).

- **Output Panel Logging**  
  Displays all detected errors in the VS Code Output Panel for visual reference.

- **Simplified Error Messages**  
  Provides clear, concise explanations without overwhelming beginners.

- **Summarize Functions and Classes**  
  Automatically generates brief summaries for functions and classes using AI, delivered via text-to-speech (TTS).

- **AI Code Tutoring Annotations**  
  Provides inline annotations explaining **common coding mistakes** and suggesting improvements.
  - 🆕 New functions for generating big O(n) annotations

- **Interactive Chat Tutor**  
  An AI-powered tutor that reads your active file and answers questions or provides exercises specific to its content. Open it with `Ctrl+Alt+C` and ask about your code directly.

- **Voice Input for Tutor Chat**  
  Use your microphone to ask questions instead of typing them. Trigger voice input with a shortcut or mic button in the chat panel.

- **Auto-Detection of Missing Tools**  
  Automatically prompts users to install **Pylint** if it’s not found.

- **Function Navigation via Hotkeys**  
  Use **Ctrl+Alt+Up/Down Arrow** to navigate between function definitions, with automatic speech announcing the current function.
  
- **Assignment Tracker System**   
  Allows blind users to upload `.txt`, `.pdf`, or `.docx` assignment files and uses AI to extract clear task lists:
  - Tasks are read aloud one-by-one.
  - Tasks can be marked complete with a hotkey.
  - Tasks are saved to a file and displayed in the output panel.

 - **Integration with GitHub Copilot**  
 Leverages GitHub Copilot for additional AI-powered coding assistance.

- **Integration with GitHub Copilot**  
  Leverages GitHub Copilot and Copilot Chat for enhanced AI-powered coding assistance.

---

## **Keyboard Shortcuts**


| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Alt+A` | `code-tutor.Annotate` | Generates the annotations. |
| `Ctrl+Alt+S` | `code-tutor.speakNextAnnotation` | Reads the next annotation, including line number and suggestion. |
| `Ctrl+Alt+Q` | `code-tutor.readAllAnnotation` | Reads all the annotations in the queue. |
| `Ctrl+Alt+Down` | `echocode.jumpToNextFunction` | Jumps to the next function in the file. |
| `Ctrl+Alt+Up` | `echocode.jumpToPreviousFunction` | Jumps to the previous function. |
| `Ctrl+Alt+Space C` | `echocode.summarizeClass` | Summarizes the current class. |
| `Ctrl+Alt+Space F` | `echocode.summarizeFunction` | Summarizes the current function. |
| `Ctrl+Alt+Space P` | `echocode.summarizeProgram` | *(Future)* Summarize full program. |
| `Ctrl+Alt+U` | `echocode.increaseSpeechSpeed` | Increases speech rate. |
| `Ctrl+Alt+D` | `echocode.decreaseSpeechSpeed` | Decreases speech rate. |
| `Ctrl+Alt+X` | `echocode.stopSpeech` | Stops current speech playback. |
| `Ctrl+Alt+O` | `echocode.loadAssignmentFile` | Uploads an assignment file for task tracking.  |
| `Ctrl+Alt+T` | `echocode.readNextTask` | Reads the next task aloud. |
| `Ctrl+Alt+M` | `echocode.markTaskComplete` | Marks the current task as complete.  |
| `Ctrl + Alt + N` | `code-tutor.analyzeBigO` | Queue up the big O annotations               🆕|
| `Ctrl + Alt + B` | `code-tutor.iterateBigOQueue` | Read next big O recommendation outloud      🆕 |
| `Ctrl + Alt + H` | `code-tutor.readEntireBigOQueue` |Read all big O recommendations one at a time 🆕|
| `Ctrl+Alt+C`          | `echocode.openChat`            | Opens the EchoCode Tutor chat interface.        |
| `Ctrl+Alt+V`          | `echocode.voiceInput`          | Starts voice input to ask the chat a question.  Future feature  |


---

## **Installation & Requirements**

Before using Echo Code, ensure the following are installed:

1. **[Python](https://www.python.org/downloads/)** (version 3.6 or higher)
2. **Pylint** (automatically detected; will prompt for installation if missing):
   ```bash
   pip install pylint
   ```
3. **[Python Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)** (auto-installed if missing)
4. **[GitHub Copilot Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)**  
5. **[GitHub Copilot Chat Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=github.copilot-chat)**  
6. Consent for Copilot to access LLM when prompted

---

## **How to Use**

### **Navigating Functions**
- Press **Ctrl+Alt+Down Arrow** to move to the next function in descending order.
- Press **Ctrl+Alt+Up Arrow** to move to the previous function in ascending order.

### **Summarizing Code**
- To hear a brief summary of the current Python class: Press **Ctrl+Alt+Space C**.
- To hear a brief summary of the current Python function: Press **Ctrl+Alt+Space F**.

### **Using the Chat Tutor**
- Open the chat: Press **Ctrl+Alt+C** to launch the EchoCode Tutor in the Chat view.
- Ask questions about your active file, e.g.:
  - “What does my `greet` function do?”
  - “Why is there a loop in my code?”
  - “Give me an exercise for my file.” (or use `/exercise`)
- The tutor reads your active file automatically and responds based on its content.
- Press **Ctrl+Alt+V** or click the mic icon in the chat panel to ask your question using voice input.

### **Annotating Code**
- Press **Ctrl+Alt+A** to generate annotations for your code.
- Use **Ctrl+Alt+S** to hear the next annotation or **Ctrl+Alt+Q** to hear all annotations.

---

## **Extension Commands**

| Command                        | Description                                           |
|--------------------------------|-------------------------------------------------------|
| `echocode.readErrors`         | Reads the most recent Python errors aloud.           |
| `echocode.annotate`           | Toggles tutor annotations for explanations and suggestions. |
| `echocode.readAllAnnotations` | Reads all detected annotations aloud.                |
| `echocode.summarizeClass`     | Summarizes the current class aloud.                  |
| `echocode.summarizeFunction`  | Summarizes the current function aloud.               |
| `echocode.jumpToNextFunction` | Jumps to the next function definition.               |
| `echocode.jumpToPreviousFunction` | Jumps to the previous function definition.       |
| `echocode.openChat`           | Opens the EchoCode Tutor chat interface.             |
| `echocode.voiceInput`         | Activates microphone input for asking questions.     |

---

## **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.
- Currently only works on Windows machines.
- When generating code summaries, multiple TTS triggers may overlap.
- Large files might exceed the language model’s token limit in the chat tutor; responses may truncate.



---

## **Release Notes**

### **1.2.1**
- Added **EchoCode Tutor Chat**: An AI tutor that reads the active file and answers questions or provides exercises specific to its content. Open with `Ctrl+Alt+C`.
- Enhanced chat functionality to automatically include the active file’s content in prompts.
- Updated documentation with chat usage instructions and new shortcut.

### **1.2.0**
- Added summarization for classes and functions.
- Added annotations for errors.
- Added dependency for GitHub Copilot.
- Added audible alerts when annotations are created.
- Added hotkey functionality for summarization, annotations, navigating annotations, and iterating the navigation queue.

### **1.3.0**
- Added **voice input** for Tutor Chat with `Ctrl+Alt+V` and a mic button in the chat panel.
- Updated documentation and shortcuts to reflect the new feature.


### **1.4.0**
-  Added **Big O Annotator** feature to help blind students handle big O(n) tasks.
-  Users can now generate annotations specifically for "for loops" that check for inefficiencies.
-  Uses **GitHub Copilot** to extract generate recommendations .
-  **Text-to-speech** reads each annotaion outloud.
-  Queues up all big O annotaitons in its own queue that can be read aloud all at once or one per button press .

**New Hotkeys:**


| Shortcut        | Description                            |
|----------------|----------------------------------------|
| `Ctrl+Alt+C`          | Opens the EchoCode Tutor chat interface.        |
| `Ctrl+Alt+V`          | Starts voice input to ask the chat a question.  Future feature  |

---

## **Author & License**

Developed by Group 1 - Team Jacob