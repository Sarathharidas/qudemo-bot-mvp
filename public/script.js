class VideoChatApp {
    constructor() {
        this.videoPlayer = document.getElementById('videoPlayer');
        this.questionOverlay = document.getElementById('questionOverlay');
        this.questionBox = document.getElementById('questionBox');
        this.playButtonOverlay = document.getElementById('playButtonOverlay');
        this.playButton = document.getElementById('playButton');
        this.progressFill = document.getElementById('progressFill');
        this.currentVideoSpan = document.getElementById('currentVideo');
        this.totalVideosSpan = document.getElementById('totalVideos');
        this.suggestedQuestionsContainer = document.getElementById('suggestedQuestions');
        
        this.videoFlow = null;
        this.suggestedQuestions = null;
        this.currentVideoIndex = 0;
        this.isQuestionVisible = false;
        
        this.init();
    }
    
    async init() {
        try {
            await Promise.all([
                this.loadVideoFlow(),
                this.loadSuggestedQuestions()
            ]);
            this.setupEventListeners();
            this.renderSuggestedQuestions();
            // Add a small delay to ensure DOM is fully ready
            setTimeout(() => {
                this.startVideoFlow();
            }, 100);
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to load video flow. Please refresh the page.');
        }
    }
    
    async loadVideoFlow() {
        const response = await fetch('/video-flow.json');
        if (!response.ok) {
            throw new Error('Failed to fetch video flow');
        }
        this.videoFlow = await response.json();
        this.totalVideosSpan.textContent = this.videoFlow.videos.length;
    }
    
    async loadSuggestedQuestions() {
        const response = await fetch('/suggested-questions.json');
        if (!response.ok) {
            throw new Error('Failed to fetch suggested questions');
        }
        this.suggestedQuestions = await response.json();
    }
    
    renderSuggestedQuestions() {
        if (!this.suggestedQuestions || !this.suggestedQuestions.questions) {
            return;
        }
        
        // Clear any existing questions
        this.suggestedQuestionsContainer.innerHTML = '';
        
        // Create a button for each suggested question
        this.suggestedQuestions.questions.forEach(question => {
            const button = document.createElement('button');
            button.className = 'suggested-question-btn';
            button.textContent = question.text;
            button.setAttribute('data-video-id', question.videoId);
            button.addEventListener('click', () => {
                this.onSuggestedQuestionClicked(question.videoId);
            });
            this.suggestedQuestionsContainer.appendChild(button);
        });
    }
    
    onSuggestedQuestionClicked(videoId) {
        // Find the video index based on video ID
        const videoIndex = this.videoFlow.videos.findIndex(
            video => video.id === videoId
        );
        
        if (videoIndex !== -1) {
            this.playVideo(videoIndex);
        } else {
            // Video not found yet - show a message
            console.log(`Video ${videoId} will be available soon`);
            alert('This video will be available soon! We are still creating content for this question.');
        }
    }
    
    setupEventListeners() {
        // Video ended event
        this.videoPlayer.addEventListener('ended', () => {
            this.onVideoEnded();
        });
        
        // Play button click
        this.playButton.addEventListener('click', () => {
            this.videoPlayer.play().catch(error => {
                console.log('Video play failed:', error);
            });
        });
        
        // Video play/pause events to show/hide play button
        this.videoPlayer.addEventListener('play', () => {
            this.hidePlayButton();
        });
        
        this.videoPlayer.addEventListener('pause', () => {
            this.showPlayButton();
        });
        
        this.videoPlayer.addEventListener('ended', () => {
            this.showPlayButton();
        });
        
        
        // Video error handling is now handled in playVideo method
    }
    
    async startVideoFlow() {
        if (this.videoFlow && this.videoFlow.videos.length > 0) {
            // Check if first video exists before playing
            const firstVideo = this.videoFlow.videos[0];
            try {
                const response = await fetch(firstVideo.src, { method: 'HEAD' });
                if (response.ok) {
                    this.playVideo(0);
                } else {
                    this.showError('Video file not found. Please check if video_1.mp4 exists in the videos/ directory.');
                }
            } catch (error) {
                console.error('Error checking video file:', error);
                this.showError('Error loading video file. Please check if video_1.mp4 exists in the videos/ directory.');
            }
        }
    }
    
    playVideo(index) {
        if (index >= this.videoFlow.videos.length) {
            this.showCompletion();
            return;
        }
        
        const video = this.videoFlow.videos[index];
        this.currentVideoIndex = index;
        this.currentVideoSpan.textContent = index + 1;
        
        // Update progress bar
        const progress = ((index + 1) / this.videoFlow.videos.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        // Hide question overlay and show play button
        this.hideQuestion();
        this.showPlayButton();
        
        // Clear any existing event listeners
        this.videoPlayer.removeEventListener('canplay', this.handleCanPlay);
        this.videoPlayer.removeEventListener('error', this.handleVideoError);
        
        // Create bound event handlers
        this.handleCanPlay = () => {
            this.videoPlayer.play().catch(error => {
                console.error('Error playing video:', error);
                // Don't show error for autoplay restrictions, just log it
                if (error.name === 'NotAllowedError') {
                    console.log('Autoplay blocked by browser. User needs to interact first.');
                    // Add a subtle indicator that video is ready to play
                    this.videoPlayer.style.cursor = 'pointer';
                } else {
                    this.showError('Error playing video. Please check the video file.');
                }
            });
        };
        
        this.handleVideoError = (e) => {
            console.error('Video load error:', e);
            this.showError('Error loading video. Please check if the video file exists.');
        };
        
        // Add event listeners
        this.videoPlayer.addEventListener('canplay', this.handleCanPlay, { once: true });
        this.videoPlayer.addEventListener('error', this.handleVideoError, { once: true });
        
        // Set video source and load
        this.videoPlayer.src = video.src;
        this.videoPlayer.load();
    }
    
    onVideoEnded() {
        const currentVideo = this.videoFlow.videos[this.currentVideoIndex];
        
        if (currentVideo.nextQuestions && currentVideo.nextQuestions.length > 0) {
            this.showQuestions(currentVideo.nextQuestions);
        } else {
            // Last video completed
            this.showCompletion();
        }
    }
    
    showQuestions(questions) {
        this.isQuestionVisible = true;
        
        // Clear previous questions
        this.questionBox.innerHTML = '';
        
        // Create a button for each question
        questions.forEach(question => {
            const button = document.createElement('button');
            button.className = 'question-btn';
            button.textContent = question.text;
            button.addEventListener('click', () => {
                this.onQuestionClicked(question.nextVideo);
            });
            this.questionBox.appendChild(button);
        });
        
        this.questionOverlay.style.display = 'block';
    }
    
    hideQuestion() {
        this.isQuestionVisible = false;
        this.questionOverlay.style.display = 'none';
    }
    
    showPlayButton() {
        this.playButtonOverlay.style.display = 'block';
    }
    
    hidePlayButton() {
        this.playButtonOverlay.style.display = 'none';
    }
    
    
    
    onQuestionClicked(nextVideoId) {
        if (!nextVideoId) return;
        
        // Find next video index
        const nextVideoIndex = this.videoFlow.videos.findIndex(
            video => video.id === nextVideoId
        );
        
        if (nextVideoIndex !== -1) {
            this.playVideo(nextVideoIndex);
        }
    }
    
    showCompletion() {
        this.hideQuestion();
        this.showPlayButton();
        
        // Simply hide the question overlay when all videos are complete
        // No completion message needed
    }
    
    showError(message) {
        this.questionBox.innerHTML = '';
        const errorButton = document.createElement('button');
        errorButton.className = 'question-btn';
        errorButton.style.background = '#f44336';
        errorButton.textContent = `⚠️ Error: ${message}`;
        errorButton.onclick = () => location.reload();
        this.questionBox.appendChild(errorButton);
        this.questionOverlay.style.display = 'block';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoChatApp();
});
