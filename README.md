# Anthropic Copilot Chat Extension

A VS Code extension that provides intelligent code completions and an interactive chatbot powered by Anthropic's Claude AI.

## Features

### 1. Inline Code Completions
- Intelligent suggestions appear as translucent "ghost text" as you type
- Context-aware completions based on current file and workspace
- Accept suggestions with `Tab` or `Enter`
- Dismiss suggestions with `Escape` or continue typing
- Works across all programming languages

### 2. Interactive Chat Panel
- Dedicated sidebar panel titled "Anthropic Assistant"
- Clean chat interface with message bubbles
- Conversation history persists during VS Code session
- Code blocks are syntax-highlighted and copyable
- Loading indicators during AI response generation

### 3. Command Palette Integration
Available commands:
- `Anthropic Chat: Open Panel` - Opens the chat sidebar
- `Anthropic Chat: Ask About Current File` - Starts chat with current file context
- `Anthropic Chat: Explain Selection` - Explains highlighted code
- `Anthropic Chat: Generate Code` - Opens chat for code generation requests
- `Anthropic Chat: Clear History` - Clears conversation history

### 4. Context-Aware Responses
- Automatically scans and indexes workspace files for context
- Understands project structure, dependencies, and file relationships
- Maintains context across conversations within the same session
- References specific files, functions, and variables in responses

## Configuration

### Required Settings
1. **API Key**: Set your Anthropic API key in VS Code settings
   - Go to Settings → Extensions → Anthropic Chat
   - Enter your API key in the "Api Key" field

### Optional Settings
- **Model Selection**: Choose between Claude models (claude-3-sonnet, claude-3-haiku, claude-3-opus)
- **Temperature**: Adjust response creativity vs consistency (0.0-1.0)
- **Max Tokens**: Set response length limits (1-4096)
- **Context Depth**: Number of files to include in context (1-20)
- **Completion Delay**: Delay before showing inline suggestions (100-2000ms)
- **Auto-complete Enabled**: Toggle inline completions on/off
- **Streaming Responses**: Enable/disable real-time response streaming
- **Panel Position**: Choose chat panel position (left/right/bottom sidebar)

## Installation

1. Download the `.vsix` file from the releases
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

## Usage Examples

### Getting Code Completions
1. Open any code file
2. Start typing - suggestions will appear automatically
3. Press `Tab` to accept or `Escape` to dismiss

### Using the Chat Panel
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Anthropic Chat: Open Panel"
3. Ask questions like:
   - "What does this function do?"
   - "How can I improve this code?"
   - "Explain how this algorithm works"
   - "Write a function that validates email addresses"

### Analyzing Code
1. Select code you want to understand
2. Run "Anthropic Chat: Explain Selection" from Command Palette
3. Get detailed explanations and suggestions

## Requirements

- VS Code 1.74.0 or higher
- Anthropic API key (get one at https://console.anthropic.com/)
- Internet connection for API calls

## Error Handling

The extension provides clear error messages for:
- Invalid API keys
- Rate limit exceeded
- Network connectivity issues
- Service unavailability

## Privacy & Security

- Your API key is stored securely in VS Code settings
- Code context is only sent to Anthropic's API when you explicitly use the extension
- No data is stored or logged locally beyond conversation history during the session

## Support

For issues, feature requests, or questions, please visit the GitHub repository.

## License

This extension is provided as-is for educational and development purposes.
