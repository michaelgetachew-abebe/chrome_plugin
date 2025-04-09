document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const themeToggle = document.getElementById("theme-toggle")
    const sunIcon = themeToggle?.querySelector(".sun")
    const moonIcon = themeToggle?.querySelector(".moon")
    const loginBtn = document.getElementById("login-btn")
    const agentIdInput = document.getElementById("agent-id")
    const passwordInput = document.getElementById("password")
    const loginError = document.getElementById("login-error")
    const loginForm = document.getElementById("login-form")
    const loginStatus = document.getElementById("login-status")
  
    // Backend API URLs
    const API_BASE_URL = "https://api.srv768692.hstgr.cloud"
    const LOGIN_URL = `${API_BASE_URL}/login`
  
    // Check if user is already logged in
    function checkAuthStatus() {
      const token = localStorage.getItem("whatsapp_helper_token")
      if (token) {
        console.log("Found existing auth token, verifying...")
  
        // Verify token validity by trying to establish WebSocket connection
        if (window.wsManager) {
          // Only connect if not already connected
          if (!window.wsManager.isConnected) {
            window.wsManager.connect(token)
          }
  
          window.wsManager.onConnect(() => {
            console.log("WebSocket connection successful, token is valid")
            redirectToMainPage()
          })
  
          window.wsManager.onDisconnect((event) => {
            // If disconnected with an auth error code, clear token and show login
            if (event.code === 1008) {
              console.log("Authentication error in WebSocket, clearing token")
              localStorage.removeItem("whatsapp_helper_token")
              localStorage.removeItem("whatsapp_helper_agent_id")
              localStorage.removeItem("whatsapp_helper_agent_name")
              localStorage.removeItem("whatsapp_helper_auth")
              showError("Session expired. Please login again.")
            } else {
              // For other disconnection reasons, still try to redirect
              // The script.js will handle reconnection if needed
              console.log("WebSocket disconnected for non-auth reason, still redirecting")
              redirectToMainPage()
            }
          })
        } else {
          // If WebSocket manager is not available, try to redirect anyway
          console.log("WebSocket manager not available, redirecting based on token presence")
          redirectToMainPage()
        }
      }
    }
  
    // Redirect to main page
    function redirectToMainPage() {
      window.location.href = "index.html"
    }
  
    // Handle login
    async function handleLogin() {
      if (loginStatus) loginStatus.textContent = "Logging in..."
  
      const agentname = agentIdInput.value.trim()
      const password = passwordInput.value.trim()
  
      if (!agentname || !password) {
        showError("Please enter both Agent ID and Password")
        if (loginStatus) loginStatus.textContent = ""
        return
      }
  
      try {
        const response = await fetch(LOGIN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentname, password }),
        })
  
        const data = await response.json()
  
        if (!response.ok) {
          throw new Error(data.detail || "Login failed")
        }
  
        console.log("Login successful, storing authentication data")
  
        // Store authentication data
        localStorage.setItem("whatsapp_helper_token", data.token)
        localStorage.setItem("whatsapp_helper_agent_id", data.agent.id)
        localStorage.setItem("whatsapp_helper_agent_name", data.agent.agentname)
        localStorage.setItem("whatsapp_helper_agent_persona", data.agent.persona)
        localStorage.setItem("whatsapp_helper_auth", "true")
  
        // Connect to WebSocket
        if (window.wsManager) {
          window.wsManager.connect(data.token)
        }
  
        // Redirect to main page
        redirectToMainPage()
      } catch (error) {
        console.error("Login error:", error)
        showError(error.message || "Login failed. Please try again.")
        if (loginStatus) loginStatus.textContent = ""
      }
    }
  
    // Show error message
    function showError(message) {
      if (!loginError) return
  
      loginError.textContent = message
      loginError.classList.remove("hidden")
  
      // Hide error after 3 seconds
      setTimeout(() => {
        loginError.classList.add("hidden")
      }, 3000)
    }
  
    // Theme Toggle
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark")
        const isDarkMode = document.body.classList.contains("dark")
        if (sunIcon && moonIcon) {
          sunIcon.classList.toggle("hidden")
          moonIcon.classList.toggle("hidden")
        }
        localStorage.setItem("darkMode", isDarkMode ? "true" : "false")
      })
  
      const savedTheme = localStorage.getItem("darkMode")
      if (savedTheme === "true") {
        document.body.classList.add("dark")
        if (sunIcon && moonIcon) {
          sunIcon.classList.add("hidden")
          moonIcon.classList.remove("hidden")
        }
      }
    }
  
    // Event listeners
    if (loginBtn) {
      loginBtn.addEventListener("click", (e) => {
        e.preventDefault()
        handleLogin()
      })
    }
  
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault()
        handleLogin()
      })
    }
  
    if (passwordInput) {
      passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          handleLogin()
        }
      })
    }
  
    // Initialize WebSocket manager if available
    let WebSocketManager // Declare WebSocketManager
    if (typeof window.wsManager === "undefined" && typeof WebSocketManager !== "undefined") {
      window.wsManager = new WebSocketManager()
    }
  
    // Check authentication status on page load
    checkAuthStatus()
  })
  