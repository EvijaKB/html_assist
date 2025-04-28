document.addEventListener('DOMContentLoaded', () => {
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(document.getElementById('htmlInput'), {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        lineWrapping: true
    });

    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const correctedHtml = document.getElementById('correctedHtml');
    const additions = document.getElementById('additions');
    const deletions = document.getElementById('deletions');
    const aiRequest = document.getElementById('aiRequest');

    analyzeBtn.addEventListener('click', async () => {
        const html = editor.getValue();
        const request = aiRequest.value.trim();

        if (!html) {
            alert('Please enter some HTML code');
            return;
        }

        if (!request) {
            alert('Please enter your request');
            return;
        }

        loading.classList.remove('hidden');
        result.classList.add('hidden');

        try {
            const response = await fetch('http://localhost:3000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    html,
                    request
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Display the corrected HTML
            correctedHtml.textContent = data.correctedHtml;
            
            // Display changes
            if (data.additions && data.additions.length > 0) {
                additions.innerHTML = data.additions.map(add => 
                    `<div class="changes-add">+ ${add}</div>`
                ).join('');
            } else {
                additions.innerHTML = '<div class="text-gray-500">No additions</div>';
            }

            if (data.deletions && data.deletions.length > 0) {
                deletions.innerHTML = data.deletions.map(del => 
                    `<div class="changes-remove">- ${del}</div>`
                ).join('');
            } else {
                deletions.innerHTML = '<div class="text-gray-500">No deletions</div>';
            }

            result.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
            correctedHtml.textContent = 'Error: Could not connect to the analysis server. Please make sure the backend server is running.';
            result.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        editor.setValue('');
        aiRequest.value = '';
        result.classList.add('hidden');
    });
}); 