import * as vscode from 'vscode';
import { AnthropicChatProvider } from './chatProvider';
import { AnthropicCompletionProvider } from './completionProvider';
import { AnthropicService } from './anthropicService';

export function activate(context: vscode.ExtensionContext) {
    const anthropicService = new AnthropicService();
    const chatProvider = new AnthropicChatProvider(context, anthropicService);
    const completionProvider = new AnthropicCompletionProvider(anthropicService);

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

    const completionProviderDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        completionProvider
    );

    context.subscriptions.push(
        openPanelCommand,
        askAboutCurrentFileCommand,
        explainSelectionCommand,
        generateCodeCommand,
        clearHistoryCommand,
        completionProviderDisposable,
        chatProvider
    );

    vscode.window.showInformationMessage('Anthropic Copilot Chat Extension activated!');
}

export function deactivate() {}
