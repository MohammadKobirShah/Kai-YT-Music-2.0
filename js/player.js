/**
 * Audio Player Manager
 */
const Player = {
  audio: null,
  currentSong: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  isLoading: false,
  shuffle: false,
  repeat: 'off', // off, one, all
  volume: 100,
  
  /**
   * Initialize player
   */
  init() {
    this.audio = document.getElementById('audio-player');
    this.loadSettings();
    this.bindEvents();
    this.setupAudioChannel();
  },

  /**
   * Setup audio channel for KaiOS
   */
  setupAudioChannel() {
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'content';
    }
    
    if (this.audio.mozAudioChannelType !== undefined) {
      this.audio.mozAudioChannelType = 'content';
    }
  },

  /**
   * Load settings from storage
   */
  loadSettings() {
    const settings = Storage.getSettings();
    this.volume = settings.volume || 100;
    this.shuffle = settings.shuffle || false;
    this.repeat = settings.repeat || 'off';
    
    this.audio.volume = this.volume / 100;
  },

  /**
   * Bind audio events
   */
  bindEvents() {
    this.audio.addEventListener('loadstart', () => {
      this.isLoading = true;
      UI.showLoading('Loading audio...');
    });
    
    this.audio.addEventListener('canplay', () => {
      this.isLoading = false;
      UI.hideLoading();
    });
    
    this.audio.addEventListener('playing', () => {
      this.isPlaying = true;
      this.updateMiniPlayer();
    });
    
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateMiniPlayer();
    });
    
    this.audio.addEventListener('ended', () => {
      this.handleSongEnd();
    });
    
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.savePosition();
    });
    
    this.audio.addEventListener('error', (e) => {
      this.isLoading = false;
      UI.hideLoading();
      
      let errorMessage = 'Playback error';
      if (this.audio.error) {
        switch (this.audio.error.code) {
          case 1:
            errorMessage = 'Playback aborted';
            break;
          case 2:
            errorMessage = 'Network error';
            break;
          case 3:
            errorMessage = 'Decoding error';
            break;
          case 4:
            errorMessage = 'Audio not supported';
            break;
        }
      }
      
      Toast.show(errorMessage);
      console.error('Audio error:', e);
    });
  },

  /**
   * Play a song
   */
  async play(song, addToQueue = true) {
    if (!song || !song.id) {
      Toast.show('Invalid song');
      return false;
    }
    
    try {
      UI.showLoading('Getting stream...');
      
      // Get stream URL
      const streamUrl = await API.getStreamUrl(song.id);
      
      if (!streamUrl) {
        throw new Error('Could not get stream URL');
      }
      
      // Stop current playback
      this.stop();
      
      // Set new song
      this.currentSong = song;
      this.audio.src = streamUrl;
      
      // Add to queue if needed
      if (addToQueue) {
        this.addToQueue(song);
      }
      
      // Start playback
      await this.audio.play();
      
      // Add to history
      Storage.addToHistory(song);
      
      // Update UI
      this.updatePlayerView();
      this.updateMiniPlayer();
      
      UI.hideLoading();
      
      return true;
    } catch (error) {
      UI.hideLoading();
      Toast.show('Failed to play: ' + error.message);
      console.error('Play error:', error);
      return false;
    }
  },

  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (!this.currentSong) {
      Toast.show('No song selected');
      return;
    }
    
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(e => {
        Toast.show('Playback failed');
        console.error('Play failed:', e);
      });
    }
  },

  /**
   * Stop playback
   */
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  },

  /**
   * Seek by seconds
   */
  seek(seconds) {
    if (!this.currentSong) return;
    
    const newTime = Math.max(0, Math.min(
      this.audio.currentTime + seconds,
      this.audio.duration || 0
    ));
    
    this.audio.currentTime = newTime;
  },

  /**
   * Seek to percentage
   */
  seekToPercent(percent) {
    if (!this.currentSong || !this.audio.duration) return;
    
    this.audio.currentTime = (percent / 100) * this.audio.duration;
  },

  /**
   * Adjust volume
   */
  adjustVolume(delta) {
    this.volume = Math.max(0, Math.min(100, this.volume + delta));
    this.audio.volume = this.volume / 100;
    
    Storage.updateSettings({ volume: this.volume });
    
    Toast.show(`Volume: ${this.volume}%`);
    this.updatePlayerView();
  },

  /**
   * Set volume
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(100, value));
    this.audio.volume = this.volume / 100;
    
    Storage.updateSettings({ volume: this.volume });
    this.updatePlayerView();
  },

  /**
   * Toggle shuffle
   */
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    Storage.updateSettings({ shuffle: this.shuffle });
    
    Toast.show(this.shuffle ? 'Shuffle: ON' : 'Shuffle: OFF');
    this.updatePlayerView();
  },

  /**
   * Toggle repeat mode
   */
  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(this.repeat);
    this.repeat = modes[(currentIndex + 1) % modes.length];
    
    Storage.updateSettings({ repeat: this.repeat });
    
    const labels = {
      off: 'Repeat: OFF',
      one: 'Repeat: ONE',
      all: 'Repeat: ALL'
    };
    
    Toast.show(labels[this.repeat]);
    this.updatePlayerView();
  },

  /**
   * Add song to queue
   */
  addToQueue(song) {
    // Check if already in queue
    const existingIndex = this.queue.findIndex(s => s.id === song.id);
    
    if (existingIndex >= 0) {
      this.queueIndex = existingIndex;
    } else {
      this.queue.push(song);
      this.queueIndex = this.queue.length - 1;
    }
  },

  /**
   * Set queue
   */
  setQueue(songs, startIndex = 0) {
    this.queue = [...songs];
    this.queueIndex = startIndex;
    
    if (this.shuffle) {
      // Keep current song at start, shuffle rest
      const current = this.queue.splice(this.queueIndex, 1)[0];
      this.queue = [current, ...Utils.shuffleArray(this.queue)];
      this.queueIndex = 0;
    }
  },

  /**
   * Play next song
   */
  async playNext() {
    if (this.queue.length === 0) return;
    
    let nextIndex = this.queueIndex + 1;
    
    if (nextIndex >= this.queue.length) {
      if (this.repeat === 'all') {
        nextIndex = 0;
      } else {
        Toast.show('End of queue');
        return;
      }
    }
    
    this.queueIndex = nextIndex;
    await this.play(this.queue[this.queueIndex], false);
  },

  /**
   * Play previous song
   */
  async playPrevious() {
    if (this.queue.length === 0) return;
    
    // If more than 3 seconds in, restart current song
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    
    let prevIndex = this.queueIndex - 1;
    
    if (prevIndex < 0) {
      if (this.repeat === 'all') {
        prevIndex = this.queue.length - 1;
      } else {
        this.audio.currentTime = 0;
        return;
      }
    }
    
    this.queueIndex = prevIndex;
    await this.play(this.queue[this.queueIndex], false);
  },

  /**
   * Handle song end
   */
  handleSongEnd() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.playNext();
    }
  },

  /**
   * Update progress display
   */
  updateProgress() {
    if (!this.currentSong) return;
    
    const currentTime = this.audio.currentTime;
    const duration = this.audio.duration || 0;
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Update progress bar
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    
    // Update time display
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    if (currentTimeEl) {
      currentTimeEl.textContent = Utils.formatTime(currentTime);
    }
    if (totalTimeEl) {
      totalTimeEl.textContent = Utils.formatTime(duration);
    }
  },

  /**
   * Update player view
   */
  updatePlayerView() {
    if (!this.currentSong) return;
    
    const titleEl = document.getElementById('player-title');
    const artistEl = document.getElementById('player-artist');
    const thumbEl = document.getElementById('player-thumb-img');
    const shuffleEl = document.getElementById('shuffle-status');
    const repeatEl = document.getElementById('repeat-status');
    const volumeEl = document.getElementById('volume-level');
    
    if (titleEl) titleEl.textContent = this.currentSong.title;
    if (artistEl) artistEl.textContent = this.currentSong.artist;
    if (thumbEl && this.currentSong.thumbnail) {
      thumbEl.src = this.currentSong.thumbnail;
    }
    
    if (shuffleEl) {
      shuffleEl.classList.toggle('active', this.shuffle);
    }
    
    if (repeatEl) {
      repeatEl.classList.toggle('active', this.repeat !== 'off');
      repeatEl.textContent = this.repeat === 'one' ? '🔂' : '🔁';
    }
    
    if (volumeEl) {
      volumeEl.textContent = `🔊 ${this.volume}%`;
    }
  },

  /**
   * Update mini player
   */
  updateMiniPlayer() {
    const miniPlayer = document.getElementById('player-mini');
    if (miniPlayer) {
      if (this.currentSong) {
        miniPlayer.classList.remove('hidden');
        miniPlayer.textContent = this.isPlaying ? '▶' : '⏸';
      } else {
        miniPlayer.classList.add('hidden');
      }
    }
  },

  /**
   * Save current position
   */
  savePosition: Utils.throttle(function() {
    if (Player.currentSong && Player.audio.currentTime > 0) {
      Storage.setLastPlayed(Player.currentSong, Player.audio.currentTime);
    }
  }, 5000),

  /**
   * Resume last played
   */
  async resumeLastPlayed() {
    const lastPlayed = Storage.getLastPlayed();
    
    if (lastPlayed && lastPlayed.song) {
      const success = await this.play(lastPlayed.song);
      
      if (success && lastPlayed.position) {
        this.audio.currentTime = lastPlayed.position;
      }
    }
  },

  /**
   * Get current state
   */
  getState() {
    return {
      song: this.currentSong,
      isPlaying: this.isPlaying,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.volume,
      shuffle: this.shuffle,
      repeat: this.repeat,
      queueLength: this.queue.length,
      queueIndex: this.queueIndex
    };
  },

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    this.audio.src = '';
    this.currentSong = null;
    this.queue = [];
  }
};
