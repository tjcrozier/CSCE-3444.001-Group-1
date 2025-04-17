// Script for the chat view
(function () {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // Elements
    const messagesContainer = document.getElementById('messages-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    
    let currentAssistantMessage = null;
    
    // Send a message
    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // Add user message to UI
        addMessageToUI('user', text);
        
        // Clear input
        userInput.value = '';
        
        // Send to extension
        vscode.postMessage({
            type: 'userInput',
            text: text
        });
        
        // Create placeholder for assistant response
        currentAssistantMessage = addMessageToUI('assistant', '');
    }
    
    // Add message to UI
    function addMessageToUI(role, text) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}-message`;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = text;
        
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return contentElement;
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    voiceButton.addEventListener('click', () => {
        vscode.postMessage({
            type: 'startVoiceRecognition'
        });
    });
    
    // Handle messages from the extension
    window.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
            case 'response':
                // For full responses
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent = message.text;
                    currentAssistantMessage = null;
                } else {
                    addMessageToUI('assistant', message.text);
                }
                break;
                
            case 'responseFragment':
                // For incremental responses
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent += message.text;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                break;
                
            case 'responseComplete':
                // Finalize the response
                currentAssistantMessage = null;
                break;
                
            case 'startVoiceInput':
                // Visual indicator that voice input is active
                voiceButton.classList.add('active');
                userInput.placeholder = 'Listening...';
                
                // In a real implementation, this would connect to speech recognition
                // For now, we'll simulate it after a delay
                setTimeout(() => {
                    voiceButton.classList.remove('active');
                    userInput.placeholder = 'Ask a question about your code...';
                }, 2000);
                break;
        }
        
        // Always scroll to the latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
})();