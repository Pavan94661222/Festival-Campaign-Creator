require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Data Helpers ───────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

function readJSON(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function writeJSON(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Gemini AI Campaign Generation ──────────────────────────────
async function generateCampaign(input) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set in .env');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert Marketing Campaign Strategist for restaurants. 
Create a complete festival campaign package based on the following details:

Festival/Season: ${input.festivalName}
Kitchen Capacity for Specials: ${input.kitchenCapacity}
Budget for Offers: ${input.budget}
Target Customer Segment: ${input.targetSegment}

STRICT OUTPUT FORMAT:
Provide the output in JSON format with the following keys:
1. "theme": { "concept": "Brief concept name", "tagline": "Catchy tagline" }
2. "menuSuggestions": [{"itemName": "Dish Name", "description": "Short description"}] (3-5 items)
3. "socialMediaCalendar": [{"theme": "Day Theme", "caption": "Post caption with emojis"}] (7 days)
4. "whatsappSequence": [{"template": "The full message text"}] (3 messages)
5. "corporateOfferLetter": "The full text of a professional letter"
6. "exampleOutput": "A concise summary like: 'Diwali Feast at Spice Garden: Share the sweetness. Special Thali — 7 dishes, 1 dessert. ₹599/person. Available Oct 28–Nov 3. Book a table for 6+ and get complimentary Gulab Jamun platter. 🪔 [Book: link] Only 12 Thali sets per day.'"

Ensure the tone is festive, professional, and optimized for the target segment. Use Indian cultural context where appropriate.
Return ONLY the JSON. No markdown formatting like \`\`\`json.`;

    try {
        console.log('📡 Calling Gemini AI (gemini-3.5-flash) for campaign generation...');
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt
        });

        let text = response.text;
        
        // Clean up the response if it contains markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(text);
    } catch (error) {
        console.error('❌ Gemini AI error:', error.message);
        throw error;
    }
}

// ─── WhatsApp Delivery (TextMeBot) ──────────────────────────────
async function sendWhatsApp(message) {
    const recipient = process.env.WHATSAPP_PHONE;
    const apikey = process.env.TEXTMEBOT_API_KEY;
    if (!recipient || !apikey) return { sent: false, detail: 'not configured' };

    const url = `http://api.textmebot.com/send.php?recipient=${encodeURIComponent(recipient)}` +
        `&apikey=${encodeURIComponent(apikey)}` +
        `&text=${encodeURIComponent(message || '')}&json=yes`;

    try {
        const r = await fetch(url);
        const body = await r.text();
        console.log('📲 TextMeBot response:', body);
        let ok = r.ok;
        try {
            const parsed = JSON.parse(body);
            if (parsed.status) ok = parsed.status === 'success';
        } catch { /* non-JSON response */ }
        return { sent: ok, detail: body };
    } catch (err) {
        console.error('⚠️ TextMeBot failed:', err.message);
        return { sent: false, detail: err.message };
    }
}

// ─── API Endpoints ──────────────────────────────────────────────
app.post('/api/generate-campaign', async (req, res) => {
    try {
        const campaignData = await generateCampaign(req.body);
        const campaignId = uuidv4();
        const campaignRecord = {
            id: campaignId,
            input: req.body,
            output: campaignData,
            timestamp: new Date().toISOString()
        };
        
        // Save to history
        let history = readJSON('campaigns.json') || [];
        history.push(campaignRecord);
        writeJSON('campaigns.json', history);

        // Send to n8n if URL is configured
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (n8nUrl) {
            console.log('📡 Forwarding campaign to n8n...');
            fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: campaignId, data: campaignData })
            }).catch(err => console.error('⚠️ n8n forward failed:', err.message));
        }

        // Send campaign summary to WhatsApp via TextMeBot
        const theme = campaignData.theme || {};
        const whatsappMessage =
            `🎉 *${req.body.festivalName} Campaign*\n` +
            `${theme.concept || ''}\n` +
            `${theme.tagline ? '_' + theme.tagline + '_\n' : ''}` +
            `\n${campaignData.exampleOutput || ''}`;
        const whatsapp = await sendWhatsApp(whatsappMessage);

        res.json({ success: true, data: campaignData, id: campaignId, whatsapp });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/campaigns', (req, res) => {
    const history = readJSON('campaigns.json') || [];
    res.json(history);
});

// ─── n8n Webhook Integration (Mock) ─────────────────────────────
// In a real scenario, n8n would call this or this would call n8n.
// For this task, we'll provide an endpoint that n8n can hit.
app.post('/api/webhook/n8n', async (req, res) => {
    console.log('📩 Received request from n8n:', req.body);
    // Process n8n request...
    res.json({ message: 'Connected to n8n successfully', received: req.body });
});

app.listen(PORT, () => {
    console.log(`🚀 Festival Campaign Creator running on http://localhost:${PORT}`);
});
