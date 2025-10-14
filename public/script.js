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
        
        // Question input elements
        this.questionInput = document.getElementById('questionInput');
        this.voiceButton = document.getElementById('voiceButton');
        this.askButton = document.getElementById('askButton');
        this.answerBox = document.getElementById('answerBox');
        
        this.videoFlow = null;
        this.suggestedQuestions = null;
        this.currentVideoIndex = 0;
        this.isQuestionVisible = false;
        
        // Voice recognition setup
        this.recognition = null;
        this.isListening = false;
        
        // Remove crossorigin attribute since CORS isn't working
        this.videoPlayer.removeAttribute('crossorigin');
        
        this.init();
    }
    
    async init() {
        try {
            await Promise.all([
                this.loadVideoFlow(),
                this.loadSuggestedQuestions()
            ]);
            this.setupEventListeners();
            this.setupQuestionInput();
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
        
        // Show all questions with scrolling instead of "Show More" button
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
            // Start playing the first video
            this.playVideo(0);
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
            // Enable subtitles after video loads
            if (this.videoPlayer.textTracks && this.videoPlayer.textTracks.length > 0) {
                this.videoPlayer.textTracks[0].mode = 'showing';
                console.log('✅ Subtitles enabled');
            }
            
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
        
        // Add subtitle track BEFORE setting source
        this.addSubtitleTrack(video);
        
        // Set video source and load
        this.videoPlayer.src = video.src;
        this.videoPlayer.load();
    }
    
    addSubtitleTrack(video) {
        // Remove any existing subtitle tracks and overlays
        const existingTracks = this.videoPlayer.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());
        
        const existingOverlay = document.querySelector('.subtitle-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Load and parse VTT subtitle file for proper sync
        if (video.subtitle) {
            this.loadVTTSubtitles(video.id, video.subtitle);
            console.log(`📝 Loading VTT subtitles from: ${video.subtitle}`);
        } else if (video.answer) {
            // Fallback to answer text if no VTT file
            this.createSubtitleOverlay(video.answer);
            console.log(`📝 Created subtitle overlay from answer text for ${video.id}`);
        } else {
            console.log(`⚠️ No subtitles available for ${video.id}`);
        }
    }
    
    async loadVTTSubtitles(videoId, vttUrl) {
        try {
            // Fetch VTT file from local subtitles folder
            const localVttUrl = `/subtitles/${videoId}.vtt`;
            const response = await fetch(localVttUrl);
            
            if (!response.ok) {
                console.log(`⚠️ VTT file not found at ${localVttUrl}, trying remote...`);
                // Fallback to remote URL if local doesn't work
                const remoteResponse = await fetch(vttUrl);
                if (!remoteResponse.ok) throw new Error('VTT not found');
                const vttText = await remoteResponse.text();
                this.parseAndDisplayVTT(vttText);
            } else {
                const vttText = await response.text();
                this.parseAndDisplayVTT(vttText);
            }
        } catch (error) {
            console.error('Error loading VTT subtitles:', error);
        }
    }
    
    parseAndDisplayVTT(vttText) {
        // Parse VTT file
        const lines = vttText.split('\n');
        const cues = [];
        
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Look for timestamp line (contains -->)
            if (line.includes('-->')) {
                const [startTime, endTime] = line.split('-->').map(t => t.trim());
                
                // Get subtitle text (next lines until empty line)
                const textLines = [];
                i++;
                while (i < lines.length && lines[i].trim() !== '') {
                    textLines.push(lines[i].trim());
                    i++;
                }
                
                cues.push({
                    start: this.parseVTTTime(startTime),
                    end: this.parseVTTTime(endTime),
                    text: textLines.join(' ')
                });
            }
            i++;
        }
        
        console.log(`✅ Parsed ${cues.length} subtitle cues`);
        this.displaySyncedSubtitles(cues);
    }
    
    parseVTTTime(timeString) {
        // Parse VTT timestamp format: 00:00:12.800
        const parts = timeString.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    displaySyncedSubtitles(cues) {
        // Create subtitle overlay
        const overlay = document.createElement('div');
        overlay.className = 'subtitle-overlay';
        overlay.style.display = 'none';
        
        const videoContainer = this.videoPlayer.parentElement;
        videoContainer.appendChild(overlay);
        
        // Update subtitle based on video time
        const updateSubtitle = () => {
            const currentTime = this.videoPlayer.currentTime;
            
            // Find the active cue
            const activeCue = cues.find(cue => 
                currentTime >= cue.start && currentTime < cue.end
            );
            
            if (activeCue) {
                overlay.textContent = activeCue.text;
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        };
        
        // Update subtitle on timeupdate
        this.videoPlayer.addEventListener('timeupdate', updateSubtitle);
        this.videoPlayer.addEventListener('seeked', updateSubtitle);
        
        // Hide when paused or ended
        this.videoPlayer.addEventListener('pause', () => {
            overlay.style.display = 'none';
        });
        
        this.videoPlayer.addEventListener('play', updateSubtitle);
        
        this.videoPlayer.addEventListener('ended', () => {
            overlay.style.display = 'none';
        });
    }
    
    createSubtitleOverlay(answerText) {
        // Fallback: Create a subtitle overlay div from plain text
        const overlay = document.createElement('div');
        overlay.className = 'subtitle-overlay';
        
        // Insert after the video player
        const videoContainer = this.videoPlayer.parentElement;
        videoContainer.appendChild(overlay);
        
        // Split text into words for animated display
        const words = answerText.split(' ');
        const wordsPerChunk = 8; // Show 8 words at a time
        const chunks = [];
        
        for (let i = 0; i < words.length; i += wordsPerChunk) {
            chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
        }
        
        let currentChunkIndex = 0;
        let animationInterval = null;
        
        const showNextChunk = () => {
            if (currentChunkIndex < chunks.length) {
                overlay.textContent = chunks[currentChunkIndex];
                overlay.style.display = 'block';
                currentChunkIndex++;
            } else {
                // Loop back to start
                currentChunkIndex = 0;
            }
        };
        
        const startAnimation = () => {
            if (animationInterval) return;
            
            currentChunkIndex = 0;
            showNextChunk();
            
            // Change subtitle every 3 seconds
            animationInterval = setInterval(() => {
                if (!this.videoPlayer.paused) {
                    showNextChunk();
                }
            }, 3000);
        };
        
        const stopAnimation = () => {
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
            overlay.style.display = 'none';
            currentChunkIndex = 0;
        };
        
        // Control subtitles based on video playback
        this.videoPlayer.addEventListener('play', startAnimation);
        this.videoPlayer.addEventListener('pause', stopAnimation);
        this.videoPlayer.addEventListener('ended', stopAnimation);
        this.videoPlayer.addEventListener('seeking', () => {
            // Reset on seek
            stopAnimation();
            if (!this.videoPlayer.paused) {
                startAnimation();
            }
        });
        
        // Initially hide
        overlay.style.display = 'none';
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
    
    setupQuestionInput() {
        // Setup voice recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; // Keep listening for longer
            this.recognition.interimResults = true; // Show results as you speak
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;
            
            // Add timeout to auto-stop after getting result
            this.recognitionTimeout = null;
            this.recognitionRetryCount = 0;
            this.maxRecognitionRetries = 3;
            this.keepAliveInterval = null;
            
            this.recognition.onstart = () => {
                console.log('🎤 Speech recognition started');
                this.isListening = true;
                this.hasReceivedSpeech = false; // Track if we got any speech
                this.voiceButton.classList.add('listening');
                this.questionInput.placeholder = '🎙️ Listening... Speak now!';
                this.questionInput.style.borderColor = '#4CAF50';
                
                // Show visual feedback
                this.answerBox.innerHTML = `
                    <div style="text-align: center; color: #4CAF50;">
                        <strong>🎙️ Listening...</strong><br/>
                        <small>Speak your question now</small>
                    </div>
                `;
                this.answerBox.style.display = 'block';
            };
            
            // Add handlers for speech start and end
            this.recognition.onspeechstart = () => {
                console.log('👂 Speech detected - user is speaking!');
                this.answerBox.innerHTML = `
                    <div style="text-align: center; color: #4CAF50;">
                        <strong>👂 Hearing you...</strong><br/>
                        <small>Keep speaking!</small>
                    </div>
                `;
            };
            
            this.recognition.onspeechend = () => {
                console.log('🤐 User stopped speaking');
            };
            
            this.recognition.onaudiostart = () => {
                console.log('🎵 Audio input started');
            };
            
            this.recognition.onaudioend = () => {
                console.log('🔇 Audio input ended');
            };
            
            this.recognition.onsoundstart = () => {
                console.log('🔊 Sound detected');
            };
            
            this.recognition.onsoundend = () => {
                console.log('🔈 Sound ended');
            };
            
            this.recognition.onresult = (event) => {
                // Mark that we received speech
                this.hasReceivedSpeech = true;
                
                // Clear any existing timeout
                if (this.recognitionTimeout) {
                    clearTimeout(this.recognitionTimeout);
                }
                
                let transcript = '';
                let isFinal = false;
                
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        isFinal = true;
                    }
                }
                
                console.log('📝 Transcript:', transcript);
                console.log('Is final:', isFinal);
                console.log('✅ Speech received!');
                
                // Update input with transcript
                this.questionInput.value = transcript;
                
                // Show what we're hearing
                this.answerBox.innerHTML = `
                    <div style="text-align: center; color: #2196F3;">
                        <strong>Heard:</strong> "${transcript}"
                        ${isFinal ? '<br/><small>✅ Got it!</small>' : '<br/><small>Keep speaking...</small>'}
                    </div>
                `;
                
                // If we got a final result, stop after a short delay
                if (isFinal && transcript.trim().length > 0) {
                    this.recognitionTimeout = setTimeout(() => {
                        console.log('⏱️ Auto-stopping after final result');
                        if (this.isListening && this.recognition) {
                            this.recognition.stop();
                        }
                    }, 1000); // Stop 1 second after getting final result
                }
            };
            
            this.recognition.onend = () => {
                console.log('🛑 Speech recognition ended');
                console.log('Has received speech:', this.hasReceivedSpeech);
                console.log('Is listening (before check):', this.isListening);
                console.log('Retry count:', this.recognitionRetryCount);
                console.log('Max retries:', this.maxRecognitionRetries);
                
                // Clear timeout
                if (this.recognitionTimeout) {
                    clearTimeout(this.recognitionTimeout);
                    this.recognitionTimeout = null;
                }
                
                // If isListening was set to false by another handler, we might still want to retry
                // Check if we should retry based on whether we got speech and retry count
                const canRetry = !this.hasReceivedSpeech && this.recognitionRetryCount < this.maxRecognitionRetries;
                console.log('🔍 Can retry?', canRetry, '(hasReceivedSpeech:', this.hasReceivedSpeech, ', retryCount:', this.recognitionRetryCount, '< maxRetries:', this.maxRecognitionRetries, ')');
                
                // If we didn't get any speech and haven't exceeded retries, try again
                if (canRetry) {
                    // Keep listening flag active for retry
                    this.isListening = true;
                    console.log('✅ Setting isListening back to true for retry');
                    this.recognitionRetryCount++;
                    console.log(`🔄 Automatically restarting (attempt ${this.recognitionRetryCount}/${this.maxRecognitionRetries})...`);
                    console.log('⏰ Waiting 200ms before restart to let microphone warm up...');
                    
                    // Update feedback
                    this.answerBox.innerHTML = `
                        <div style="text-align: center; color: #FF9800;">
                            <strong>🔄 Still listening...</strong><br/>
                            <small>Speak now! (Attempt ${this.recognitionRetryCount}/${this.maxRecognitionRetries})</small>
                        </div>
                    `;
                    
                    // Restart after a slightly longer delay to let mic warm up
                    setTimeout(() => {
                        try {
                            if (this.isListening) {
                                console.log('▶️ Restarting recognition now...');
                                this.recognition.start();
                            }
                        } catch (error) {
                            console.error('Error restarting:', error);
                            this.isListening = false;
                            this.voiceButton.classList.remove('listening');
                        }
                    }, 200); // Slightly longer delay
                    return; // Don't clean up yet
                }
                
                // Reset retry counter
                this.recognitionRetryCount = 0;
                
                this.isListening = false;
                this.voiceButton.classList.remove('listening');
                this.questionInput.placeholder = 'Type your question or click the mic...';
                this.questionInput.style.borderColor = '#e0e0e0';
                
                // Hide listening indicator after a moment (if it still shows "Listening")
                setTimeout(() => {
                    const boxText = this.answerBox.textContent;
                    if (boxText.includes('Listening') || boxText.includes('Heard')) {
                        // Only hide if we have text in the input
                        if (this.questionInput.value.trim().length > 0) {
                            this.answerBox.style.display = 'none';
                        } else if (!this.hasReceivedSpeech) {
                            // Show no speech message
                            this.answerBox.innerHTML = `
                                <div class="not-found">
                                    <strong>❌ No speech detected</strong><br/>
                                    <small>Click mic and speak immediately!</small>
                                </div>
                            `;
                            this.answerBox.className = 'answer-box not-found';
                            
                            // Hide after a few seconds
                            setTimeout(() => {
                                this.answerBox.style.display = 'none';
                            }, 3000);
                        }
                    }
                }, 1500);
            };
            
            this.recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                
                // Clear timeout
                if (this.recognitionTimeout) {
                    clearTimeout(this.recognitionTimeout);
                    this.recognitionTimeout = null;
                }
                
                // Don't show error for "no-speech" if we already have text
                if (event.error === 'no-speech' && this.questionInput.value.trim().length > 0) {
                    console.log('Got speech before timeout, ignoring no-speech error');
                    return;
                }
                
                // For "no-speech" errors, DON'T set isListening to false yet
                // Let the onend handler manage retries
                if (event.error === 'no-speech') {
                    console.log('⚠️ No speech error - will let onend handler retry if needed');
                    return; // Don't clean up yet, let onend handle it
                }
                
                // For other errors, stop listening
                this.isListening = false;
                this.voiceButton.classList.remove('listening');
                this.questionInput.placeholder = 'Type your question or click the mic...';
                this.questionInput.style.borderColor = '#e0e0e0';
                
                let errorMessage = 'Microphone error: ';
                switch(event.error) {
                    case 'no-speech':
                        errorMessage += 'No speech detected. Click mic and speak immediately!';
                        break;
                    case 'audio-capture':
                        errorMessage += 'Microphone not found. Please check your device.';
                        break;
                    case 'not-allowed':
                        errorMessage += 'Microphone permission denied. Please allow access in browser settings.';
                        break;
                    case 'network':
                        errorMessage += 'Network error. Please check your connection.';
                        break;
                    case 'aborted':
                        // Ignore aborted errors, they happen when we manually stop
                        console.log('Recognition aborted (this is normal)');
                        return;
                    default:
                        errorMessage += event.error;
                }
                
                this.answerBox.innerHTML = `
                    <div class="not-found">
                        <strong>❌ ${errorMessage}</strong><br/>
                        <small style="margin-top: 8px; display: block;">
                            ${event.error === 'not-allowed' ? 
                                'Click the 🔒 icon in your address bar to check microphone permissions.' :
                                'Speak clearly right after clicking the mic button.'}
                        </small>
                    </div>
                `;
                this.answerBox.className = 'answer-box not-found';
                this.answerBox.style.display = 'block';
            };
            
            console.log('✅ Speech recognition initialized');
        } else {
            console.log('❌ Speech recognition not supported in this browser');
            this.voiceButton.disabled = true;
            this.voiceButton.style.opacity = '0.5';
            this.voiceButton.style.cursor = 'not-allowed';
            this.voiceButton.title = 'Voice input not supported in this browser. Please use Chrome, Edge, or Safari.';
        }
        
        // Voice button click handler
        this.voiceButton.addEventListener('click', () => {
            console.log('🎤 Microphone button clicked');
            
            if (!this.recognition) {
                alert('Voice input is not supported in your browser.\n\nPlease use Chrome, Edge, or Safari browser.\n\nOr you can type your question instead.');
                return;
            }
            
            if (this.isListening) {
                console.log('🛑 Manually stopping speech recognition');
                if (this.recognitionTimeout) {
                    clearTimeout(this.recognitionTimeout);
                    this.recognitionTimeout = null;
                }
                this.recognitionRetryCount = 0; // Reset retry counter
                this.recognition.stop();
            } else {
                try {
                    console.log('▶️ Starting speech recognition');
                    console.log('💡 TIP: Start speaking immediately after clicking!');
                    console.log('💡 Microphone will auto-restart up to 3 times if no speech detected');
                    
                    // Clear timeout from previous session
                    if (this.recognitionTimeout) {
                        clearTimeout(this.recognitionTimeout);
                        this.recognitionTimeout = null;
                    }
                    
                    // Reset retry counter for new session
                    this.recognitionRetryCount = 0;
                    
                    this.questionInput.value = ''; // Clear previous input
                    
                    // Show preparing message
                    this.answerBox.innerHTML = `
                        <div style="text-align: center; color: #2196F3;">
                            <strong>⏳ Preparing microphone...</strong><br/>
                            <small>Get ready to speak!</small>
                        </div>
                    `;
                    this.answerBox.style.display = 'block';
                    
                    // Small delay to let microphone initialize properly
                    setTimeout(() => {
                        this.recognition.start();
                    }, 100);
                } catch (error) {
                    console.error('❌ Error starting recognition:', error);
                    
                    // If recognition is already started, stop it first
                    if (error.message.includes('already started')) {
                        console.log('Recognition already running, stopping first...');
                        this.recognition.stop();
                        setTimeout(() => {
                            this.questionInput.value = '';
                            this.recognitionRetryCount = 0;
                            this.recognition.start();
                        }, 100);
                    } else {
                        alert('Error starting microphone: ' + error.message + '\n\nPlease refresh the page and try again.');
                    }
                }
            }
        });
        
        // Ask button click handler
        this.askButton.addEventListener('click', () => {
            this.handleUserQuestion();
        });
        
        // Enter key handler
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserQuestion();
            }
        });
    }
    
    async handleUserQuestion() {
        const userQuestion = this.questionInput.value.trim();
        
        if (!userQuestion) {
            return;
        }
        
        console.log('User asked:', userQuestion);
        
        // Show loading state
        this.answerBox.innerHTML = `
            <div style="text-align: center;">
                <strong>🤔 Thinking...</strong>
            </div>
        `;
        this.answerBox.className = 'answer-box';
        this.answerBox.style.display = 'block';
        this.askButton.disabled = true;
        this.askButton.textContent = '...';
        
        try {
            // Call backend API to match question using OpenAI
            const response = await fetch('/api/match-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userQuestion })
            });
            
            const result = await response.json();
            
            if (result.matched) {
                // Found a match!
                const matchedVideo = this.videoFlow.videos.find(v => v.id === result.videoId);
                
                if (matchedVideo) {
                    this.answerBox.innerHTML = `
                        <div class="success">
                            <strong>✅ Found answer!</strong><br/>
                            Playing video: "${matchedVideo.title || matchedVideo.question}"
                            ${result.confidence ? `<br/><small style="opacity: 0.7;">Confidence: ${result.confidence}</small>` : ''}
                        </div>
                    `;
                    this.answerBox.className = 'answer-box success';
                    this.answerBox.style.display = 'block';
                    
                    // Play the matched video
                    const videoIndex = this.videoFlow.videos.findIndex(v => v.id === result.videoId);
                    if (videoIndex !== -1) {
                        this.playVideo(videoIndex);
                    }
                    
                    // Clear input
                    this.questionInput.value = '';
                    
                    // Hide answer after a few seconds
                    setTimeout(() => {
                        this.answerBox.style.display = 'none';
                    }, 3000);
                } else {
                    this.showNoMatchMessage();
                }
            } else {
                this.showNoMatchMessage();
            }
        } catch (error) {
            console.error('Error matching question:', error);
            // Fallback to local matching
            const matchedVideo = this.findMatchingVideo(userQuestion);
            
            if (matchedVideo) {
                this.answerBox.innerHTML = `
                    <div class="success">
                        <strong>✅ Found answer!</strong><br/>
                        Playing video: "${matchedVideo.title || matchedVideo.question}"
                    </div>
                `;
                this.answerBox.className = 'answer-box success';
                this.answerBox.style.display = 'block';
                
                const videoIndex = this.videoFlow.videos.findIndex(v => v.id === matchedVideo.id);
                if (videoIndex !== -1) {
                    this.playVideo(videoIndex);
                }
                
                this.questionInput.value = '';
                
                setTimeout(() => {
                    this.answerBox.style.display = 'none';
                }, 3000);
            } else {
                this.showNoMatchMessage();
            }
        } finally {
            this.askButton.disabled = false;
            this.askButton.textContent = 'Ask';
        }
    }
    
    showNoMatchMessage() {
        this.answerBox.innerHTML = `
            <div class="not-found">
                <strong>🤔 I'm not sure of the answer</strong><br/>
                <p style="margin-top: 8px; font-size: 13px;">
                    I couldn't find a matching question. Try asking in a different way or choose from the suggested questions below.
                </p>
            </div>
        `;
        this.answerBox.className = 'answer-box not-found';
        this.answerBox.style.display = 'block';
    }
    
    findMatchingVideo(userQuestion) {
        if (!this.videoFlow || !this.videoFlow.videos) {
            return null;
        }
        
        const lowerQuestion = userQuestion.toLowerCase();
        
        // Try exact match first
        for (const video of this.videoFlow.videos) {
            if (video.question && video.question.toLowerCase() === lowerQuestion) {
                return video;
            }
        }
        
        // Try partial match with keywords
        const keywords = lowerQuestion.split(' ').filter(word => word.length > 3);
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const video of this.videoFlow.videos) {
            if (!video.question) continue;
            
            const videoQuestion = video.question.toLowerCase();
            let score = 0;
            
            // Check how many keywords match
            for (const keyword of keywords) {
                if (videoQuestion.includes(keyword)) {
                    score++;
                }
            }
            
            // Bonus for title match
            if (video.title && video.title.toLowerCase().includes(lowerQuestion)) {
                score += 2;
            }
            
            if (score > bestScore && score >= 2) { // At least 2 keyword matches
                bestScore = score;
                bestMatch = video;
            }
        }
        
        return bestMatch;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoChatApp();
});
