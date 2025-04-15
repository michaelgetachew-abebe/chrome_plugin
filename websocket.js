// WebSocket connection manager
class WebSocketManager {
    constructor() {
      this.socket = null
      this.isConnected = false
      this.reconnectAttempts = 0
      this.maxReconnectAttempts = 5
      this.reconnectDelay = 800 // Start with 2 seconds
      this.messageCallbacks = []
      this.connectionCallbacks = []
      this.disconnectionCallbacks = []
    }
  
    // Connect to WebSocket server with JWT token
    connect(token) {
      if (!token) {
        console.error("No token provided for WebSocket connection")
        return false
      }
  
      try {
        // Close existing connection if any
        if (this.socket) {
          this.socket.close()
        }
  
        console.log("Establishing WebSocket connection with token")
  
        // Create new WebSocket connection with token
        this.socket = new WebSocket(`wss://api.srv768692.hstgr.cloud/ws?token=${token}`)
  
        // Set up event handlers
        this.socket.onopen = () => this.handleOpen()
        this.socket.onmessage = (event) => this.handleMessage(event)
        this.socket.onclose = (event) => this.handleClose(event)
        this.socket.onerror = (error) => this.handleError(error)
  
        return true
      } catch (error) {
        console.error("WebSocket connection error:", error)
        return false
      }
    }
  
    // Handle successful connection
    handleOpen() {
      console.log("WebSocket connection established")
      this.isConnected = true
      this.reconnectAttempts = 0
      this.reconnectDelay = 2000
  
      // Notify all connection callbacks
      this.connectionCallbacks.forEach((callback) => callback())
    }
  
    // Handle incoming messages
    handleMessage(event) {
      try {
        const data = JSON.parse(event.data)
        console.log("WebSocket message received:", data)
  
        // Notify all message callbacks
        this.messageCallbacks.forEach((callback) => callback(data))
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
        console.log("Raw message:", event.data)
  
        // Still notify callbacks with the raw data
        this.messageCallbacks.forEach((callback) => callback({ raw: event.data }))
      }
    }
  
    // Handle connection close
    handleClose(event) {
      this.isConnected = false
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
  
      // Notify all disconnection callbacks
      this.disconnectionCallbacks.forEach((callback) => callback(event))
  
      // Attempt to reconnect if not a normal closure, not an auth error, and we haven't exceeded max attempts
      if (
        event.code !== 1000 &&
        event.code !== 1001 &&
        event.code !== 1008 &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.attemptReconnect()
      } else if (event.code === 1008) {
        console.log("Authentication error detected, not attempting reconnect")
      }
    }
  
    // Handle connection error
    handleError(error) {
      console.error("WebSocket error:", error)
    }
  
    // Attempt to reconnect with exponential backoff
    attemptReconnect() {
      this.reconnectAttempts++
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1))
  
      console.log(
        `Attempting to reconnect in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      )
  
      setTimeout(() => {
        const token = localStorage.getItem("whatsapp_helper_token")
        if (token) {
          console.log("Reconnecting with stored token")
          this.connect(token)
        } else {
          console.error("No token available for reconnection")
        }
      }, delay)
    }
  
    // Send a message to the server
    sendMessage(message) {
      if (!this.isConnected || !this.socket) {
        console.error("Cannot send message: WebSocket not connected")
        return false
      }
  
      try {
        const messageString = typeof message === "string" ? message : JSON.stringify(message)
        this.socket.send(messageString)
        return true
      } catch (error) {
        console.error("Error sending WebSocket message:", error)
        return false
      }
    }
  
    // Close the connection
    disconnect() {
      if (this.socket) {
        this.socket.close(1000, "User logged out")
        this.socket = null
        this.isConnected = false
      }
    }
  
    // Register a callback for incoming messages
    onMessage(callback) {
      if (typeof callback === "function") {
        this.messageCallbacks.push(callback)
      }
    }
  
    // Register a callback for connection events
    onConnect(callback) {
      if (typeof callback === "function") {
        this.connectionCallbacks.push(callback)
        // If already connected, call the callback immediately
        if (this.isConnected) {
          callback()
        }
      }
    }
  
    // Register a callback for disconnection events
    onDisconnect(callback) {
      if (typeof callback === "function") {
        this.disconnectionCallbacks.push(callback)
      }
    }
  
    // Remove a callback
    removeCallback(callback, type = "all") {
      const removeFromArray = (array) => {
        const index = array.indexOf(callback)
        if (index !== -1) {
          array.splice(index, 1)
        }
      }
  
      if (type === "message" || type === "all") {
        removeFromArray(this.messageCallbacks)
      }
      if (type === "connect" || type === "all") {
        removeFromArray(this.connectionCallbacks)
      }
      if (type === "disconnect" || type === "all") {
        removeFromArray(this.disconnectionCallbacks)
      }
    }
  }
  
  // Create a singleton instance
  const wsManager = new WebSocketManager()
  
  // Export the singleton
  window.wsManager = wsManager
  