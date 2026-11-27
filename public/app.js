document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.__API_BASE__ || '';
    const form = document.getElementById('campaign-form');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const generateBtn = document.getElementById('generate-btn');

    // Tab logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update buttons
            tabBtns.forEach(b => {
                b.classList.remove('border-indigo-500', 'text-indigo-600');
                b.classList.add('text-gray-500');
            });
            btn.classList.add('border-indigo-500', 'text-indigo-600');
            btn.classList.remove('text-gray-500');

            // Update content
            tabContents.forEach(content => {
                if (content.id === `${tabId}-tab`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            festivalName: document.getElementById('festivalName').value,
            kitchenCapacity: document.getElementById('kitchenCapacity').value,
            budget: document.getElementById('budget').value,
            targetSegment: document.getElementById('targetSegment').value
        };

        // UI State: Loading
        emptyState.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';

        try {
            const response = await fetch(`${API_BASE}/api/generate-campaign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                displayResults(result.data);
            } else {
                alert('Error generating campaign: ' + result.error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            loadingDiv.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic mr-2"></i> Generate Campaign';
        }
    });

    function displayResults(data) {
        resultsDiv.classList.remove('hidden');
        
        // Example Output
        document.getElementById('exampleOutput').textContent = data.exampleOutput;

        // Theme
        const themeContent = document.getElementById('theme-content');
        themeContent.innerHTML = `
            <p class="text-indigo-900 font-bold text-xl">${data.theme.concept}</p>
            <p class="text-indigo-600 italic">"${data.theme.tagline}"</p>
        `;

        // Menu Suggestions
        const menuContent = document.getElementById('menu-content');
        menuContent.innerHTML = data.menuSuggestions.map(item => {
            const name = item.itemName || item.name || (typeof item === 'string' ? item : 'Special Item');
            const desc = item.description || '';
            return `
                <div class="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <h4 class="font-bold text-orange-900">${name}</h4>
                    <p class="text-sm text-orange-800">${desc}</p>
                </div>
            `;
        }).join('');

        // Social Media Calendar
        const socialContent = document.getElementById('social-content');
        socialContent.innerHTML = data.socialMediaCalendar.map((item, index) => {
            let content = '';
            if (typeof item === 'string') {
                content = item;
            } else if (typeof item === 'object' && item !== null) {
                // Handle various possible object structures from Gemini
                const theme = item.theme || item.postConcept || '';
                const caption = item.caption || item.content || '';
                content = `<strong>${theme}</strong><br>${caption}`;
            }
            
            return `
                <div class="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition">
                    <div class="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded shrink-0">Day ${index + 1}</div>
                    <div class="text-sm text-gray-700">${content}</div>
                </div>
            `;
        }).join('');

        // WhatsApp Sequence
        const whatsappContent = document.getElementById('whatsapp-content');
        whatsappContent.innerHTML = data.whatsappSequence.map((item, index) => {
            let content = '';
            if (typeof item === 'string') {
                content = item;
            } else if (typeof item === 'object' && item !== null) {
                // Handle various possible object structures
                content = item.template || item.message || item.content || JSON.stringify(item);
            }

            return `
                <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h4 class="text-xs font-bold text-green-600 uppercase mb-2">Message ${index + 1}</h4>
                    <p class="text-sm text-gray-800 whitespace-pre-wrap">${content}</p>
                </div>
            `;
        }).join('');

        // Corporate Offer Letter
        document.getElementById('corporate-content').textContent = data.corporateOfferLetter;
    }
});
