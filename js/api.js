/**
 * API Service
 * Handles all YouTube Music API interactions
 */
const API = {
  // Configuration
  BASE_URL: 'https://pipedapi.kavin.rocks', // Example Piped API
  INVIDIOUS_URL: 'https://invidious.snopyta.org', // Fallback
  
  requestId: 0,
  
  /**
   * Make API request with retry logic
   */
  async request(endpoint, options = {}, retries = 3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.BASE_URL}${endpoint}`, finalOptions);
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await Utils.sleep(1000 * attempt);
      }
    }
  },

  /**
   * Search for music
   */
  async search(query, filter = 'music_songs') {
    const currentId = ++this.requestId;
    
    // Check cache first
    const cacheKey = `search_${query}_${filter}`;
    const cached = Storage.getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const data = await this.request(`/search?q=${encodeURIComponent(query)}&filter=${filter}`);
      
      // Check if this is still the latest request
      if (currentId !== this.requestId) {
        return null; // Stale request
      }
      
      const results = this.parseSearchResults(data);
      
      // Cache results
      Storage.setCache(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  /**
   * Parse search results
   */
  parseSearchResults(data) {
    if (!data || !data.items) return [];
    
    return data.items
      .filter(item => item.type === 'stream')
      .map(item => ({
        id: item.url ? item.url.split('v=')[1] : null,
        title: item.title || 'Unknown Title',
        artist: item.uploaderName || 'Unknown Artist',
        thumbnail: item.thumbnail || '',
        duration: item.duration || 0,
        durationText: Utils.formatTime(item.duration || 0)
      }))
      .filter(item => item.id);
  },

  /**
   * Get stream URL for a video
   */
  async getStreamUrl(videoId) {
    // Check cache
    const cacheKey = `stream_${videoId}`;
    const cached = Storage.getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const data = await this.request(`/streams/${videoId}`);
      
      // Find best audio stream
      const audioStreams = data.audioStreams || [];
      let bestStream = null;
      
      // Prefer medium quality
      const quality = Storage.getSetting('quality') || 'medium';
      
      if (quality === 'low') {
        bestStream = audioStreams
          .filter(s => s.mimeType && s.mimeType.includes('audio'))
          .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0];
      } else if (quality === 'high') {
        bestStream = audioStreams
          .filter(s => s.mimeType && s.mimeType.includes('audio'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      } else {
        // Medium - pick middle bitrate
        const sorted = audioStreams
          .filter(s => s.mimeType && s.mimeType.includes('audio'))
          .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
        bestStream = sorted[Math.floor(sorted.length / 2)];
      }
      
      if (!bestStream) {
        throw new Error('No audio stream available');
      }
      
      const streamUrl = bestStream.url;
      
      // Cache for 4 hours
      Storage.setCache(cacheKey, streamUrl);
      
      return streamUrl;
    } catch (error) {
      console.error('Get stream error:', error);
      throw error;
    }
  },

  /**
   * Get video details
   */
  async getVideoDetails(videoId) {
    try {
      const data = await this.request(`/streams/${videoId}`);
      
      return {
        id: videoId,
        title: data.title || 'Unknown Title',
        artist: data.uploader || 'Unknown Artist',
        thumbnail: data.thumbnailUrl || '',
        duration: data.duration || 0,
        durationText: Utils.formatTime(data.duration || 0),
        description: data.description || '',
        views: data.views || 0,
        uploadDate: data.uploadDate || ''
      };
    } catch (error) {
      console.error('Get video details error:', error);
      throw error;
    }
  },

  /**
   * Get suggestions
   */
  async getSuggestions(query) {
    try {
      const data = await this.request(`/suggestions?query=${encodeURIComponent(query)}`);
      return data || [];
    } catch (error) {
      console.error('Get suggestions error:', error);
      return [];
    }
  },

  /**
   * Get trending music
   */
  async getTrending(region = 'US') {
    const cacheKey = `trending_${region}`;
    const cached = Storage.getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const data = await this.request(`/trending?region=${region}`);
      const results = this.parseSearchResults(data);
      
      Storage.setCache(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Get trending error:', error);
      throw error;
    }
  },

  /**
   * Get related videos
   */
  async getRelated(videoId) {
    try {
      const data = await this.request(`/streams/${videoId}`);
      
      if (!data.relatedStreams) return [];
      
      return data.relatedStreams
        .filter(item => item.type === 'stream')
        .map(item => ({
          id: item.url ? item.url.split('v=')[1] : null,
          title: item.title || 'Unknown Title',
          artist: item.uploaderName || 'Unknown Artist',
          thumbnail: item.thumbnail || '',
          duration: item.duration || 0,
          durationText: Utils.formatTime(item.duration || 0)
        }))
        .filter(item => item.id)
        .slice(0, 10);
    } catch (error) {
      console.error('Get related error:', error);
      return [];
    }
  }
};
