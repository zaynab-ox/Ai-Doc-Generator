// core/eventBus.js — Navigation Binding System
// Modules ko directly connect karne ki zaroorat nahi
// Sirf events ke through communicate hote hain

const EventBus = {
  _events: {},

  on(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this; // chaining ke liye
  },

  emit(event, data) {
    (this._events[event] || []).forEach(cb => {
      try { cb(data); }
      catch(e) { console.error(`EventBus error [${event}]:`, e); }
    });
    return this;
  },

  off(event, callback) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter(cb => cb !== callback);
  },

  once(event, callback) {
    const wrapper = (data) => { callback(data); this.off(event, wrapper); };
    this.on(event, wrapper);
  }
};

// Events map — poora project ka event system
// 'code:ready'      → Input → Parser
// 'parsed:done'     → Parser → Analyzer
// 'analyzed:done'   → Analyzer → AI Engine
// 'docs:ready'      → AI Engine → Preview + Export
// 'status:update'   → Koi bhi → UI
// 'error:occurred'  → Koi bhi → Toast + UI reset
