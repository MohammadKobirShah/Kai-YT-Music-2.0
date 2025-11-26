/**
 * UI Manager
 * Handles all UI updates and components
 */
const UI = {
  /**
   * Show loading overlay
   */
  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingText) loadingText.textContent = message;
    if (loading) loading.classList.remove('hidden');
  },

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  },

  /**
   * Render a list of items
   */
  renderList(container, items, template) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (items.length === 0) {
      return;
    }
    
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.innerHTML = template(item, index);
      li.dataset.index = index;
      
      if (index === 0) {
        li.classList.add('focused');
      }
      
      container.appendChild(li);
    });
  },

  /**
   * Song item template
   */
  songItemTemplate(song, index) {
    const thumbnail = song.thumbnail || 'assets/default-thumbnail.png';
    const title = Utils.escapeHtml(Utils.truncate(song.title, 35));
    const artist = Utils.escapeHtml(Utils.truncate(song.artist, 30));
    const duration = song.durationText || Utils.formatTime(song.duration);
    
    return `
      <div class="item-card">
        <img class="thumbnail" src="${thumbnail}" alt="" onerror="this.src='assets/default-thumbnail.png'">
        <div class="item-info">
          <div class="item-title">${title}</div>
          <div class="item-subtitle">${artist}</div>
        </div>
        <div class="item-duration">${duration}</div>
      </div>
    `;
  },

  /**
   * Menu item template
   */
  menuItemTemplate(item) {
    return `
      <span class="menu-icon">${item.icon}</span>
      <span class="menu-text">${item.label}</span>
    `;
  },

  /**
   * Show empty state
   */
  showEmptyState(emptyElement, listElement) {
    if (emptyElement) emptyElement.classList.remove('hidden');
    if (listElement) listElement.classList.add('hidden');
  },

  /**
   * Hide empty state
   */
  hideEmptyState(emptyElement, listElement) {
    if (emptyElement) emptyElement.classList.add('hidden');
    if (listElement) listElement.classList.remove('hidden');
  },

  /**
   * Scroll to focused item
   */
  scrollToFocused(container) {
    const focused = container.querySelector('.focused');
    if (focused) {
      focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
};
