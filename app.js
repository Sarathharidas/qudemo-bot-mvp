const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// API route to get video flow data
app.get('/api/video-flow', (req, res) => {
    const videoFlow = {
        videos: [
            {
                id: 'video_1',
                src: '/videos/video_1.mp4',
                nextQuestions: [
                    {
                        id: 'question_1',
                        text: 'What is Qudemo?',
                        nextVideo: 'video_2'
                    },
                    {
                        id: 'question_2',
                        text: 'How does Qudemo work?',
                        nextVideo: 'video_3'
                    },
                    {
                        id: 'question_3',
                        text: 'Who is Qudemo for?',
                        nextVideo: 'video_4'
                    }
                ]
            },
            {
                id: 'video_2',
                src: '/videos/video_2.mp4',
                nextQuestions: null // Can add more questions here if needed
            },
            {
                id: 'video_3',
                src: '/videos/video_3.mp4',
                nextQuestions: null // Can add more questions here if needed
            },
            {
                id: 'video_4',
                src: '/videos/video_4.mp4',
                nextQuestions: null // Last video
            }
        ]
    };
    
    res.json(videoFlow);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Make sure to place your video files in the videos/ directory:');
    console.log('- video_1.mp4 (intro video)');
    console.log('- video_2.mp4 (What is Qudemo?)');
    console.log('- video_3.mp4 (How does Qudemo work?)');
    console.log('- video_4.mp4 (Who is Qudemo for?)');
});
