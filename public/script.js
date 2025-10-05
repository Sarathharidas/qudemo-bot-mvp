class VideoChatApp {
    constructor() {
        this.videoPlayer = document.getElementById('videoPlayer');
        this.questionOverlay = document.getElementById('questionOverlay');
        this.questionText = document.getElementById('questionText');
        this.questionButton = document.getElementById('questionButton');
        this.playButtonOverlay = document.getElementById('playButtonOverlay');
        this.playButton = document.getElementById('playButton');
        this.progressFill = document.getElementById('progressFill');
        this.currentVideoSpan = document.getElementById('currentVideo');
        this.totalVideosSpan = document.getElementById('totalVideos');
        
        this.videoFlow = null;
        this.currentVideoIndex = 0;
        this.isQuestionVisible = false;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadVideoFlow();
            this.setupEventListeners();
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
    
    setupEventListeners() {
        // Video ended event
        this.videoPlayer.addEventListener('ended', () => {
            this.onVideoEnded();
        });
        
        // Question button click
        this.questionButton.addEventListener('click', () => {
            this.onQuestionClicked();
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
        
        // Handle mobile fullscreen events
        this.videoPlayer.addEventListener('webkitfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        this.videoPlayer.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        this.videoPlayer.addEventListener('mozfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        this.videoPlayer.addEventListener('MSFullscreenChange', () => {
            this.handleFullscreenChange();
        });
        
        // Also listen on document for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleFullscreenChange();
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
        
        if (currentVideo.nextQuestion) {
            this.showQuestion(currentVideo.nextQuestion);
        } else {
            // Last video completed
            this.showCompletion();
        }
    }
    
    showQuestion(question) {
        this.isQuestionVisible = true;
        this.questionText.textContent = question.text;
        this.questionOverlay.style.display = 'block';
        
        // Ensure overlay is properly positioned for current state
        this.ensureOverlayPositioning();
        
        // Store next video info for when question is clicked
        this.nextVideoId = question.nextVideo;
    }
    
    ensureOverlayPositioning() {
        const isFullscreen = this.isInFullscreen();
        
        if (isFullscreen) {
            this.setFullscreenMode();
        } else {
            this.setNormalMode();
        }
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
    
    handleFullscreenChange() {
        const isFullscreen = this.isInFullscreen();
        
        console.log('Fullscreen change detected:', isFullscreen);
        
        if (isFullscreen) {
            // In fullscreen, use fixed positioning
            this.setFullscreenMode();
        } else {
            // Exit fullscreen, use absolute positioning
            this.setNormalMode();
        }
    }
    
    isInFullscreen() {
        // Check all possible fullscreen states
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement ||
                 // Mobile Safari fullscreen
                 (window.innerHeight === screen.height && window.innerWidth === screen.width) ||
                 // Check if video is in fullscreen mode
                 (this.videoPlayer.webkitDisplayingFullscreen || this.videoPlayer.mozFullScreen));
    }
    
    setFullscreenMode() {
        // Use fixed positioning for fullscreen
        this.questionOverlay.style.position = 'fixed';
        this.questionOverlay.style.bottom = '80px';
        this.questionOverlay.style.left = '50%';
        this.questionOverlay.style.transform = 'translateX(-50%)';
        this.questionOverlay.style.zIndex = '9999';
        this.questionOverlay.style.maxWidth = '90%';
        this.questionOverlay.style.pointerEvents = 'auto';
        
        this.playButtonOverlay.style.position = 'fixed';
        this.playButtonOverlay.style.top = '50%';
        this.playButtonOverlay.style.left = '50%';
        this.playButtonOverlay.style.transform = 'translate(-50%, -50%)';
        this.playButtonOverlay.style.zIndex = '9999';
        this.playButtonOverlay.style.pointerEvents = 'auto';
        
        this.progressContainer.style.position = 'fixed';
        this.progressContainer.style.top = '20px';
        this.progressContainer.style.right = '20px';
        this.progressContainer.style.zIndex = '9999';
        this.progressContainer.style.pointerEvents = 'auto';
    }
    
    setNormalMode() {
        // Reset to absolute positioning
        this.questionOverlay.style.position = 'absolute';
        this.questionOverlay.style.bottom = '60px';
        this.questionOverlay.style.left = '50%';
        this.questionOverlay.style.transform = 'translateX(-50%)';
        this.questionOverlay.style.zIndex = '1000';
        this.questionOverlay.style.maxWidth = '80%';
        this.questionOverlay.style.pointerEvents = 'auto';
        
        this.playButtonOverlay.style.position = 'absolute';
        this.playButtonOverlay.style.top = '50%';
        this.playButtonOverlay.style.left = '50%';
        this.playButtonOverlay.style.transform = 'translate(-50%, -50%)';
        this.playButtonOverlay.style.zIndex = '1001';
        this.playButtonOverlay.style.pointerEvents = 'auto';
        
        this.progressContainer.style.position = 'absolute';
        this.progressContainer.style.top = '15px';
        this.progressContainer.style.right = '15px';
        this.progressContainer.style.zIndex = '1002';
        this.progressContainer.style.pointerEvents = 'auto';
    }
    
    
    onQuestionClicked() {
        if (!this.nextVideoId) return;
        
        // Find next video index
        const nextVideoIndex = this.videoFlow.videos.findIndex(
            video => video.id === this.nextVideoId
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
        this.questionText.textContent = `⚠️ Error: ${message}`;
        this.questionButton.onclick = () => location.reload();
        this.questionOverlay.style.display = 'block';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoChatApp();
});
