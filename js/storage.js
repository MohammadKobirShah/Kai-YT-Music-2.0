/**
 * Storage Manager
 * Handles all persistent data
 */
const Storage = {
  KEYS: {
    PLAYLISTS: 'kaiyt_playlists',
    HISTORY: 'kaiyt_history',
    FAVORITES: 'kaiyt_favorites',
    SETTINGS: 'kaiyt_settings',
    CACHE: 'kaiyt_cache',
    LAST_PLAYED: 'kaiyt_last_played'
  },

  MAX_HISTORY: 50,
  MAX_CACHE: 20,

  /**
   * Initialize storage with defaults
   */
  init() {
    if (!this.get(this.KEYS.SETTINGS)) {
      this.set(this.KEYS.SETTINGS, {
        volume: 100,
        shuffle: false,
        repeat: 'off', // off, one, all
        quality: 'medium',
        theme: 'dark'
      });
    }

    if (!this.get(this.KEYS.PLAYLISTS)) {
      this.set(this.KEYS.PLAYLISTS, []);
    }

    if (!this.get(this.KEYS.HISTORY)) {
      this.set(this.KEYS.HISTORY, []);
    }

    if (!this.get(this.KEYS.FAVORITES)) {
      this.set(this.KEYS.FAVORITES, []);
    }

    if (!this.get(this.KEYS.CACHE)) {
      this.set(this.KEYS.CACHE, {});
    }
  },

  /**
   * Get item from storage
   */
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  /**
   * Set item in storage
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      // Handle quota exceeded
      if (e.name === 'QuotaExceededError') {
        this.clearOldData();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e2) {
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Remove item from storage
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },

  /**
   * Clear old data when storage is full
   */
  clearOldData() {
    const cache = this.get(this.KEYS.CACHE) || {};
    const keys = Object.keys(cache);
    
    // Remove oldest cache entries
    keys.slice(0, Math.floor(keys.length / 2)).forEach(key => {
      delete cache[key];
    });
    
    this.set(this.KEYS.CACHE, cache);
    
    // Trim history
    const history = this.get(this.KEYS.HISTORY) || [];
    if (history.length > this.MAX_HISTORY / 2) {
      this.set(this.KEYS.HISTORY, history.slice(0, this.MAX_HISTORY / 2));
    }
  },

  // ===== Settings =====
  getSettings() {
    return this.get(this.KEYS.SETTINGS) || {};
  },

  updateSettings(updates) {
    const settings = this.getSettings();
    Object.assign(settings, updates);
    return this.set(this.KEYS.SETTINGS, settings);
  },

  getSetting(key) {
    const settings = this.getSettings();
    return settings[key];
  },

  // ===== History =====
  getHistory() {
    return this.get(this.KEYS.HISTORY) || [];
  },

  addToHistory(song) {
    let history = this.getHistory();
    
    // Remove duplicate if exists
    history = history.filter(item => item.id !== song.id);
    
    // Add to beginning
    history.unshift({
      ...song,
      playedAt: Date.now()
    });
    
    // Limit size
    if (history.length > this.MAX_HISTORY) {
      history = history.slice(0, this.MAX_HISTORY);
    }
    
    return this.set(this.KEYS.HISTORY, history);
  },

  clearHistory() {
    return this.set(this.KEYS.HISTORY, []);
  },

  // ===== Favorites =====
  getFavorites() {
    return this.get(this.KEYS.FAVORITES) || [];
  },

  addToFavorites(song) {
    const favorites = this.getFavorites();
    
    if (!favorites.find(item => item.id === song.id)) {
      favorites.unshift({
        ...song,
        addedAt: Date.now()
      });
      return this.set(this.KEYS.FAVORITES, favorites);
    }
    return true;
  },

  removeFromFavorites(songId) {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(item => item.id !== songId);
    return this.set(this.KEYS.FAVORITES, filtered);
  },

  isFavorite(songId) {
    const favorites = this.getFavorites();
    return favorites.some(item => item.id === songId);
  },

  // ===== Playlists =====
  getPlaylists() {
    return this.get(this.KEYS.PLAYLISTS) || [];
  },

  createPlaylist(name) {
    const playlists = this.getPlaylists();
    const newPlaylist = {
      id: Utils.generateId(),
      name: name,
      songs: [],
      createdAt: Date.now()
    };
    playlists.push(newPlaylist);
    this.set(this.KEYS.PLAYLISTS, playlists);
    return newPlaylist;
  },

  addToPlaylist(playlistId, song) {
    const playlists = this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (playlist && !playlist.songs.find(s => s.id === song.id)) {
      playlist.songs.push(song);
      return this.set(this.KEYS.PLAYLISTS, playlists);
    }
    return false;
  },

  removeFromPlaylist(playlistId, songId) {
    const playlists = this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (playlist) {
      playlist.songs = playlist.songs.filter(s => s.id !== songId);
      return this.set(this.KEYS.PLAYLISTS, playlists);
    }
    return false;
  },

  deletePlaylist(playlistId) {
    const playlists = this.getPlaylists();
    const filtered = playlists.filter(p => p.id !== playlistId);
    return this.set(this.KEYS.PLAYLISTS, filtered);
  },

  // ===== Cache =====
  getCache(key) {
    const cache = this.get(this.KEYS.CACHE) || {};
    const item = cache[key];
    
    if (!item) return null;
    
    // Check if expired (5 minutes default)
    if (Date.now() - item.timestamp > 300000) {
      delete cache[key];
      this.set(this.KEYS.CACHE, cache);
      return null;
    }
    
    return item.data;
  },

  setCache(key, data) {
    const cache = this.get(this.KEYS.CACHE) || {};
    
    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length >= this.MAX_CACHE) {
      delete cache[keys[0]];
    }
    
    cache[key] = {
      data: data,
      timestamp: Date.now()
    };
    
    return this.set(this.KEYS.CACHE, cache);
  },

  // ===== Last Played =====
  getLastPlayed() {
    return this.get(this.KEYS.LAST_PLAYED);
  },

  setLastPlayed(song, position) {
    return this.set(this.KEYS.LAST_PLAYED, {
      song: song,
      position: position,
      timestamp: Date.now()
    });
  }
};

// Initialize storage
Storage.init();
