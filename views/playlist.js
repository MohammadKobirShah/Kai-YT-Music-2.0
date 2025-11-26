/**
 * Playlist View
 */
const PlaylistView = {
  items: [],
  currentType: 'list', // 'list' or 'songs'
  currentPlaylist: null,

  /**
   * Initialize playlist view
   */
  init() {
    const listElement = document.getElementById('playlist-items');
    
    Navigation.registerView('playlist', {
      listElement: listElement,
      onEnter: () => this.onEnter(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: 'BACK', handler: () => this.handleBack() },
        center: { label: 'SELECT', handler: (index) => this.handleSelect(index) },
        right: { label: 'OPTIONS', handler: (index) => this.showOptions(index) }
      },
      keyHandler: () => false
    });
    
    // Initialize history and favorites views
    this.initHistoryView();
    this.initFavoritesView();
  },

  /**
   * On enter view
   */
  onEnter() {
    this.currentType = 'list';
    this.currentPlaylist = null;
    this.renderPlaylists();
  },

  /**
   * Render playlists
   */
  renderPlaylists() {
    this.items = Storage.getPlaylists();
    const listElement = document.getElementById('playlist-items');
    const emptyElement = document.getElementById('playlist-empty');
    
    if (this.items.length === 0) {
      UI.showEmptyState(emptyElement, listElement);
    } else {
      UI.hideEmptyState(emptyElement, listElement);
      
      const template = (playlist) => `
        <span class="menu-icon">📁</span>
        <span class="menu-text">${Utils.escapeHtml(playlist.name)} (${playlist.songs.length})</span>
      `;
      
      UI.renderList(listElement, this.items, template);
    }
    
    this.updateSoftkeys();
  },

  /**
   * Render playlist songs
   */
  renderSongs(playlist) {
    this.currentPlaylist = playlist;
    this.currentType = 'songs';
    this.items = playlist.songs;
    
    const listElement = document.getElementById('playlist-items');
    const emptyElement = document.getElementById('playlist-empty');
    
    document.getElementById('header-title').textContent = playlist.name;
    
    if (this.items.length === 0) {
      UI.showEmptyState(emptyElement, listElement);
    } else {
      UI.hideEmptyState(emptyElement, listElement);
      UI.renderList(listElement, this.items, UI.songItemTemplate);
    }
    
    this.updateSoftkeys();
  },

  /**
   * Update softkeys
   */
  updateSoftkeys() {
    if (this.currentType === 'list') {
      Navigation.setSoftkeys({
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'OPEN', handler: (index) => this.handleSelect(index) },
        right: { label: 'NEW', handler: () => this.createPlaylist() }
      });
    } else {
      Navigation.setSoftkeys({
        left: { label: 'BACK', handler: () => this.handleBack() },
        center: { label: 'PLAY', handler: (index) => this.playSong(index) },
        right: { label: 'OPTIONS', handler: (index) => this.showSongOptions(index) }
      });
    }
  },

  /**
   * Handle back navigation
   */
  handleBack() {
    if (this.currentType === 'songs') {
      this.currentType = 'list';
      this.currentPlaylist = null;
      document.getElementById('header-title').textContent = 'Playlists';
      this.renderPlaylists();
    } else {
      Navigation.goBack();
    }
  },

  /**
   * Handle selection
   */
  handleSelect(index) {
    if (this.currentType === 'list') {
      const playlist = this.items[index];
      if (playlist) {
        this.renderSongs(playlist);
        Navigation.setFocusedIndex(0);
      }
    } else {
      this.playSong(index);
    }
  },

  /**
   * Play song from playlist
   */
  async playSong(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const song = this.items[index];
    Player.setQueue(this.items, index);
    
    const success = await Player.play(song, false);
    
    if (success) {
      Navigation.navigateTo('player');
    }
  },

  /**
   * Show options
   */
  showOptions(index) {
    if (this.currentType === 'list') {
      const playlist = this.items[index];
      if (!playlist) return;
      
      Dialog.show({
        title: 'Playlist Options',
        message: playlist.name,
        options: [
          { label: 'Play All', value: 'playall' },
          { label: 'Delete Playlist', value: 'delete' },
          { label: 'Cancel', value: 'cancel' }
        ],
        onSelect: (value) => {
          switch (value) {
            case 'playall':
              if (playlist.songs.length > 0) {
                Player.setQueue(playlist.songs, 0);
                Player.play(playlist.songs[0], false);
                Navigation.navigateTo('player');
              } else {
                Toast.show('Playlist is empty');
              }
              break;
            case 'delete':
              Dialog.confirm('Delete this playlist?', () => {
                Storage.deletePlaylist(playlist.id);
                this.renderPlaylists();
                Toast.show('Playlist deleted');
              });
              break;
          }
        }
      });
    }
  },

  /**
   * Show song options
   */
  showSongOptions(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const song = this.items[index];
    
    Dialog.show({
      title: 'Song Options',
      message: Utils.truncate(song.title, 30),
      options: [
        { label: 'Play', value: 'play' },
        { label: 'Remove from Playlist', value: 'remove' },
        { label: 'Cancel', value: 'cancel' }
      ],
      onSelect: (value) => {
        switch (value) {
          case 'play':
            this.playSong(index);
            break;
          case 'remove':
            Storage.removeFromPlaylist(this.currentPlaylist.id, song.id);
            this.currentPlaylist = Storage.getPlaylists().find(
              p => p.id === this.currentPlaylist.id
            );
            this.renderSongs(this.currentPlaylist);
            Toast.show('Removed from playlist');
            break;
        }
      }
    });
  },

  /**
   * Create new playlist
   */
  createPlaylist() {
    // For simplicity, generate a default name
    // In a full implementation, you'd have a text input
    const name = `Playlist ${Storage.getPlaylists().length + 1}`;
    Storage.createPlaylist(name);
    this.renderPlaylists();
    Toast.show('Playlist created');
  },

  /**
   * Initialize history view
   */
  initHistoryView() {
    const listElement = document.getElementById('history-items');
    
    Navigation.registerView('history', {
      listElement: listElement,
      onEnter: () => this.renderHistory(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'PLAY', handler: (index) => this.playFromHistory(index) },
        right: { label: 'CLEAR', handler: () => this.clearHistory() }
      },
      keyHandler: () => false
    });
  },

  /**
   * Render history
   */
  renderHistory() {
    const items = Storage.getHistory();
    const listElement = document.getElementById('history-items');
    const emptyElement = document.getElementById('history-empty');
    
    this.items = items;
    
    if (items.length === 0) {
      UI.showEmptyState(emptyElement, listElement);
    } else {
      UI.hideEmptyState(emptyElement, listElement);
      UI.renderList(listElement, items, UI.songItemTemplate);
    }
  },

  /**
   * Play from history
   */
  async playFromHistory(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const song = this.items[index];
    Player.setQueue(this.items, index);
    
    const success = await Player.play(song, false);
    
    if (success) {
      Navigation.navigateTo('player');
    }
  },

  /**
   * Clear history
   */
  clearHistory() {
    Dialog.confirm('Clear all history?', () => {
      Storage.clearHistory();
      this.renderHistory();
      Toast.show('History cleared');
    });
  },

  /**
   * Initialize favorites view
   */
  initFavoritesView() {
    // Reuse playlist-items for favorites when navigating there
    Navigation.registerView('favorites', {
      listElement: document.getElementById('playlist-items'),
      onEnter: () => this.renderFavorites(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'PLAY', handler: (index) => this.playFromFavorites(index) },
        right: { label: 'OPTIONS', handler: (index) => this.showFavoriteOptions(index) }
      },
      keyHandler: () => false
    });
  },

  /**
   * Render favorites
   */
  renderFavorites() {
    const items = Storage.getFavorites();
    const listElement = document.getElementById('playlist-items');
    const emptyElement = document.getElementById('playlist-empty');
    
    this.items = items;
    this.currentType = 'favorites';
    
    document.getElementById('header-title').textContent = 'Favorites';
    
    if (items.length === 0) {
      UI.showEmptyState(emptyElement, listElement);
    } else {
      UI.hideEmptyState(emptyElement, listElement);
      UI.renderList(listElement, items, UI.songItemTemplate);
    }
  },

  /**
   * Play from favorites
   */
  async playFromFavorites(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const song = this.items[index];
    Player.setQueue(this.items, index);
    
    const success = await Player.play(song, false);
    
    if (success) {
      Navigation.navigateTo('player');
    }
  },

  /**
   * Show favorite options
   */
  showFavoriteOptions(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const song = this.items[index];
    
    Dialog.show({
      title: 'Options',
      message: Utils.truncate(song.title, 30),
      options: [
        { label: 'Play', value: 'play' },
        { label: 'Remove from Favorites', value: 'remove' },
        { label: 'Cancel', value: 'cancel' }
      ],
      onSelect: (value) => {
        switch (value) {
          case 'play':
            this.playFromFavorites(index);
            break;
          case 'remove':
            Storage.removeFromFavorites(song.id);
            this.renderFavorites();
            Toast.show('Removed from favorites');
            break;
        }
      }
    });
  }
};
