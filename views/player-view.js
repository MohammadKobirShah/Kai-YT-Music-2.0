/**
 * Player View
 */
const PlayerView = {
  /**
   * Initialize player view
   */
  init() {
    Navigation.registerView('player', {
      listElement: null,
      onEnter: () => this.onEnter(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: '⏮ PREV', handler: () => Player.playPrevious() },
        center: { label: '⏯ PLAY', handler: () => Player.togglePlay() },
        right: { label: 'NEXT ⏭', handler: () => Player.playNext() }
      },
      keyHandler: (key) => this.handleKey(key)
    });
  },

  /**
   * On enter view
   */
  onEnter() {
    Player.updatePlayerView();
    this.updatePlayButton();
  },

  /**
   * Update play button text
   */
  updatePlayButton() {
    const centerLabel = Player.isPlaying ? '⏸ PAUSE' : '▶ PLAY';
    Navigation.setSoftkeys({
      left: { label: '⏮', handler: () => Player.playPrevious() },
      center: { label: centerLabel, handler: () => {
        Player.togglePlay();
        this.updatePlayButton();
      }},
      right: { label: '⏭', handler: () => Player.playNext() }
    });
  },

  /**
   * Handle key events
   */
  handleKey(key) {
    switch (key) {
      case 'ArrowLeft':
        Player.seek(-10);
        Toast.show('-10s');
        return true;
        
      case 'ArrowRight':
        Player.seek(10);
        Toast.show('+10s');
        return true;
        
      case 'ArrowUp':
        Player.adjustVolume(5);
        return true;
        
      case 'ArrowDown':
        Player.adjustVolume(-5);
        return true;
        
      case '0':
        Player.toggleShuffle();
        Player.updatePlayerView();
        return true;
        
      case '1':
        Player.toggleRepeat();
        Player.updatePlayerView();
        return true;
        
      case '5':
        Player.togglePlay();
        this.updatePlayButton();
        return true;
        
      case '4':
        Player.playPrevious();
        return true;
        
      case '6':
        Player.playNext();
        return true;
    }
    
    return false;
  }
};
