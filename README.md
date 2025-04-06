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

- **Auto-Detection of Missing Tools**  
  Automatically prompts users to install **Pylint** if it’s not found.

- **Function Navigation via Hotkeys**  
  Use **Ctrl+Alt+Up/Down Arrow** to navigate between function definitions, with automatic speech announcing the current function.
  
 - **Integration with GitHub Copilot**  
 Leverages GitHub Copilot for additional AI-powered coding assistance.


---
## **Keyboard Shortcuts**

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Alt+A` | `code-tutor.Annotate` | Generates the annotations. |
| `Ctrl+Alt+S` | `code-tutor.speakNextAnnotation` | Reads the next annotation, including line number and suggestion. |
| `Ctrl+Alt+Q` | `code-tutor.readAllAnnotation` | Reads all the annotations in the queue. |

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
## **How to Use**

To Navigate from Function to Function: 
- Press **Ctrl + Alt + Down Arrow** to move from function to function in descending order.
- Press **Ctrl + Alt + Up Arrow** to move from function to function in asscending order.

To hear a brief summary of the current Python class:
- Press "Ctrl + Alt + Space" followed by "C"

To hear a brief summary of the current Python function:
- Press "Ctrl + Alt + Space" followed by "F"
---
## **Extension Commands**

| Command | Description |
|---------|-------------|
| `echocode.readErrors` | Reads the most recent Python errors aloud. |
| `code-tutor.annotate` | Toggles tutor annotations for explanations and suggestions. |
| `echocode.readAllErrors` | Reads all detected Python errors aloud. |

---
## **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.

- Currently only works on WindowOS machines.
- When generating code summaries, multiple TTS triggers will still overlap.


---
## **Release Notes**


### **1.1.0**
- Added keyboard navigation for moving between Python functions using Ctrl+Alt+Up/Down
- Automatically announces the function name upon navigation
- Prevents overlapping speech if navigating quickly
---


---
## **Author & License**

Developed by Group 1 - Team Jacob  
