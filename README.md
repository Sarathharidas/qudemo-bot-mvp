# Qudemo Video Chat Application

An interactive video chat application that plays videos sequentially with questions between them.

## Features

- **Sequential Video Playback**: Plays 3 videos in order
- **Interactive Questions**: Shows questions between videos
- **Progress Tracking**: Visual progress bar and video counter
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations

## Video Flow

1. **Video 1** plays automatically
2. **Question 1**: "Thanks, Jazeem! What exactly is Qudemo?"
3. **Video 2** plays after clicking the question
4. **Question 2**: "Oh, interesting! So how is this different from a regular demo video?"
5. **Video 3** plays after clicking the question
6. **Completion** message appears

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your Videos

Place your video files in the `videos/` directory with these exact names:

```
videos/
├── video_1.mp4
├── video_2.mp4
└── video_3.mp4
```

**Important**: The video files must be named exactly as shown above for the application to work.

### 3. Start the Application

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### 4. Access the Application

Open your browser and go to: `http://localhost:3000`

## File Structure

```
qudemo_bot/
├── app.js                 # Main server file
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── public/               # Static files served to browser
│   ├── index.html        # Main HTML template
│   ├── styles.css        # CSS styling
│   └── script.js         # Frontend JavaScript logic
└── videos/               # Video files directory
    ├── video_1.mp4       # First video (required)
    ├── video_2.mp4       # Second video (required)
    ├── video_3.mp4       # Third video (required)
    └── README.md         # Video setup instructions
```

## Video Requirements

- **Format**: MP4 (recommended), WebM, or OGG
- **Resolution**: 720p or 1080p recommended
- **File Size**: Keep reasonable for web streaming
- **Duration**: Keep videos concise for better user experience

## Customization

### Changing Questions

Edit the questions in `app.js` in the `/api/video-flow` route:

```javascript
nextQuestion: {
    id: 'question_1',
    text: 'Your custom question here',
    nextVideo: 'video_2'
}
```

### Adding More Videos

1. Add video files to the `videos/` directory
2. Update the `videoFlow` object in `app.js`
3. Modify the progress tracking in the frontend

### Styling

Customize the appearance by editing `public/styles.css`.

## Troubleshooting

### Videos Not Playing
- Ensure video files are in the `videos/` directory
- Check that filenames match exactly: `video_1.mp4`, `video_2.mp4`, `video_3.mp4`
- Verify video files are not corrupted
- Check browser console for error messages

### Server Issues
- Make sure port 3000 is not in use by another application
- Check that all dependencies are installed: `npm install`
- Verify Node.js is installed and up to date

## Development

The application uses:
- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Video**: HTML5 video element with MP4 support

## License

MIT License
