import * as vscode from 'vscode';
import { AnthropicService, AnthropicMessage } from './anthropicService';

export class AnthropicChatProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private messages: AnthropicMessage[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private anthropicService: AnthropicService
    ) {}

    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'anthropicChat',
            'Anthropic Assistant',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this.handleUserMessage(message.text);
                    break;
                case 'clearHistory':
                    this.clearHistory();
                    break;
            }
        });
    }

    public askAboutFile(fileName: string, content: string): void {
        const message = `Please analyze this file and explain its purpose, functionality, and how it fits into the project architecture:

FILE: ${fileName}
\`\`\`
${content.substring(0, 2000)}${content.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

Please provide:
1. A summary of what this file does
2. Key functions/classes and their purposes  
3. Dependencies and relationships with other parts of the codebase
4. Any potential improvements or concerns`;
        this.sendMessageToChat(message);
    }

    public explainSelection(selectedText: string, fileName: string): void {
        const message = `Please provide a detailed explanation of this code snippet:

FILE: ${fileName}
\`\`\`
${selectedText}
\`\`\`

Please explain:
1. What this code does step-by-step
2. The purpose and logic behind each part
3. Any design patterns or techniques used
4. Potential edge cases or considerations
5. Suggestions for improvement if any`;
        this.sendMessageToChat(message);
    }

    public focusInput(prefillText: string = ''): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'focusInput',
                text: prefillText
            });
        }
    }

    public clearHistory(): void {
        this.messages = [];
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'clearMessages'
            });
        }
    }

    private async sendMessageToChat(userMessage: string): Promise<void> {
        if (!this.panel) {
            return;
        }

        this.messages.push({ role: 'user', content: userMessage });
        
        this.panel.webview.postMessage({
            type: 'addMessage',
            message: {
                role: 'user',
                content: userMessage,
                timestamp: new Date().toLocaleTimeString()
            }
        });

        this.panel.webview.postMessage({
            type: 'showLoading'
        });

        try {
            const workspaceContext = this.anthropicService.buildEnhancedContextFromWorkspace();
            const contextualMessages: AnthropicMessage[] = [
                {
                    role: 'user',
                    content: this.anthropicService.buildAdvancedChatPrompt(userMessage, workspaceContext)
                }
            ];

            const response = await this.anthropicService.sendMessage(contextualMessages);
            
            this.messages.push({ role: 'assistant', content: response });

            this.panel.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: response,
                    timestamp: new Date().toLocaleTimeString()
                }
            });
        } catch (error: any) {
            this.panel.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: `Error: ${error.message}`,
                    timestamp: new Date().toLocaleTimeString(),
                    isError: true
                }
            });
        } finally {
            this.panel.webview.postMessage({
                type: 'hideLoading'
            });
        }
    }

    private async handleUserMessage(userMessage: string): Promise<void> {
        await this.sendMessageToChat(userMessage);
    }

    private getWebviewContent(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anthropic Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 10px 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-panel-background);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .clear-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .clear-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .message {
            max-width: 80%;
            padding: 10px 12px;
            border-radius: 8px;
            word-wrap: break-word;
            position: relative;
        }
        
        .message.user {
            align-self: flex-end;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .message.assistant {
            align-self: flex-start;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        
        .message.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        
        .message-timestamp {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 5px;
        }
        
        .message pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        .message code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        .input-container {
            padding: 15px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-panel-background);
        }
        
        .input-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        .message-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 4px;
            resize: vertical;
            min-height: 20px;
            max-height: 100px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        
        .message-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
        }
        
        .send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .loading {
            display: none;
            align-self: flex-start;
            padding: 10px 12px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            max-width: 80%;
        }
        
        .loading.show {
            display: block;
        }
        
        .loading-dots {
            display: inline-block;
        }
        
        .loading-dots::after {
            content: '';
            animation: dots 1.5s steps(4, end) infinite;
        }
        
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
        
        .welcome-message {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .welcome-message h3 {
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Anthropic Assistant</h2>
        <button class="clear-button" onclick="clearHistory()">Clear</button>
    </div>
    
    <div class="messages-container" id="messagesContainer">
        <div class="welcome-message">
            <h3>Welcome to Anthropic Assistant!</h3>
            <p>Ask me questions about your code, request explanations, or get help with development tasks.</p>
            <p>I can analyze your workspace and provide context-aware responses.</p>
        </div>
    </div>
    
    <div class="loading" id="loadingIndicator">
        <span class="loading-dots">Thinking</span>
    </div>
    
    <div class="input-container">
        <div class="input-row">
            <textarea 
                class="message-input" 
                id="messageInput" 
                placeholder="Ask me anything about your code..."
                rows="1"
            ></textarea>
            <button class="send-button" id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const loadingIndicator = document.getElementById('loadingIndicator');

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });

            messageInput.value = '';
            messageInput.style.height = 'auto';
        }

        function clearHistory() {
            vscode.postMessage({
                type: 'clearHistory'
            });
        }

        function addMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.role}\${message.isError ? ' error' : ''}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = formatMessageContent(message.content);
            messageDiv.appendChild(contentDiv);
            
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'message-timestamp';
            timestampDiv.textContent = message.timestamp;
            messageDiv.appendChild(timestampDiv);
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function formatMessageContent(content) {
            return content
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
        }

        function clearMessages() {
            messagesContainer.innerHTML = \`
                <div class="welcome-message">
                    <h3>Welcome to Anthropic Assistant!</h3>
                    <p>Ask me questions about your code, request explanations, or get help with development tasks.</p>
                    <p>I can analyze your workspace and provide context-aware responses.</p>
                </div>
            \`;
        }

        function showLoading() {
            loadingIndicator.classList.add('show');
            sendButton.disabled = true;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function hideLoading() {
            loadingIndicator.classList.remove('show');
            sendButton.disabled = false;
        }

        function focusInput(text = '') {
            messageInput.value = text;
            messageInput.focus();
            if (text) {
                messageInput.setSelectionRange(text.length, text.length);
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'addMessage':
                    addMessage(message.message);
                    break;
                case 'clearMessages':
                    clearMessages();
                    break;
                case 'showLoading':
                    showLoading();
                    break;
                case 'hideLoading':
                    hideLoading();
                    break;
                case 'focusInput':
                    focusInput(message.text);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
