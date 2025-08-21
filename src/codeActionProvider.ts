import * as vscode from 'vscode';
import { AnthropicService } from './anthropicService';

export class AnthropicCodeActionProvider implements vscode.CodeActionProvider {
    constructor(private anthropicService: AnthropicService) {}

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                const fixAction = new vscode.CodeAction(
                    `🤖 Fix with Anthropic AI: ${diagnostic.message}`,
                    vscode.CodeActionKind.QuickFix
                );
                
                fixAction.command = {
                    command: 'anthropicChat.fixError',
                    title: 'Fix Error with AI',
                    arguments: [document, diagnostic, range]
                };

                fixAction.diagnostics = [diagnostic];
                fixAction.isPreferred = true;
                actions.push(fixAction);
            }

            if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
                const improveAction = new vscode.CodeAction(
                    `💡 Improve with Anthropic AI: ${diagnostic.message}`,
                    vscode.CodeActionKind.RefactorRewrite
                );
                
                improveAction.command = {
                    command: 'anthropicChat.improveCode',
                    title: 'Improve Code with AI',
                    arguments: [document, diagnostic, range]
                };

                improveAction.diagnostics = [diagnostic];
                actions.push(improveAction);
            }
        }

        if (actions.length === 0 && !range.isEmpty) {
            const refactorAction = new vscode.CodeAction(
                '🔧 Refactor with Anthropic AI',
                vscode.CodeActionKind.Refactor
            );
            
            refactorAction.command = {
                command: 'anthropicChat.refactorSelection',
                title: 'Refactor Selection with AI',
                arguments: [document, range]
            };

            actions.push(refactorAction);
        }

        return actions;
    }

    async fixError(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic,
        range: vscode.Range
    ): Promise<void> {
        try {
            const problemCode = document.getText(diagnostic.range);
            const surroundingCode = this.getSurroundingCode(document, diagnostic.range);
            const fileContext = this.getFileContext(document);
            
            const prompt = this.buildErrorFixPrompt(
                problemCode,
                diagnostic.message,
                surroundingCode,
                fileContext,
                document.languageId
            );

            const response = await this.anthropicService.sendMessage([{
                role: 'user',
                content: prompt
            }]);

            const fixedCode = this.extractCodeFromResponse(response);
            
            if (fixedCode) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, diagnostic.range, fixedCode);
                
                const applied = await vscode.workspace.applyEdit(edit);
                if (applied) {
                    vscode.window.showInformationMessage('✅ Code fixed with Anthropic AI!');
                } else {
                    vscode.window.showErrorMessage('Failed to apply the fix');
                }
            } else {
                vscode.window.showWarningMessage('Could not generate a suitable fix');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error fixing code: ${error.message}`);
        }
    }

    async improveCode(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic,
        range: vscode.Range
    ): Promise<void> {
        try {
            const problemCode = document.getText(diagnostic.range);
            const surroundingCode = this.getSurroundingCode(document, diagnostic.range);
            const fileContext = this.getFileContext(document);
            
            const prompt = this.buildCodeImprovementPrompt(
                problemCode,
                diagnostic.message,
                surroundingCode,
                fileContext,
                document.languageId
            );

            const response = await this.anthropicService.sendMessage([{
                role: 'user',
                content: prompt
            }]);

            const improvedCode = this.extractCodeFromResponse(response);
            
            if (improvedCode) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, diagnostic.range, improvedCode);
                
                const applied = await vscode.workspace.applyEdit(edit);
                if (applied) {
                    vscode.window.showInformationMessage('✅ Code improved with Anthropic AI!');
                } else {
                    vscode.window.showErrorMessage('Failed to apply the improvement');
                }
            } else {
                vscode.window.showWarningMessage('Could not generate a suitable improvement');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error improving code: ${error.message}`);
        }
    }

    async refactorSelection(
        document: vscode.TextDocument,
        range: vscode.Range
    ): Promise<void> {
        try {
            const selectedCode = document.getText(range);
            const surroundingCode = this.getSurroundingCode(document, range);
            const fileContext = this.getFileContext(document);
            
            const prompt = this.buildRefactorPrompt(
                selectedCode,
                surroundingCode,
                fileContext,
                document.languageId
            );

            const response = await this.anthropicService.sendMessage([{
                role: 'user',
                content: prompt
            }]);

            const refactoredCode = this.extractCodeFromResponse(response);
            
            if (refactoredCode) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, refactoredCode);
                
                const applied = await vscode.workspace.applyEdit(edit);
                if (applied) {
                    vscode.window.showInformationMessage('✅ Code refactored with Anthropic AI!');
                } else {
                    vscode.window.showErrorMessage('Failed to apply the refactoring');
                }
            } else {
                vscode.window.showWarningMessage('Could not generate a suitable refactoring');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error refactoring code: ${error.message}`);
        }
    }

    private getSurroundingCode(document: vscode.TextDocument, range: vscode.Range): string {
        const startLine = Math.max(0, range.start.line - 10);
        const endLine = Math.min(document.lineCount - 1, range.end.line + 10);
        const surroundingRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
        return document.getText(surroundingRange);
    }

    private getFileContext(document: vscode.TextDocument): string {
        const fileName = document.fileName;
        const language = document.languageId;
        const lineCount = document.lineCount;
        
        return `File: ${fileName}\nLanguage: ${language}\nLines: ${lineCount}`;
    }

    private buildErrorFixPrompt(
        problemCode: string,
        errorMessage: string,
        surroundingCode: string,
        fileContext: string,
        language: string
    ): string {
        return `You are an expert ${language} developer. I need you to fix a code error.

CONTEXT:
${fileContext}

ERROR MESSAGE:
${errorMessage}

PROBLEMATIC CODE:
\`\`\`${language}
${problemCode}
\`\`\`

SURROUNDING CODE FOR CONTEXT:
\`\`\`${language}
${surroundingCode}
\`\`\`

INSTRUCTIONS:
1. Analyze the error message and problematic code
2. Consider the surrounding code context
3. Provide ONLY the fixed code that should replace the problematic code
4. Ensure the fix maintains the original functionality while resolving the error
5. Follow ${language} best practices and conventions
6. Do not include explanations, just the corrected code

FIXED CODE:`;
    }

    private buildCodeImprovementPrompt(
        problemCode: string,
        warningMessage: string,
        surroundingCode: string,
        fileContext: string,
        language: string
    ): string {
        return `You are an expert ${language} developer. I need you to improve code that has a warning.

CONTEXT:
${fileContext}

WARNING MESSAGE:
${warningMessage}

CODE TO IMPROVE:
\`\`\`${language}
${problemCode}
\`\`\`

SURROUNDING CODE FOR CONTEXT:
\`\`\`${language}
${surroundingCode}
\`\`\`

INSTRUCTIONS:
1. Analyze the warning message and code
2. Consider the surrounding code context
3. Provide ONLY the improved code that should replace the original code
4. Address the warning while maintaining functionality
5. Apply ${language} best practices and modern conventions
6. Optimize for readability, performance, and maintainability
7. Do not include explanations, just the improved code

IMPROVED CODE:`;
    }

    private buildRefactorPrompt(
        selectedCode: string,
        surroundingCode: string,
        fileContext: string,
        language: string
    ): string {
        return `You are an expert ${language} developer. I need you to refactor the selected code.

CONTEXT:
${fileContext}

CODE TO REFACTOR:
\`\`\`${language}
${selectedCode}
\`\`\`

SURROUNDING CODE FOR CONTEXT:
\`\`\`${language}
${surroundingCode}
\`\`\`

INSTRUCTIONS:
1. Analyze the selected code and its context
2. Refactor to improve code quality, readability, and maintainability
3. Apply ${language} best practices and design patterns
4. Optimize performance where possible
5. Ensure the refactored code maintains the same functionality
6. Consider extracting reusable functions/methods if beneficial
7. Provide ONLY the refactored code, no explanations

REFACTORED CODE:`;
    }

    private extractCodeFromResponse(response: string): string | null {
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/;
        const match = response.match(codeBlockRegex);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        const lines = response.split('\n');
        const codeLines = lines.filter(line => 
            !line.startsWith('FIXED CODE:') && 
            !line.startsWith('IMPROVED CODE:') && 
            !line.startsWith('REFACTORED CODE:') &&
            line.trim() !== ''
        );
        
        if (codeLines.length > 0) {
            return codeLines.join('\n').trim();
        }
        
        return null;
    }
}
