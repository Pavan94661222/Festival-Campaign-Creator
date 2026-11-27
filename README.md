# Festival & Seasonal Campaign Creator (MKT-02)

A powerful tool for restaurants to generate complete festival campaign packages using Gemini AI.

## Features
- **Festival Theme & Tagline**: Unique concepts for every major Indian festival.
- **Special Menu Suggestions**: 3–5 items based on kitchen capacity.
- **Social Media Calendar**: 7-day content plan for Instagram/Facebook.
- **WhatsApp Sequences**: 3 pre-written messages for customer engagement.
- **Corporate Offer Letter**: Professional letter for corporate catering.
- **n8n Integration**: Ready-to-use workflow for automation.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file (already created) with:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run the Project**:
   ```bash
   node server.js
   ```
   The project will be available at `http://localhost:3001`.

## n8n Workflow
The workflow JSON is located in `n8n/campaign-workflow.json`. 
1. Import this JSON into your n8n instance.
2. The workflow is triggered via a webhook.
3. It connects back to the project via `http://localhost:3001/api/webhook/n8n`.

## Project Structure
- `server.js`: Node.js/Express backend with Gemini AI integration.
- `public/`: Frontend assets (HTML, JS with Tailwind CSS).
- `data/`: Local storage for generated campaigns.
- `n8n/`: n8n workflow configuration.
