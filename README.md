# Echo Code — AI-Assisted Python Debugging for Visually Impaired Programmers

**Echo Code** is a Visual Studio Code extension that combines **AI-powered code tutoring** with **audible Python error reporting**. Designed to assist **visually impaired students**, this tool reads out Python errors detected by **Pylint** and provides annotation features to guide users in understanding their code.

---

**Features**

- **Automatic Python Error Detection**  
  Automatically detects errors using Pylint when a Python file is saved.

- **Reads Critical Errors Aloud**  
  Uses text-to-speech to read only essential errors (e.g., syntax errors, undefined variables).

- **Output Panel Logging**  
  Displays all detected errors in the VS Code Output Panel for visual reference.

- **Simplified Error Messages**  
  Provides clear, concise explanations without overwhelming beginners.

- **Summarize functions and classes**  
  Automatically generates brief summaries for functions and classes using AI, with output delivered by text-to-speech (TTS).
  
- **AI Code Tutoring Annotations**  
  Provides inline annotations explaining **common coding mistakes** and suggesting improvements.
  - 🆕 New functions for generating big O(n) annotations

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


---
## **Installation & Requirements**

Before using Echo Code, ensure the following are installed:

1. **[Python](https://www.python.org/downloads/)** (version 3.6 or higher)
2. **Pylint** (automatically detected; will prompt for installation if missing):
   ```bash
   pip install pylint
   ```
3. **[Python Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)** (auto-installed if missing)
4. **[GitHub Copilot Extension for VS Code](https://marketplace.visualstudio.com/items/?itemName=GitHub.copilot)**
5. Consent for Copilot to access LLM when prompted
---

## **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.
- Currently only works on WindowOS machines.
- When generating code summaries, multiple TTS triggers will still overlap.


---
## **Release Notes**


### **1.4.0**
-  Added **Big O Annotator** feature to help blind students handle big O(n) tasks.
-  Users can now generate annotations specifically for "for loops" that check for inefficiencies.
-  Uses **GitHub Copilot** to extract generate recommendations .
-  **Text-to-speech** reads each annotaion outloud.
-  Queues up all big O annotaitons in its own queue that can be read aloud all at once or one per button press .

**New Hotkeys:**

| Shortcut        | Description                            |
|----------------|----------------------------------------|
| Ctrl + Alt + N | Queue up the big O annotations               |
| Ctrl + Alt + B | Read next big O recommendation outloud       |
| Ctrl + Alt + H | Read all big O recommendations one at a time |
---
## **Author & License**

Developed by Group 1 - Team Jacob  
