/**
 * Search View
 */
const SearchView = {
  results: [],
  searchInput: null,
  isInputFocused: true,
  searchTimeout: null,

  /**
   * Initialize search view
   */
  init() {
    this.searchInput = document.getElementById('search-input');
    const listElement = document.getElementById('search-results');
    
    Navigation.registerView('search', {
      listElement: listElement,
      onEnter: () => this.onEnter(),
      onExit: () => this.onExit(),
      onFocus: () => {},
      softkeys: {
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'PLAY', handler: (index) => this.playSelected(index) },
        right: { label: 'OPTIONS', handler: (index) => this.showOptions(index) }
      },
      keyHandler: (key, e) => this.handleKey(key, e)
    });
    
    // Bind input events
    this.searchInput.addEventListener('input', Utils.debounce(() => {
      this.performSearch();
    }, 500));
  },

  /**
   * On enter view
   */
  onEnter() {
    this.isInputFocused = true;
    this.searchInput.focus();
    this.updateSoftkeys();
  },

  /**
   * On exit view
   */
  onExit() {
    this.searchInput.blur();
  },

  /**
   * Handle key events
   */
  handleKey(key, e) {
    if (this.isInputFocused) {
      if (key === 'ArrowDown' && this.results.length > 0) {
        this.isInputFocused = false;
        this.searchInput.blur();
        Navigation.setFocusedIndex(0);
        this.updateSoftkeys();
        return true;
      }
      return false;
    } else {
      if (key === 'ArrowUp' && Navigation.getFocusedIndex() === 0) {
        this.isInputFocused = true;
        this.searchInput.focus();
        this.updateSoftkeys();
        return true;
      }
      return false;
    }
  },

  /**
   * Update softkeys based on state
   */
  updateSoftkeys() {
    if (this.isInputFocused) {
      Navigation.setSoftkeys({
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'SEARCH', handler: () => this.performSearch() },
        right: { label: '', handler: () => {} }
      });
    } else {
      Navigation.setSoftkeys({
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'PLAY', handler: (index) => this.playSelected(index) },
        right: { label: 'OPTIONS', handler: (index) => this.showOptions(index) }
      });
    }
  },

  /**
   * Perform search
   */
  async performSearch() {
    const query = this.searchInput.value.trim();
    
    if (query.length < 2) {
      return;
    }
    
    try {
      UI.showLoading('Searching...');
      
      const results = await API.search(query);
      
      UI.hideLoading();
      
      if (results === null) {
        return; // Stale request
      }
      
      this.results = results;
      this.renderResults();
      
    } catch (error) {
      UI.hideLoading();
      Toast.show('Search failed');
      console.error('Search error:', error);
    }
  },

  /**
   * Render search results
   */
  renderResults() {
    const listElement = document.getElementById('search-results');
    const emptyElement = document.getElementById('search-empty');
    
    if (this.results.length === 0) {
      UI.showEmptyState(emptyElement, listElement);
    } else {
      UI.hideEmptyState(emptyElement, listElement);
      UI.renderList(listElement, this.results, UI.songItemTemplate);
    }
  },

  /**
   * Show results from external source (trending, etc.)
   */
  showResults(results, title = 'Results') {
    this.results = results;
    Navigation.navigateTo('search');
    document.getElementById('header-title').textContent = title;
    this.searchInput.value = '';
    this.isInputFocused = false;
    this.renderResults();
    Navigation.setFocusedIndex(0);
    this.updateSoftkeys();
  },

  /**
   * Play selected song
   */
  async playSelected(index) {
    if (index < 0 || index >= this.results.length) return;
    
    const song = this.results[index];
    
    // Set entire results as queue
    Player.setQueue(this.results, index);
    
    const success = await Player.play(song, false);
    
    if (success) {
      Navigation.navigateTo('player');
    }
  },

  /**
   * Show options for selected song
   */
  showOptions(index) {
    if (index < 0 || index >= this.results.length) return;
    
    const song = this.results[index];
    const isFavorite = Storage.isFavorite(song.id);
    
    Dialog.show({
      title: 'Options',
      message: Utils.truncate(song.title, 30),
      options: [
        { label: 'Play', value: 'play' },
        { label: 'Play Next', value: 'playnext' },
        { label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites', value: 'favorite' },
        { label: 'Add to Playlist', value: 'playlist' },
        { label: 'Cancel', value: 'cancel' }
      ],
      onSelect: (value) => {
        switch (value) {
          case 'play':
            this.playSelected(index);
            break;
          case 'playnext':
            Player.queue.splice(Player.queueIndex + 1, 0, song);
            Toast.show('Added to queue');
            break;
          case 'favorite':
            if (isFavorite) {
              Storage.removeFromFavorites(song.id);
              Toast.show('Removed from favorites');
            } else {
              Storage.addToFavorites(song);
              Toast.show('Added to favorites');
            }
            break;
          case 'playlist':
            this.showPlaylistDialog(song);
            break;
        }
      }
    });
  },

  /**
   * Show playlist selection dialog
   */
  showPlaylistDialog(song) {
    const playlists = Storage.getPlaylists();
    
    if (playlists.length === 0) {
      Toast.show('No playlists. Create one first.');
      return;
    }
    
    const options = playlists.map(p => ({
      label: p.name,
      value: p.id
    }));
    options.push({ label: 'Cancel', value: 'cancel' });
    
    Dialog.show({
      title: 'Add to Playlist',
      message: '',
      options: options,
      onSelect: (value) => {
        if (value !== 'cancel') {
          Storage.addToPlaylist(value, song);
          Toast.show('Added to playlist');
        }
      }
    });
  }
};
