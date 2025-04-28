const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { JSDOM } = require('jsdom');
const { diffLines } = require('diff');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: 'api_key.env' });

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found in api_key.env file");
}

const client = new OpenAI({
    apiKey: apiKey
});

// Function to analyze and modify HTML based on request
function analyzeHtml(html, request) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Example analysis and modifications based on request
    let changes = {
        additions: [],
        deletions: []
    };

    // Add meta viewport tag if missing
    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        document.head.appendChild(meta);
        changes.additions.push('Added viewport meta tag for responsive design');
    }

    // Add alt attributes to images if missing
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.hasAttribute('alt')) {
            img.setAttribute('alt', 'Image description');
            changes.additions.push(`Added alt attribute to image: ${img.src}`);
        }
    });

    // Add lang attribute to html tag if missing
    if (!document.documentElement.hasAttribute('lang')) {
        document.documentElement.setAttribute('lang', 'en');
        changes.additions.push('Added lang attribute to HTML tag');
    }

    // Process the user's specific request
    if (request.toLowerCase().includes('add')) {
        // Example: Add a new div with some content
        const newDiv = document.createElement('div');
        newDiv.className = 'new-content';
        newDiv.textContent = 'New content added based on your request';
        document.body.appendChild(newDiv);
        changes.additions.push('Added new div with content');
    }

    if (request.toLowerCase().includes('remove')) {
        // Example: Remove empty paragraphs
        const paragraphs = document.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (!p.textContent.trim()) {
                p.remove();
                changes.deletions.push('Removed empty paragraph');
            }
        });
    }

    return {
        correctedHtml: dom.serialize(),
        additions: changes.additions,
        deletions: changes.deletions
    };
}

async function processAIRequest(htmlInput, aiRequest) {
    try {
        const prompt = `
        You are an expert HTML assistant. A user has provided the following HTML code and request:

        HTML:
        ${htmlInput}

        User Request:
        ${aiRequest}

        Please analyze the HTML and the user's request carefully. The request might include:
        - Adding elements at specific locations
        - Modifying existing elements
        - Changing styles or content
        - Adding new sections

        Return only the modified HTML code that implements the user's request. Make sure to:
        1. Preserve the original HTML structure
        2. Place new elements exactly where requested
        3. Maintain proper HTML formatting
        4. Keep all existing functionality

        Modified HTML:
        `;

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are an expert HTML assistant that helps users modify their HTML code according to their requests." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error in processAIRequest:", error);
        throw new Error(`Error processing AI request: ${error.message}`);
    }
}

function cleanHTML(htmlInput) {
    try {
        const dom = new JSDOM(htmlInput);
        const document = dom.window.document;

        // Fix common issues
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            // Remove empty attributes
            Array.from(element.attributes).forEach(attr => {
                if (!attr.value) {
                    element.removeAttribute(attr.name);
                }
            });

            // Ensure proper closing of void elements
            if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(element.tagName.toLowerCase())) {
                if (!element.outerHTML.endsWith('/>')) {
                    element.outerHTML = element.outerHTML.replace('>', '/>');
                }
            }
        });

        return dom.serialize();
    } catch (error) {
        console.error("Error in cleanHTML:", error);
        throw new Error(`Error cleaning HTML: ${error.message}`);
    }
}

function getDifferences(original, corrected) {
    try {
        const origLines = original.split('\n').map(line => line.trim()).filter(line => line);
        const corrLines = corrected.split('\n').map(line => line.trim()).filter(line => line);

        const additions = [];
        const deletions = [];

        let i = 0, j = 0;
        while (i < origLines.length || j < corrLines.length) {
            if (i < origLines.length && j < corrLines.length && origLines[i] === corrLines[j]) {
                i++;
                j++;
            } else {
                if (j < corrLines.length && (!i < origLines.length || origLines[i] !== corrLines[j])) {
                    additions.push(corrLines[j]);
                    j++;
                }
                if (i < origLines.length && (!j < corrLines.length || origLines[i] !== corrLines[j])) {
                    deletions.push(origLines[i]);
                    i++;
                }
            }
        }

        return {
            additions,
            deletions
        };
    } catch (error) {
        console.error("Error in getDifferences:", error);
        return { error: error.message };
    }
}

async function fixHTML(htmlInput, aiRequest = '') {
    if (!htmlInput) {
        return { html: "No HTML provided", changes: { additions: [], deletions: [] } };
    }

    try {
        const original = htmlInput;
        let fixed;

        if (aiRequest) {
            console.log(`Processing AI request: ${aiRequest}`);
            fixed = await processAIRequest(htmlInput, aiRequest);
            fixed = cleanHTML(fixed);
        } else {
            fixed = cleanHTML(htmlInput);
        }

        const changes = getDifferences(original, fixed);
        return { html: fixed, changes };
    } catch (error) {
        console.error("Error in fixHTML:", error);
        return { error: error.message };
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/fix', async (req, res) => {
    try {
        const { html, ai_request } = req.body;

        if (!html) {
            return res.status(400).json({ error: "No HTML input provided" });
        }

        console.log(`Received request: ${ai_request}`);
        const result = await fixHTML(html, ai_request);

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            corrected: result.html,
            changes: result.changes
        });
    } catch (error) {
        console.error("Error in /fix route:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/analyze', (req, res) => {
    try {
        console.log('Received analyze request');
        const { html, request } = req.body;
        
        if (!html) {
            console.log('No HTML content provided');
            return res.status(400).json({ error: 'HTML content is required' });
        }

        console.log('Processing HTML analysis');
        const result = analyzeHtml(html, request);
        console.log('Analysis complete, sending response');
        
        const response = {
            correctedHtml: result.correctedHtml || html,
            additions: result.additions || [],
            deletions: result.deletions || []
        };
        
        console.log('Response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            correctedHtml: html,
            additions: [],
            deletions: []
        });
    }
});

app.post('/analyze-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "No code provided" });
        }

        const prompt = `
        Please analyze the following code and provide:
        1. A brief explanation of what the code does
        2. Any potential issues or improvements
        3. Best practices that could be applied
        4. Any security considerations

        Code:
        ${code}
        `;

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are an expert code assistant that helps users understand and improve their code." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2
        });

        res.json({ 
            correctedHtml: response.choices[0].message.content,
            additions: [],
            deletions: []
        });
    } catch (error) {
        console.error("Error in /analyze-code route:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
