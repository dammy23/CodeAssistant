import * as vscode from 'vscode';
import { AnthropicChatProvider } from './chatProvider';
import { AnthropicCompletionProvider } from './completionProvider';
import { AnthropicCodeActionProvider } from './codeActionProvider';
import { AnthropicService } from './anthropicService';

export function activate(context: vscode.ExtensionContext) {
    const anthropicService = new AnthropicService();
    const chatProvider = new AnthropicChatProvider(context, anthropicService);
    const completionProvider = new AnthropicCompletionProvider(anthropicService);
    const codeActionProvider = new AnthropicCodeActionProvider(anthropicService);
    
    context.subscriptions.push(anthropicService);

    checkAndPromptForApiKey();

    const openPanelCommand = vscode.commands.registerCommand('anthropicChat.openPanel', () => {
        chatProvider.show();
    });

    const askAboutCurrentFileCommand = vscode.commands.registerCommand('anthropicChat.askAboutCurrentFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            const content = editor.document.getText();
            chatProvider.show();
            chatProvider.askAboutFile(fileName, content);
        } else {
            vscode.window.showWarningMessage('No active file to analyze');
        }
    });

    const explainSelectionCommand = vscode.commands.registerCommand('anthropicChat.explainSelection', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
            const selectedText = editor.document.getText(editor.selection);
            const fileName = editor.document.fileName;
            chatProvider.show();
            chatProvider.explainSelection(selectedText, fileName);
        } else {
            vscode.window.showWarningMessage('No text selected');
        }
    });

    const generateCodeCommand = vscode.commands.registerCommand('anthropicChat.generateCode', () => {
        chatProvider.show();
        chatProvider.focusInput('Generate code for: ');
    });

    const clearHistoryCommand = vscode.commands.registerCommand('anthropicChat.clearHistory', () => {
        chatProvider.clearHistory();
        vscode.window.showInformationMessage('Chat history cleared');
    });

    const setApiKeyCommand = vscode.commands.registerCommand('anthropicChat.setApiKey', () => {
        promptForApiKey();
    });

    const fixErrorCommand = vscode.commands.registerCommand('anthropicChat.fixError', 
        (document: vscode.TextDocument, diagnostic: vscode.Diagnostic, range: vscode.Range) => {
            codeActionProvider.fixError(document, diagnostic, range);
        }
    );

    const improveCodeCommand = vscode.commands.registerCommand('anthropicChat.improveCode',
        (document: vscode.TextDocument, diagnostic: vscode.Diagnostic, range: vscode.Range) => {
            codeActionProvider.improveCode(document, diagnostic, range);
        }
    );

    const refactorSelectionCommand = vscode.commands.registerCommand('anthropicChat.refactorSelection',
        (document: vscode.TextDocument, range: vscode.Range) => {
            codeActionProvider.refactorSelection(document, range);
        }
    );

    const completionProviderDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        completionProvider
    );

    const codeActionProviderDisposable = vscode.languages.registerCodeActionsProvider(
        { pattern: '**' },
        codeActionProvider,
        {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.Refactor,
                vscode.CodeActionKind.RefactorRewrite
            ]
        }
    );

    context.subscriptions.push(
        openPanelCommand,
        askAboutCurrentFileCommand,
        explainSelectionCommand,
        generateCodeCommand,
        clearHistoryCommand,
        setApiKeyCommand,
        fixErrorCommand,
        improveCodeCommand,
        refactorSelectionCommand,
        completionProviderDisposable,
        codeActionProviderDisposable,
        chatProvider
    );

    vscode.window.showInformationMessage('Anthropic Copilot Chat Extension activated!');
}

async function checkAndPromptForApiKey(): Promise<void> {
    const config = vscode.workspace.getConfiguration('anthropicChat');
    const apiKey = config.get<string>('apiKey', '');
    
    if (!apiKey) {
        const action = await vscode.window.showInformationMessage(
            'Welcome to Anthropic Copilot Chat Extension! To get started, you need to configure your Anthropic API key.',
            'Enter API Key',
            'Open Settings',
            'Later'
        );
        
        if (action === 'Enter API Key') {
            await promptForApiKey();
        } else if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'anthropicChat.apiKey');
        }
    }
}

async function promptForApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Anthropic API key',
        placeHolder: 'sk-ant-api03-...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value: string) => {
            if (!value) {
                return 'API key is required';
            }
            if (!value.startsWith('sk-ant-')) {
                return 'API key should start with "sk-ant-"';
            }
            if (value.length < 20) {
                return 'API key appears to be too short';
            }
            return null;
        }
    });
    
    if (apiKey) {
        const config = vscode.workspace.getConfiguration('anthropicChat');
        await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        
        console.log('Extension: API key saved to configuration');
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const freshConfig = vscode.workspace.getConfiguration('anthropicChat');
        const savedKey = freshConfig.get<string>('apiKey', '');
        console.log('Extension: Verification read after delay:', savedKey ? 'SUCCESS' : 'FAILED');
        console.log('Extension: Config inspection:', freshConfig.inspect('apiKey'));
        
        vscode.window.showInformationMessage(
            '✅ API key saved successfully! You can now use all Anthropic Copilot features.',
            'Open Chat Panel'
        ).then(action => {
            if (action === 'Open Chat Panel') {
                vscode.commands.executeCommand('anthropicChat.openPanel');
            }
        });
    }
}

export function deactivate() {}
