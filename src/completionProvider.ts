import * as vscode from 'vscode';
import { AnthropicService } from './anthropicService';

export class AnthropicCompletionProvider implements vscode.InlineCompletionItemProvider {
    private completionTimeout: NodeJS.Timeout | undefined;

    constructor(private anthropicService: AnthropicService) {}

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        const config = vscode.workspace.getConfiguration('anthropicChat');
        const autoCompleteEnabled = config.get<boolean>('autoCompleteEnabled', true);
        const completionDelay = config.get<number>('completionDelay', 500);

        if (!autoCompleteEnabled) {
            return null;
        }

        if (this.completionTimeout) {
            clearTimeout(this.completionTimeout);
        }

        return new Promise((resolve) => {
            this.completionTimeout = setTimeout(async () => {
                try {
                    if (token.isCancellationRequested) {
                        resolve(null);
                        return;
                    }

                    const linePrefix = document.lineAt(position).text.substring(0, position.character);
                    const lineSuffix = document.lineAt(position).text.substring(position.character);
                    
                    if (linePrefix.trim().length < 3) {
                        resolve(null);
                        return;
                    }

                    const contextRange = new vscode.Range(
                        Math.max(0, position.line - 10),
                        0,
                        Math.min(document.lineCount - 1, position.line + 5),
                        0
                    );
                    const contextText = document.getText(contextRange);
                    const workspaceContext = this.anthropicService.buildContextFromWorkspace();

                    const prompt = `${linePrefix}`;
                    const fullContext = `${workspaceContext}\n\nNearby code:\n${contextText}\n\nLine suffix: ${lineSuffix}`;

                    const completion = await this.anthropicService.getCompletion(prompt, fullContext);
                    
                    if (token.isCancellationRequested) {
                        resolve(null);
                        return;
                    }

                    const cleanCompletion = this.cleanCompletion(completion, linePrefix);
                    
                    if (cleanCompletion) {
                        const item = new vscode.InlineCompletionItem(cleanCompletion);
                        item.insertText = cleanCompletion;
                        resolve([item]);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Completion error:', error);
                    resolve(null);
                }
            }, completionDelay);
        });
    }

    private cleanCompletion(completion: string, linePrefix: string): string {
        let cleaned = completion.trim();
        
        if (cleaned.startsWith(linePrefix)) {
            cleaned = cleaned.substring(linePrefix.length);
        }
        
        const lines = cleaned.split('\n');
        if (lines.length > 5) {
            cleaned = lines.slice(0, 5).join('\n');
        }
        
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/^```\w*\n?/, '');
        cleaned = cleaned.replace(/\n?```$/, '');
        
        return cleaned.trim();
    }
}
