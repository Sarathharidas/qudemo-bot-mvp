const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing
app.use(express.json());

// Serve static files from public directory with no cache
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Serve videos from videos directory
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to match user question with OpenAI
app.post('/api/match-question', async (req, res) => {
    try {
        const { userQuestion } = req.body;
        
        if (!userQuestion) {
            return res.status(400).json({ error: 'Question is required' });
        }
        
        // Load video flow to get all available questions
        const videoFlowPath = path.join(__dirname, 'public', 'video-flow.json');
        const videoFlowData = require(videoFlowPath);
        
        // Extract all questions from video flow
        const availableQuestions = videoFlowData.videos
            .filter(v => v.question)
            .map(v => ({
                id: v.id,
                question: v.question,
                title: v.title,
                answer: v.answer
            }));
        
        // Use OpenAI to find the best match
        const matchedQuestion = await findBestMatchWithOpenAI(userQuestion, availableQuestions);
        
        // If no match found, return fallback video
        if (!matchedQuestion.matched) {
            console.log('No match found, returning fallback video');
            return res.json({
                matched: true,
                videoId: 'video_fallback',
                question: 'Fallback Response',
                confidence: 'fallback',
                isFallback: true
            });
        }
        
        res.json(matchedQuestion);
    } catch (error) {
        console.error('Error matching question:', error);
        res.status(500).json({ 
            error: 'Failed to match question',
            matched: false 
        });
    }
});

async function findBestMatchWithOpenAI(userQuestion, availableQuestions) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.log('OpenAI API key not configured, using fallback matching');
        return fallbackQuestionMatching(userQuestion, availableQuestions);
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Create a prompt for OpenAI to find the best match
        const questionsText = availableQuestions.map((q, i) => 
            `${i + 1}. ${q.question}`
        ).join('\n');
        
        const prompt = `You are a helpful assistant that matches user questions to a list of available questions about Qudemo (an interactive video demo platform).

User asked: "${userQuestion}"

Available questions about Qudemo:
${questionsText}

Instructions:
- If the user asks a generic question like "what is this about", "tell me about this", "what does this do", match it to "What is Qudemo?" (usually question 1)
- If the user asks "how does it work", "how do I use this", match it to "How does Qudemo work?" (usually question 2)
- If the user asks "who is this for", "who can use this", match it to "Who is Qudemo for?" (usually question 3)
- Match based on meaning and intent, not just keywords
- If truly no match, respond with "0"

Which question number (1-${availableQuestions.length}) best matches the user's question?

Respond with ONLY the number, nothing else.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a question matching assistant. Respond only with a number.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 10
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('OpenAI API error:', data.error);
            return fallbackQuestionMatching(userQuestion, availableQuestions);
        }
        
        const matchNumber = parseInt(data.choices[0].message.content.trim());
        
        if (matchNumber > 0 && matchNumber <= availableQuestions.length) {
            const matched = availableQuestions[matchNumber - 1];
            return {
                matched: true,
                videoId: matched.id,
                question: matched.question,
                confidence: 'high'
            };
        } else {
            return { matched: false };
        }
    } catch (error) {
        console.error('OpenAI matching error:', error);
        return fallbackQuestionMatching(userQuestion, availableQuestions);
    }
}

function fallbackQuestionMatching(userQuestion, availableQuestions) {
    const lowerQuestion = userQuestion.toLowerCase().trim();
    
    // Handle generic/contextual questions first
    const genericPatterns = {
        'what is qudemo': ['what is qudemo', 'what is this', 'what is it', 'tell me about', 'what does this do', 'what is this about', 'explain this', 'what are you', 'what do you do'],
        'how does qudemo work': ['how does', 'how do i', 'how to use', 'how it works', 'how do you'],
        'who is qudemo for': ['who is this for', 'who can use', 'who should use', 'target audience', 'who needs'],
        'what is the pricing': ['how much', 'cost', 'price', 'pricing', 'payment', 'expensive'],
        'how secure is my data': ['secure', 'security', 'safe', 'privacy', 'data protection']
    };
    
    // Check for generic patterns
    for (const [targetQuestion, patterns] of Object.entries(genericPatterns)) {
        for (const pattern of patterns) {
            if (lowerQuestion.includes(pattern)) {
                // Find the matching question in availableQuestions
                const match = availableQuestions.find(q => 
                    q.question.toLowerCase().includes(targetQuestion)
                );
                if (match) {
                    return {
                        matched: true,
                        videoId: match.id,
                        question: match.question,
                        confidence: 'high'
                    };
                }
            }
        }
    }
    
    // If no generic pattern matched, try keyword-based matching
    const keywords = lowerQuestion.split(' ').filter(word => word.length > 3);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const q of availableQuestions) {
        const questionText = q.question.toLowerCase();
        let score = 0;
        
        for (const keyword of keywords) {
            if (questionText.includes(keyword)) {
                score++;
            }
        }
        
        // Lower threshold to 1 keyword for better matching
        if (score > bestScore && score >= 1) {
            bestScore = score;
            bestMatch = q;
        }
    }
    
    if (bestMatch) {
        return {
            matched: true,
            videoId: bestMatch.id,
            question: bestMatch.question,
            confidence: 'medium'
        };
    }
    
    return { matched: false };
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Make sure to place your video files in the videos/ directory:');
    console.log('- video_1.mp4 (intro video)');
    console.log('- video_2.mp4 (What is Qudemo?)');
    console.log('- video_3.mp4 (How does Qudemo work?)');
    console.log('- video_4.mp4 (Who is Qudemo for?)');
});
