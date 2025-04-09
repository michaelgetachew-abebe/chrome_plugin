// State Manager for WhatsApp Helper Extension
class StateManager {
    constructor() {
      this.initialized = false
      this.stateKey = "whatsapp_helper_state"
      this.debounceTimer = null
      this.debounceDelay = 500 // ms
    }
  
    // Initialize the state manager
    async initialize() {
      if (this.initialized) return
  
      // Set up event listeners for tab/window visibility changes
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
  
      // Set up event listener for before unload
      window.addEventListener("beforeunload", this.saveState.bind(this))
  
      this.initialized = true
  
      // Load state on initialization
      return this.loadState()
    }
  
    // Handle visibility change (tab switching, window minimizing, etc.)
    handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // Save state when tab becomes hidden
        this.saveState()
      } else if (document.visibilityState === "visible") {
        // Load state when tab becomes visible again
        this.loadState().then((state) => {
          if (state) {
            this.applyState(state)
          }
        })
      }
    }
  
    // Save current application state
    saveState() {
      // Clear any pending debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
  
      // Debounce the save operation to prevent excessive writes
      this.debounceTimer = setTimeout(() => {
        const state = this.collectState()
  
        // Save to chrome.storage.local
        if (typeof chrome !== "undefined" && chrome && chrome.storage) {
          chrome.storage.local.set({ [this.stateKey]: state }, () => {
            console.log("State saved:", state)
          })
        } else {
          // Fallback to localStorage for development/testing
          localStorage.setItem(this.stateKey, JSON.stringify(state))
          console.log("State saved to localStorage:", state)
        }
      }, this.debounceDelay)
    }
  
    // Load saved application state
    async loadState() {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome && chrome.storage) {
          chrome.storage.local.get([this.stateKey], (result) => {
            const state = result[this.stateKey]
            console.log("State loaded:", state)
            resolve(state)
          })
        } else {
          // Fallback to localStorage for development/testing
          const stateJson = localStorage.getItem(this.stateKey)
          const state = stateJson ? JSON.parse(stateJson) : null
          console.log("State loaded from localStorage:", state)
          resolve(state)
        }
      })
    }
  
    // Collect current application state
    collectState() {
      const currentPage = window.location.href.includes("chat.html") ? "chat" : "autoreply"
  
      // Common state
      const state = {
        currentPage,
        darkMode: document.body.classList.contains("dark"),
        timestamp: Date.now(),
      }
  
      // Page-specific state
      if (currentPage === "autoreply") {
        // WhatsApp Helper page state
        state.autoreply = {
          currentChat: window.currentChat,
          lastAIResult: window.lastAIResult,
          chatHistories: window.chatHistories || {},
          statusText: document.getElementById("status")?.textContent,
          showingAIResponse: !document.getElementById("ai-response-container")?.classList.contains("hidden"),
          currentSlide: window.currentSlide || 0,
        }
      } else {
        // Test Chat page state
        state.chat = {
          chatHistory: this.collectChatHistory(),
          lastChatAIResult: window.lastChatAIResult,
          currentChatMessage: window.currentChatMessage,
          showingAIResponse: !document.getElementById("ai-response-container2")?.classList.contains("hidden"),
        }
      }
  
      return state
    }
  
    // Collect chat history from DOM
    collectChatHistory() {
      const chatHistory = document.getElementById("chat-history")
      if (!chatHistory) return []
  
      const messages = []
      const messageElements = chatHistory.querySelectorAll(".chat-message")
  
      messageElements.forEach((element) => {
        const isUser = element.classList.contains("user")
        const titleElement = element.querySelector(".message-title")
        const messageElement = element.querySelector("p")
  
        if (messageElement) {
          messages.push({
            isUser,
            title: titleElement ? titleElement.textContent : "",
            message: messageElement.textContent,
          })
        }
      })
  
      return messages
    }
  
    // Apply loaded state to the application
    applyState(state) {
      if (!state) return
  
      // Apply common state
      if (state.darkMode !== undefined) {
        const isDarkMode = state.darkMode
        const currentIsDarkMode = document.body.classList.contains("dark")
  
        if (isDarkMode !== currentIsDarkMode) {
          document.body.classList.toggle("dark")
          const themeToggle = document.getElementById("theme-toggle")
          const sunIcon = themeToggle?.querySelector(".sun")
          const moonIcon = themeToggle?.querySelector(".moon")
  
          if (sunIcon && moonIcon) {
            sunIcon.classList.toggle("hidden")
            moonIcon.classList.toggle("hidden")
          }
        }
      }
  
      // Apply page-specific state
      const currentPage = window.location.href.includes("chat.html") ? "chat" : "autoreply"
  
      if (currentPage === "autoreply" && state.autoreply) {
        this.applyAutoreplyState(state.autoreply)
      } else if (currentPage === "chat" && state.chat) {
        this.applyChatState(state.chat)
      }
    }
  
    // Apply WhatsApp Helper page state
    applyAutoreplyState(autoreplyState) {
      // Restore global variables
      if (autoreplyState.currentChat) window.currentChat = autoreplyState.currentChat
      if (autoreplyState.lastAIResult) window.lastAIResult = autoreplyState.lastAIResult
      if (autoreplyState.chatHistories) window.chatHistories = autoreplyState.chatHistories
      if (autoreplyState.currentSlide !== undefined) window.currentSlide = autoreplyState.currentSlide
  
      // Restore status text
      const statusText = document.getElementById("status")
      if (statusText && autoreplyState.statusText) {
        statusText.textContent = autoreplyState.statusText
      }
  
      // Restore chat history display
      if (window.currentChat && window.chatHistories) {
        const contactName = window.currentChat.contact_name
        if (contactName && typeof window.displayChatHistory === "function") {
          window.displayChatHistory(contactName)
        }
      }
  
      // Restore AI response if it was showing
      if (autoreplyState.showingAIResponse && window.lastAIResult) {
        const aiResponseContainer = document.getElementById("ai-response-container")
        const customerResponse = document.getElementById("customer-response")
        const operatorResponse = document.getElementById("operator-response")
        const customerQuestionUkrainian = document.getElementById("customer-question-ukrainian")
  
        if (aiResponseContainer) {
          // Hide chat history
          if (typeof window.toggleChatHistory === "function") {
            window.toggleChatHistory(false)
          }
  
          // Show AI response
          aiResponseContainer.classList.remove("hidden")
  
          // Populate response fields
          if (customerResponse) {
            customerResponse.textContent = window.lastAIResult.customer_response || "No response provided"
          }
          if (operatorResponse) {
            operatorResponse.textContent = window.lastAIResult.operator_response || "No response provided"
          }
          if (customerQuestionUkrainian) {
            customerQuestionUkrainian.textContent =
              window.lastAIResult.customer_question_ukranian || "No response provided"
          }
  
          // Initialize carousel
          if (typeof window.initCarousel === "function") {
            window.initCarousel()
          }
  
          // Set current slide
          if (typeof window.updateCarousel === "function" && autoreplyState.currentSlide !== undefined) {
            window.currentSlide = autoreplyState.currentSlide
            window.updateCarousel()
          }
        }
      }
    }
  
    // Apply Test Chat page state
    applyChatState(chatState) {
      // Restore global variables
      if (chatState.lastChatAIResult) window.lastChatAIResult = chatState.lastChatAIResult
      if (chatState.currentChatMessage) window.currentChatMessage = chatState.currentChatMessage
  
      // Restore chat history
      const chatHistory = document.getElementById("chat-history")
      if (chatHistory && chatState.chatHistory && chatState.chatHistory.length > 0) {
        // Clear existing chat history
        chatHistory.innerHTML = ""
  
        // Recreate chat messages
        chatState.chatHistory.forEach((message) => {
          if (typeof window.addChatMessage === "function") {
            window.addChatMessage(message.message, message.isUser, message.title)
          } else {
            // Fallback if addChatMessage function is not available
            const messageDiv = document.createElement("div")
            messageDiv.classList.add("chat-message", message.isUser ? "user" : "ai")
  
            if (!message.isUser && message.title) {
              const titleElement = document.createElement("h4")
              titleElement.classList.add("message-title")
              titleElement.textContent = message.title
              messageDiv.appendChild(titleElement)
            }
  
            const messageContent = document.createElement("p")
            messageContent.textContent = message.message
            messageDiv.appendChild(messageContent)
            chatHistory.appendChild(messageDiv)
          }
        })
  
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight
      }
  
      // Restore AI response container if it was showing
      if (chatState.showingAIResponse) {
        const aiResponseContainer = document.getElementById("ai-response-container2")
        if (aiResponseContainer) {
          aiResponseContainer.classList.remove("hidden")
        }
      }
    }
  }
  
  // Create a singleton instance
  const stateManager = new StateManager()
  
  // Export the singleton
  window.stateManager = stateManager
  