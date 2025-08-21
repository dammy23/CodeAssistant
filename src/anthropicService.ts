import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AnthropicResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    id: string;
    model: string;
    role: string;
    stop_reason: string;
    stop_sequence: null;
    type: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export class AnthropicService {
    private cachedApiKey: string | null = null;
    private configChangeListener: vscode.Disposable | null = null;

    constructor() {
        this.setupConfigurationListener();
        this.refreshApiKey();
    }

    private setupConfigurationListener(): void {
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('anthropicChat.apiKey')) {
                console.log('AnthropicService: Configuration changed, refreshing API key');
                this.refreshApiKey();
            }
        });
    }

    private refreshApiKey(): void {
        const config = vscode.workspace.getConfiguration('anthropicChat');
        this.cachedApiKey = config.get<string>('apiKey', '') || null;
        console.log('AnthropicService: API key refreshed from config...', this.cachedApiKey ? 'FOUND' : 'NOT FOUND');
    }

    private getConfig() {
        return vscode.workspace.getConfiguration('anthropicChat');
    }

    private getApiKey(): string {
        if (!this.cachedApiKey) {
            this.refreshApiKey();
        }
        
        console.log('AnthropicService: Using cached API key...', this.cachedApiKey ? 'FOUND' : 'NOT FOUND');
        
        if (!this.cachedApiKey) {
            throw new Error('Anthropic API key not configured. Please set it in VS Code settings.');
        }
        return this.cachedApiKey;
    }

    public dispose(): void {
        if (this.configChangeListener) {
            this.configChangeListener.dispose();
        }
    }

    async sendMessage(messages: AnthropicMessage[]): Promise<string> {
        try {
            const config = this.getConfig();
            const apiKey = this.getApiKey();
            const model = config.get<string>('model', 'claude-3-sonnet-20240229');
            const maxTokens = config.get<number>('maxTokens', 1024);
            const temperature = config.get<number>('temperature', 0.7);
            const baseUrl = config.get<string>('baseUrl', 'https://api.anthropic.com');

            const response: AxiosResponse<AnthropicResponse> = await axios.post(
                `${baseUrl}/v1/messages`,
                {
                    model,
                    max_tokens: maxTokens,
                    temperature,
                    messages
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 30000
                }
            );

            if (response.data.content && response.data.content.length > 0) {
                return response.data.content[0].text;
            }

            throw new Error('No content in response');
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || error.response.statusText;
                
                if (status === 401) {
                    throw new Error('Invalid API key. Please check your Anthropic API key in settings.');
                } else if (status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (status >= 500) {
                    throw new Error('Anthropic service is temporarily unavailable. Please try again later.');
                } else {
                    throw new Error(`API Error (${status}): ${message}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please check your internet connection.');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Network error. Please check your internet connection.');
            } else {
                throw new Error(`Unexpected error: ${error.message}`);
            }
        }
    }

    async getCompletion(prompt: string, context: string): Promise<string> {
        const messages: AnthropicMessage[] = [
            {
                role: 'user',
                content: this.buildAdvancedCompletionPrompt(prompt, context)
            }
        ];

        return this.sendMessage(messages);
    }

    buildContextFromWorkspace(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return '';
        }

        const config = this.getConfig();
        const contextDepth = config.get<number>('contextDepth', 5);
        
        let context = `Workspace: ${workspaceFolders[0].name}\n`;
        
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const fileName = activeEditor.document.fileName;
            const content = activeEditor.document.getText();
            context += `\nCurrent file: ${fileName}\n${content.substring(0, 2000)}\n`;
        }

        return context;
    }

    buildEnhancedContextFromWorkspace(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return 'No workspace folder detected.';
        }

        const config = this.getConfig();
        const contextDepth = config.get<number>('contextDepth', 5);
        
        let context = `WORKSPACE ANALYSIS:
Project: ${workspaceFolders[0].name}
Root: ${workspaceFolders[0].uri.fsPath}

`;
        
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const fileName = activeEditor.document.fileName;
            const language = activeEditor.document.languageId;
            const content = activeEditor.document.getText();
            const lineCount = activeEditor.document.lineCount;
            
            context += `CURRENT FILE CONTEXT:
File: ${fileName}
Language: ${language}
Lines: ${lineCount}
Content Preview:
\`\`\`${language}
${content.substring(0, 2000)}${content.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

`;
        }

        const openEditors = vscode.window.visibleTextEditors;
        if (openEditors.length > 1) {
            context += `OPEN FILES:
${openEditors.map(editor => `- ${editor.document.fileName} (${editor.document.languageId})`).join('\n')}

`;
        }

        return context;
    }

    buildAdvancedChatPrompt(userMessage: string, workspaceContext: string): string {
        return `You are Claude, an AI assistant specialized in software development. You have expertise across multiple programming languages, frameworks, and development practices.

WORKSPACE CONTEXT:
${workspaceContext}

ROLE & CAPABILITIES:
- Expert code analysis and explanation
- Architecture and design pattern guidance  
- Debugging and troubleshooting assistance
- Code review and improvement suggestions
- Best practices recommendations

RESPONSE GUIDELINES:
1. Provide accurate, helpful, and actionable advice
2. Use specific examples from the user's codebase when relevant
3. Explain complex concepts clearly with step-by-step reasoning
4. Suggest concrete improvements with code examples
5. Consider security, performance, and maintainability implications

USER QUESTION:
${userMessage}

RESPONSE:`;
    }

    private buildAdvancedCompletionPrompt(prompt: string, context: string): string {
        const activeEditor = vscode.window.activeTextEditor;
        const language = activeEditor?.document.languageId || 'unknown';
        
        return `You are an expert ${language} developer with deep knowledge of best practices, design patterns, and modern development techniques.

CONTEXT ANALYSIS:
${context}

CURRENT CODE TO COMPLETE:
\`\`\`${language}
${prompt}
\`\`\`

INSTRUCTIONS:
1. Analyze the surrounding code context to understand the intent and patterns
2. Consider the file structure, imports, and existing code style
3. Generate a completion that:
   - Follows the established code patterns and conventions
   - Uses appropriate variable names and function signatures
   - Implements best practices for ${language}
   - Is syntactically correct and logically sound
   - Maintains consistency with the existing codebase

COMPLETION REQUIREMENTS:
- Provide ONLY the code that should complete the current line/block
- Do not include explanations or comments unless they exist in the surrounding code
- Ensure the completion integrates seamlessly with existing code
- Consider edge cases and error handling where appropriate

COMPLETION:`;
    }
}
