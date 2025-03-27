
# EchoCode — Python Error Reader for Visually Impaired Programmers

**EchoCode** is a Visual Studio Code extension designed to help **visually impaired beginner Python programmers** by reading out critical Python errors aloud using Pylint. It helps users debug their code with clear, concise, and actionable feedback.

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

- **Auto-Detection of Missing Tools**  
  Automatically prompts users to install **Pylint** if it’s not found.

- **Function Navigation via Hotkeys**  
  Use **Ctrl+Alt+Up/Down Arrow** to navigate between function definitions, with automatic speech announcing the current function.

---

##  **Requirements**

Before using EchoCode, ensure the following are installed:

1. **[Python](https://www.python.org/downloads/)** (version 3.6 or higher)
2. **Pylint** (automatically detected; will prompt for installation if missing):
   ```bash
   pip install pylint
   ```
3. **[Python Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)** (auto-installed if missing)

---

##  **Extension Settings**

As of now, there are no additional settings. However, future versions will allow customization of:

-  **Speech speed**  
-  **Voice selection**  
- 🎙 **Verbosity level (brief/detailed explanations)**  

---

##  **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.
- Currently only works on WindowOS machines.

---

## **Release Notes**

### **1.1.0**
- Added keyboard navigation for moving between Python functions using Ctrl+Alt+Up/Down
- Automatically announces the function name upon navigation
- Prevents overlapping speech if navigating quickly
---

## **Author & License**

Developed by Group 1 - Team Jacob  
>>>>>>> 8e90d0f (First commit of working EchoCode)
