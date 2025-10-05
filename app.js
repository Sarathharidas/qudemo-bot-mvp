const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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
                nextQuestion: {
                    id: 'question_1',
                    text: 'Thanks, Jazeem! What exactly is Qudemo?',
                    nextVideo: 'video_2'
                }
            },
            {
                id: 'video_2',
                src: '/videos/video_2.mp4',
                nextQuestion: {
                    id: 'question_2',
                    text: 'Oh, interesting! So how is this different from a regular demo video?',
                    nextVideo: 'video_3'
                }
            },
            {
                id: 'video_3',
                src: '/videos/video_3.mp4',
                nextQuestion: null // Last video
            }
        ]
    };
    
    res.json(videoFlow);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Make sure to place your video files in the videos/ directory:');
    console.log('- video_1.mp4');
    console.log('- video_2.mp4');
    console.log('- video_3.mp4');
});
