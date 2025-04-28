# HTML Assistant

A powerful HTML analysis and modification tool that uses AI to help you improve your HTML code.

## Features

- HTML code analysis and improvement
- AI-powered code modifications
- Real-time preview
- Desktop and mobile view options
- Detailed change tracking

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/html-assistant.git
cd html-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment:
   - Copy `api_key.env.example` to `api_key.env`
   - Add your OpenAI API key to `api_key.env`

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and go to:
```
http://localhost:3000
```

3. Paste your HTML code in the input area
4. Enter your modification request (optional)
5. Click "Fix HTML" or press Ctrl+Enter
6. View the results in the preview and changes sections

## API Key Setup

1. Get an OpenAI API key from [OpenAI's website](https://platform.openai.com/api-keys)
2. Create a file named `api_key.env` in the project root
3. Add your API key:
```
OPENAI_API_KEY=your_api_key_here
```

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## License

MIT License - See LICENSE file for details 