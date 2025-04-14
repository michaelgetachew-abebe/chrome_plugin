document.addEventListener("DOMContentLoaded", () => {
    // Backend API URLs
    const API_BASE_URL = "https//api.srv768692.hstgr.cloud"
    const LOGOUT_URL = `${API_BASE_URL}/logout`
  
    // Declare chrome variable
    if (typeof chrome === "undefined") chrome = {}
  
    // Declare WebSocketManager variable
    if (typeof WebSocketManager === "undefined") {
      class WebSocketManager {
        constructor() {
          this.ws = null
          this.isConnected = false
          this.onDisconnectCallback = null
        }
  
        connect(token) {
          const WS_URL = `wss://api.srv768692.hstgr.cloud/ws?token=${token}`
          this.ws = new WebSocket(WS_URL)
  
          this.ws.onopen = () => {
            console.log("WebSocket connected")
            this.isConnected = true
          }
  
          this.ws.onclose = (event) => {
            console.log("WebSocket disconnected", event)
            this.isConnected = false
            if (this.onDisconnectCallback) {
              this.onDisconnectCallback(event)
            }
          }
  
          this.ws.onerror = (error) => {
            console.error("WebSocket error:", error)
          }
        }
  
        disconnect() {
          if (this.ws) {
            this.ws.close()
            this.isConnected = false
          }
        }
  
        onDisconnect(callback) {
          this.onDisconnectCallback = callback
        }
      }
    }
  
    // Check authentication
    function checkAuth() {
      const token = localStorage.getItem("whatsapp_helper_token")
      const isAuthenticated = localStorage.getItem("whatsapp_helper_auth")
  
      if (!token || isAuthenticated !== "true") {
        window.location.href = "login.html"
        return false
      }
  
      // Ensure WebSocket connection is established
      if (window.wsManager) {
        // Only reconnect if not already connected
        if (!window.wsManager.isConnected) {
          console.log("Reconnecting WebSocket with saved token")
          window.wsManager.connect(token)
        }
  
        // Set up WebSocket event handlers
        window.wsManager.onDisconnect((event) => {
          // Only redirect to login if it's an authentication error
          if (event.code === 1008) {
            console.log("Authentication error in WebSocket, redirecting to login")
            localStorage.removeItem("whatsapp_helper_token")
            localStorage.removeItem("whatsapp_helper_agent_id")
            localStorage.removeItem("whatsapp_helper_agent_name")
            localStorage.removeItem("whatsapp_helper_auth")
            window.location.href = "login.html"
          } else {
            // For other disconnection reasons, attempt to reconnect
            console.log("WebSocket disconnected for non-auth reason, attempting reconnect")
            setTimeout(() => {
              if (localStorage.getItem("whatsapp_helper_token")) {
                window.wsManager.connect(localStorage.getItem("whatsapp_helper_token"))
              }
            }, 2000)
          }
        })
      }
  
      return true
    }
  
    // If not authenticated, redirect to login page
    if (!checkAuth()) return
  
    // Get agent info
    const agentId = localStorage.getItem("whatsapp_helper_agent_id") || "Unknown"
    const agentName = localStorage.getItem("whatsapp_helper_agent_name") || "Unknown Agent"
    const agentPersona = localStorage.getItem("whatsapp_helper_agent_persona") || "Unknown Persona"
  
    // Common elements (present on both pages)
    const autoreplyTab = document.getElementById("autoreply-tab")
    const chatTab = document.getElementById("chat-tab")
    const themeToggle = document.getElementById("theme-toggle")
    const sunIcon = themeToggle?.querySelector(".sun")
    const moonIcon = themeToggle?.querySelector(".moon")
    const logoutBtn = document.getElementById("logout-btn")
    const agentIdDisplay = document.getElementById("agent-id-display")
  
    // AutoReply elements (only in index.html)
    const autoreplyPage = document.getElementById("autoreply-page")
    const autoTrackingBtn = document.getElementById("auto-tracking-btn")
    const manualTrackingBtn = document.getElementById("manual-tracking-btn")
    const statusText = document.getElementById("status")
    const responseBox = document.getElementById("response")
    const chatHistoryLabel = document.getElementById("chat-history-label")
    const aiResponseContainer = document.getElementById("ai-response-container")
    const customerResponse = document.getElementById("customer-response")
    const operatorResponse = document.getElementById("operator-response")
    const customerQuestionUkrainian = document.getElementById("customer-question-ukrainian")
    const acceptBtn = document.getElementById("accept-btn")
    const rejectBtn = document.getElementById("reject-btn")
    const loadingSpinnerMain = document.getElementById("loading-spinner-main") // Add this line
    const startBtn = document.getElementById("start-btn")
  
    // Chat elements (only in chat.html)
    const chatPage = document.getElementById("chat-page")
    const chatInput = document.getElementById("chat-input")
    const sendBtn = document.getElementById("send-btn")
    const chatHistory = document.getElementById("chat-history")
    const aiResponseContainer2 = document.getElementById("ai-response-container2")
    const acceptBtn2 = document.getElementById("accept-btn2")
    const rejectBtn2 = document.getElementById("reject-btn2")
    const loadingSpinner = document.getElementById("loading-spinner")
  
    // Carousel elements
    const carouselTrack = document.getElementById("carousel-track")
    const prevSlideBtn = document.getElementById("prev-slide")
    const nextSlideBtn = document.getElementById("next-slide")
    const carouselTitle = document.getElementById("carousel-title")
    const carouselIndicators = document.querySelectorAll(".carousel-indicator")
  
    // Display agent ID if element exists
    if (agentIdDisplay) {
      agentIdDisplay.textContent = agentName
    }
  
    // Global variables for state management
    window.currentChat = null
    window.lastAIResult = null
    window.currentChatMessage = null
    window.lastChatAIResult = null
    window.isDarkMode = false
    window.currentSlide = 0
    window.chatHistories = {} // Store chat histories by contact name
    window.isProcessingAutoTrack = false
  
    // Auto tracking state
    window.isAutoTracking = false
    window.isManualTracking = false
    window.autoTrackingInterval = null
    window.autoTrackingDelay = 120000 // 2 minutes between checks
  
    // Handle logout
    async function handleLogout() {
      try {
        const token = localStorage.getItem("whatsapp_helper_token")
  
        // Close WebSocket connection
        if (window.wsManager) {
          window.wsManager.disconnect()
        }
  
        // Call logout API
        const response = await fetch(LOGOUT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ agent_id: agentId }),
        })
  
        // Clear local storage regardless of API response
        localStorage.removeItem("whatsapp_helper_token")
        localStorage.removeItem("whatsapp_helper_agent_id")
        localStorage.removeItem("whatsapp_helper_agent_name")
        localStorage.removeItem("whatsapp_helper_auth")
  
        // Clear state
        if (window.stateManager) {
          chrome.storage.local.remove("whatsapp_helper_state")
        }
  
        // Redirect to login page
        window.location.href = "login.html"
      } catch (error) {
        console.error("Logout error:", error)
  
        // Still clear local storage and redirect on error
        localStorage.removeItem("whatsapp_helper_token")
        localStorage.removeItem("whatsapp_helper_agent_id")
        localStorage.removeItem("whatsapp_helper_agent_name")
        localStorage.removeItem("whatsapp_helper_auth")
        window.location.href = "login.html"
      }
    }
  
    // Theme Toggle
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark")
        window.isDarkMode = document.body.classList.contains("dark")
        if (sunIcon && moonIcon) {
          sunIcon.classList.toggle("hidden")
          moonIcon.classList.toggle("hidden")
        }
        localStorage.setItem("darkMode", window.isDarkMode ? "true" : "false")
  
        // Save state after theme change
        if (window.stateManager) {
          window.stateManager.saveState()
        }
      })
  
      const savedTheme = localStorage.getItem("darkMode")
      if (savedTheme === "true") {
        document.body.classList.add("dark")
        if (sunIcon && moonIcon) {
          sunIcon.classList.add("hidden")
          moonIcon.classList.remove("hidden")
        }
        window.isDarkMode = true
      }
    }
  
    // Logout button event listener
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout)
    }
  
    // Navigation
    function showPage(page) {
      if (autoreplyPage) autoreplyPage.classList.remove("active")
      if (chatPage) chatPage.classList.remove("active")
      if (autoreplyTab) autoreplyTab.classList.remove("active")
      if (chatTab) chatTab.classList.remove("active")
  
      if (page === "autoreply" && autoreplyPage) {
        autoreplyPage.classList.add("active")
        if (autoreplyTab) autoreplyTab.classList.add("active")
      } else if (page === "chat" && chatPage) {
        chatPage.classList.add("active")
        if (chatTab) chatTab.classList.add("active")
      }
    }
  
    if (autoreplyTab) {
      autoreplyTab.addEventListener("click", () => {
        // Save state before navigating
        if (window.stateManager) {
          window.stateManager.saveState()
        }
        window.location.href = "index.html"
      })
    }
  
    if (chatTab) {
      chatTab.addEventListener("click", () => {
        // Save state before navigating
        if (window.stateManager) {
          window.stateManager.saveState()
        }
        window.location.href = "chat.html"
      })
    }
  
    // Utility Functions
    function formatResponseToJSON(data) {
      return JSON.stringify(data, null, 2)
    }
  
    // Helper function to update loading spinner text
    function updateLoadingSpinnerText(spinner, isRejection) {
      if (!spinner) return
  
      const spinnerText = spinner.querySelector(".text-sm")
      if (spinnerText) {
        spinnerText.textContent = isRejection ? "Re-processing Rejected response..." : "Generating AI response..."
      }
    }
  
    // Helper function to update button states
    function updateTrackingButtonStates() {
      if (!autoTrackingBtn || !manualTrackingBtn) return
  
      if (window.isAutoTracking) {
        // Auto tracking is active
        autoTrackingBtn.disabled = false
        manualTrackingBtn.disabled = true
      } else if (window.isManualTracking) {
        // Manual tracking is active
        autoTrackingBtn.disabled = true
        manualTrackingBtn.disabled = false
      } else {
        // No tracking active
        autoTrackingBtn.disabled = false
        manualTrackingBtn.disabled = false
      }
    }
  
    // Add carousel initialization and navigation functions after the updateTrackingButtonStates function
  
    // Add this function to initialize the carousel
    window.initCarousel = () => {
      window.currentSlide = 0
      updateCarousel()
  
      // Add event listeners for carousel navigation
      if (prevSlideBtn) {
        prevSlideBtn.addEventListener("click", () => {
          if (window.currentSlide > 0) {
            window.currentSlide--
            updateCarousel()
          }
        })
      }
  
      if (nextSlideBtn) {
        nextSlideBtn.addEventListener("click", () => {
          if (window.currentSlide < 2) {
            window.currentSlide++
            updateCarousel()
          }
        })
      }
  
      if (carouselIndicators) {
        carouselIndicators.forEach((indicator, index) => {
          indicator.addEventListener("click", () => {
            window.currentSlide = index
            updateCarousel()
          })
        })
      }
    }
  
    // Add this function to update carousel position and state
    function updateCarousel() {
      if (!carouselTrack) return
  
      carouselTrack.style.transform = `translateX(-${window.currentSlide * 100}%)`
  
      if (prevSlideBtn) {
        prevSlideBtn.disabled = window.currentSlide === 0
      }
  
      if (nextSlideBtn) {
        nextSlideBtn.disabled = window.currentSlide === 2
      }
  
      if (carouselTitle) {
        const titles = ["Customer Question (Ukrainian)", "Customer Response", "Operator Response"]
        carouselTitle.textContent = titles[window.currentSlide]
      }
  
      if (carouselIndicators) {
        carouselIndicators.forEach((indicator, index) => {
          indicator.classList.toggle("active", index === window.currentSlide)
        })
      }
    }
  
    // Show/hide chat history container
    window.toggleChatHistory = (show) => {
      if (responseBox) {
        if (show) {
          responseBox.classList.remove("hidden")
          if (chatHistoryLabel) chatHistoryLabel.classList.remove("hidden")
        } else {
          responseBox.classList.add("hidden")
          if (chatHistoryLabel) chatHistoryLabel.classList.add("hidden")
        }
      }
    }
  
    // Display chat-specific history
    window.displayChatHistory = (contactName) => {
      const chatSpecificHistory = document.getElementById("chat-specific-history")
      if (!chatSpecificHistory) return
  
      chatSpecificHistory.innerHTML = ""
  
      if (window.chatHistories[contactName] && Array.isArray(window.chatHistories[contactName])) {
        const messages = window.chatHistories[contactName]
  
        messages.forEach((msg) => {
          const messageElement = document.createElement("div")
          messageElement.className = "chat-message-history"
          messageElement.innerHTML = `<strong>${msg.sender}:</strong> ${msg.message}`
          chatSpecificHistory.appendChild(messageElement)
        })
      } else {
        chatSpecificHistory.textContent = "No chat history available for this contact"
      }
  
      // Make sure chat history is visible
      window.toggleChatHistory(true)
    }
  
    async function clickChatElement(tabId, chatData) {
      try {
        console.log("Starting clickChatElement with chatData:", chatData)
        if (statusText) statusText.textContent = "Clicking chats with unread messages..."
  
        const unreadChats = chatData.filter((chat) => {
          const count = Number.parseInt(chat.unread_count)
          return !isNaN(count) && count > 0
        })
  
        console.log("Filtered unread chats:", unreadChats)
  
        if (unreadChats.length === 0) {
          console.log("No chats with unread messages found.")
          if (statusText) statusText.textContent = "No unread messages to click."
          return
        }
  
        for (const chat of unreadChats) {
          console.log(`Attempting to click chat at index ${chat.index}`)
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (index) => {
              // const chatList = document.querySelector('div[aria-label="Chat list"]')
              const chatList = document.querySelector(
                document.documentElement.lang === "en" ? 'div[aria-label="Chat list"]' : 'div[aria-label="Список чатов"]',
              )
              if (!chatList) throw new Error("Chat list not found!")
              const chatElement = chatList.childNodes[index]
              if (!chatElement) throw new Error(`Chat element at index ${index} not found!`)
              chatElement.click()
            },
            args: [chat.index],
          })
          console.log(`Clicked chat at index ${chat.index}`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
  
        if (statusText) statusText.textContent = "Finished clicking unread chats!"
      } catch (error) {
        console.error("Click error:", error)
        if (statusText) statusText.textContent = error.message || "Error clicking chat elements"
      }
    }
  
    async function sendToAIAgent(chat, persona, rejectedAnswer = false, response = "") {
      try {
        const payload = {
          contact_number: chat.contact_name || "User",
          last_chat: {
            message: chat.message,
            type: "Text",
            content: null,
          },
          recent_timestamp: "2025-03-06T08:10:00Z",
          other_details: null,
          rejection: {
            rejection_status: rejectedAnswer ? "yes" : "no",
            rejected_response: rejectedAnswer ? response : "",
          },
          agent_id: agentId, // Include agent ID in the payload
          agent_persona: persona,
        }
  
        console.log("Sending payload to AI Agent:", payload)
  
        const apiResponse = await fetch("https://n8n.srv768692.hstgr.cloud/webhook/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
  
        if (!apiResponse.ok) throw new Error(`AI Agent API Call failed with: ${apiResponse.status}`)
  
        const result = await apiResponse.json()
        console.log("AI Agent Response:", result)
        return result
      } catch (error) {
        console.error("Webhook error:", error)
        throw error
      }
    }
  
    // Extract Full Chat History
    async function extractFullChatHistory(tabId, unreadChats) {
      try {
        if (statusText) statusText.textContent = "Extracting full chat histories..."
  
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (unreadChatsSerialized) => {
            const unreadChats = JSON.parse(unreadChatsSerialized)
  
            async function simulateFullClick(element, index) {
              return new Promise((resolve) => {
                element.scrollIntoView({ behavior: "smooth", block: "center" })
                const clickable = element.querySelector('span[dir="auto"]') || element
                const rect = clickable.getBoundingClientRect()
                const x = rect.left + rect.width / 2
                const y = rect.top + rect.height / 2
  
                const events = [
                  new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
                  new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
                  new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
                ]
  
                events.forEach((event) => clickable.dispatchEvent(event))
                setTimeout(resolve, 5000) // Wait 5 seconds
              })
            }
  
            async function extractChatMessages(chatName) {
              const messagesContainer = await new Promise((resolve) => {
                let attempts = 0
                const maxAttempts = 100 // 10 seconds timeout
                const interval = setInterval(() => {
                  const container = document.querySelector("div.x3psx0u")
                  const messageDivs = container?.querySelectorAll("div[data-id]")
                  attempts++
                  if (container && messageDivs?.length > 0) {
                    clearInterval(interval)
                    console.log(
                      "Messages container found after",
                      attempts * 100,
                      "ms, with",
                      messageDivs.length,
                      "messages",
                    )
                    resolve(container)
                  } else if (attempts >= maxAttempts) {
                    clearInterval(interval)
                    const fallbackContainer = document.querySelector("#main")
                    resolve(fallbackContainer?.querySelectorAll("div[data-id]").length > 0 ? fallbackContainer : null)
                  }
                }, 100)
              })
  
              if (!messagesContainer) return []
  
              const messages = []
              const messageElements = messagesContainer.querySelectorAll("div[data-id]")
              messageElements.forEach((messageElement) => {
                const dataId = messageElement.getAttribute("data-id")
                const textElement = messageElement.querySelector("span.selectable-text.copyable-text")
                const timestampElement = messageElement.querySelector("div.copyable-text")
  
                if (dataId && textElement) {
                  const isOutgoing = dataId.startsWith("true_")
                  const sender = isOutgoing ? "You" : chatName
                  const timestamp = timestampElement?.getAttribute("data-pre-plain-text") || "Unknown time"
                  const messageText = textElement.innerText.trim()
  
                  messages.push({ sender, timestamp, message: messageText })
                }
              })
  
              return messages
            }
  
            return new Promise(async (resolve) => {
              const chatHistories = {}
              // const chatList = document.querySelector('div[aria-label="Chat list"]')
              const chatList = document.querySelector(
                document.documentElement.lang === "en" ? 'div[aria-label="Chat list"]' : 'div[aria-label="Список чатов"]',
              )
              if (!chatList) {
                resolve({ error: "Chat list not found!" })
                return
              }
  
              for (const chat of unreadChats) {
                const chatElement = chatList.childNodes[chat.index]
                if (!chatElement) {
                  chatHistories[chat.contact_name] = { error: `Chat element at index ${chat.index} not found!` }
                  continue
                }
  
                await simulateFullClick(chatElement, chat.index)
                const messages = await extractChatMessages(chat.contact_name)
                chatHistories[chat.contact_name] = messages
              }
  
              resolve(chatHistories)
            })
          },
          args: [JSON.stringify(unreadChats)],
        })
  
        const extractedChatHistories = results[0].result
        console.log("Extracted chat histories:", extractedChatHistories)
        if (statusText) statusText.textContent = "Chat histories extracted successfully!"
  
        // Store chat histories globally
        window.chatHistories = extractedChatHistories
  
        // Save state after extracting chat histories
        if (window.stateManager) {
          window.stateManager.saveState()
        }
  
        return extractedChatHistories
      } catch (error) {
        console.error("Chat history extraction error:", error)
        if (statusText) statusText.textContent = "Error extracting chat histories"
        return { error: error.message }
      }
    }
  
    // Updated extractChatData with Chat History Display
    async function extractChatData() {
      try {
        // Set processing flag for auto tracking
        if (window.isAutoTracking) {
          window.isProcessingAutoTrack = true
        }
  
        // Set tracking state
        if (!window.isAutoTracking) {
          window.isManualTracking = true
        }
  
        // Update button states
        updateTrackingButtonStates()
  
        if (statusText) {
          if (window.isAutoTracking) {
            statusText.textContent = "Auto tracking: Extracting chat data..."
          } else {
            statusText.textContent = "Manual tracking: Extracting chat data..."
          }
        }
  
        // Hide AI response container if it's visible
        if (aiResponseContainer) aiResponseContainer.classList.add("hidden")
  
        // Show chat history container
        window.toggleChatHistory(true)
  
        const [tab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs))
        })
        console.log("Active tab:", tab)
        const url = tab.url
        if (url.startsWith("chrome://") || url.startsWith("file://")) {
          throw new Error("Chat extraction is not supported on this page (restricted URL)")
        }
  
        const results = await new Promise((resolve) => {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: () => {
                // const chatList = document.querySelector('div[aria-label="Chat list"]')
                const chatList = document.querySelector(
                  document.documentElement.lang === "en"
                    ? 'div[aria-label="Chat list"]'
                    : 'div[aria-label="Список чатов"]',
                )
                if (!chatList) return "Chat list not found!"
  
                const chatData = []
                chatList.childNodes.forEach((child, index) => {
                  const chatText = child.innerText.trim()
                  const chatParts = chatText.split("\n")
                  const contact_name = chatParts[0] || "Unknown"
                  const recent_timestamp = chatParts[1] || ""
                  const message = chatParts[2] || ""
                  const other_details = chatParts.slice(3).join(" ") || ""
                  // const unreadBadge = child.querySelector('span[aria-label*="unread"]')
                  const unreadBadge = child.querySelector(
                    document.documentElement.lang === "en"
                      ? 'span[aria-label*="unread"]'
                      : 'span[aria-label*="непрочитанное"]',
                  )
  
                  let unread_count = "0"
                  if (unreadBadge) {
                    const label = unreadBadge.getAttribute("aria-label")
                    const match = label.match(/^\d+/)
                    unread_count = match ? match[0] : unreadBadge.innerText.trim()
                  }
  
                  chatData.push({
                    index,
                    contact_name,
                    recent_timestamp,
                    message,
                    other_details,
                    unread_count,
                  })
                })
                return chatData
              },
            },
            (results) => resolve(results),
          )
        })
  
        const chatData = results[0].result
        console.log("Extracted chat data:", chatData)
  
        if (typeof chatData === "string") throw new Error(chatData)
  
        if (statusText) {
          if (window.isAutoTracking) {
            statusText.textContent = "Auto tracking: Chat data extracted successfully!"
          } else {
            statusText.textContent = "Chat data extracted successfully!"
          }
        }
  
        const unreadChats = chatData.filter((chat) => Number.parseInt(chat.unread_count) > 0)
        if (unreadChats.length > 0) {
          if (statusText) {
            if (window.isAutoTracking) {
              statusText.textContent = "Auto tracking: Processing unread chats..."
            } else {
              statusText.textContent = "Processing unread chats..."
            }
          }
  
          // Click chats and extract full histories first
          await clickChatElement(tab.id, chatData)
          await extractFullChatHistory(tab.id, unreadChats)
  
          // Process only the first unread chat for AI response
          for (const chat of unreadChats) {
            window.currentChat = chat
  
            // Display chat-specific history for this contact
            window.displayChatHistory(chat.contact_name)
  
            // Set loading spinner text for initial generation
            updateLoadingSpinnerText(loadingSpinnerMain, false)
            if (loadingSpinnerMain) loadingSpinnerMain.classList.remove("hidden")
  
            const aiResult = await sendToAIAgent(chat, agentPersona)
  
            if (loadingSpinnerMain) loadingSpinnerMain.classList.add("hidden")
  
            window.lastAIResult = aiResult
            renderAIResponse(aiResult)
            console.log(`Sent chat with ${chat.unread_count} unread messages to webhook`)
  
            // Save state after processing chat
            if (window.stateManager) {
              window.stateManager.saveState()
            }
  
            break // Process only the first unread chat for AI response
          }
  
          if (statusText) {
            if (window.isAutoTracking) {
              statusText.textContent = "Auto tracking: Waiting for operator action..."
            } else {
              statusText.textContent = "Waiting for operator action..."
            }
          }
        } else {
          if (statusText) {
            if (window.isAutoTracking) {
              statusText.textContent = "Auto tracking: No unread messages found."
            } else {
              statusText.textContent = "No unread messages found."
            }
          }
        }
      } catch (error) {
        console.error("Extraction error:", error)
        if (statusText) {
          if (window.isAutoTracking) {
            statusText.textContent = `Auto tracking error: ${error.message || "Error extracting chat data"}`
          } else {
            statusText.textContent = error.message || "Error extracting chat data"
          }
        }
        if (responseBox) responseBox.textContent = ""
        if (loadingSpinnerMain) loadingSpinnerMain.classList.add("hidden")
      } finally {
        // Clear processing flag for auto tracking
        if (window.isAutoTracking) {
          window.isProcessingAutoTrack = false
        }
  
        // Only reset manual tracking state if it was manually triggered
        if (window.isManualTracking && !window.isAutoTracking) {
          window.isManualTracking = false
  
          if (manualTrackingBtn) {
            manualTrackingBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Manual
          `
            manualTrackingBtn.classList.remove("btn-danger")
          }
  
          if (autoTrackingBtn) {
            autoTrackingBtn.disabled = false
          }
  
          // Save state after completing manual tracking
          if (window.stateManager) {
            window.stateManager.saveState()
          }
        }
  
        // Update button states
        updateTrackingButtonStates()
      }
    }
  
    // Auto tracking functions
    window.startAutoTracking = () => {
      if (window.isAutoTracking) return
  
      window.isAutoTracking = true
  
      // Disable manual tracking button
      if (manualTrackingBtn) {
        manualTrackingBtn.disabled = true
      }
  
      if (autoTrackingBtn) {
        autoTrackingBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
          Stop
        `
        autoTrackingBtn.classList.add("btn-danger")
      }
  
      if (statusText) statusText.textContent = "Auto tracking started..."
  
      // Run the first check immediately
      runAutoTrackingCycle()
  
      // Set up interval for continuous checking
      // Clear any existing interval first
      if (window.autoTrackingInterval) {
        clearInterval(window.autoTrackingInterval)
      }
  
      window.autoTrackingInterval = setInterval(() => {
        // Only start a new cycle if the previous one has completed
        if (!window.isProcessingAutoTrack) {
          window.isProcessingAutoTrack = true
          runAutoTrackingCycle().finally(() => {
            window.isProcessingAutoTrack = false
          })
        } else {
          console.log("Previous auto tracking cycle still running, skipping this cycle")
        }
      }, window.autoTrackingDelay)
  
      // Save state after starting auto tracking
      if (window.stateManager) {
        window.stateManager.saveState()
      }
    }
  
    window.stopAutoTracking = () => {
      if (!window.isAutoTracking) return
  
      window.isAutoTracking = false
  
      // Enable manual tracking button
      if (manualTrackingBtn) {
        manualTrackingBtn.disabled = true
      }
  
      if (autoTrackingBtn) {
        autoTrackingBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="10 8 16 12 10 16 10 8"></polygon>
          </svg>
          Auto
        `
        autoTrackingBtn.classList.remove("btn-danger")
      }
  
      if (statusText) statusText.textContent = "Auto tracking stopped"
  
      // Clear the interval
      if (window.autoTrackingInterval) {
        clearInterval(window.autoTrackingInterval)
        window.autoTrackingInterval = null
      }
  
      // Save state after stopping auto tracking
      if (window.stateManager) {
        window.stateManager.saveState()
      }
    }
  
    async function runAutoTrackingCycle() {
      if (!window.isAutoTracking) return
  
      try {
        if (statusText) statusText.textContent = "Auto tracking: Checking for unread messages..."
  
        // Call extractChatData and wait for it to complete
        await extractChatData()
  
        // Only update status if we're still in auto tracking mode
        if (window.isAutoTracking && statusText) {
          statusText.textContent = "Auto tracking: Waiting for next check..."
        }
      } catch (error) {
        console.error("Auto tracking cycle error:", error)
        if (statusText) statusText.textContent = `Auto tracking error: ${error.message}`
      }
    }
  
    // Event Listeners for tracking buttons
    if (autoTrackingBtn) {
      autoTrackingBtn.addEventListener("click", () => {
        if (window.isAutoTracking) {
          window.stopAutoTracking()
        } else {
          window.startAutoTracking()
        }
      })
    }
  
    if (manualTrackingBtn) {
      manualTrackingBtn.addEventListener("click", () => {
        if (window.isManualTracking) {
          // Stop manual tracking
          window.isManualTracking = false
  
          if (manualTrackingBtn) {
            manualTrackingBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Manual
            `
            manualTrackingBtn.classList.remove("btn-danger")
          }
  
          if (autoTrackingBtn) {
            autoTrackingBtn.disabled = false
          }
  
          if (statusText) statusText.textContent = "Manual tracking stopped"
  
          // Save state after stopping manual tracking
          if (window.stateManager) {
            window.stateManager.saveState()
          }
        } else {
          // Start manual tracking
          window.isManualTracking = true
  
          if (manualTrackingBtn) {
            manualTrackingBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
              Stop
            `
            manualTrackingBtn.classList.add("btn-danger")
          }
  
          if (autoTrackingBtn) {
            autoTrackingBtn.disabled = true
          }
  
          // Run the extractChatData function once
          extractChatData()
        }
      })
    }
  
    if (startBtn) startBtn.addEventListener("click", extractChatData)
  
    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        if (aiResponseContainer) aiResponseContainer.classList.add("hidden")
        if (statusText) statusText.textContent = "Response accepted!"
  
        // Copy customer_response to clipboard
        if (customerResponse && customerResponse.textContent) {
          navigator.clipboard
            .writeText(customerResponse.textContent)
            .then(() => {
              console.log("Customer response copied to clipboard")
              showCopyNotification()
            })
            .catch((err) => console.error("Could not copy text: ", err))
        }
  
        // Show chat history again
        window.toggleChatHistory(true)
  
        window.currentChat = null
  
        // Save state after accepting response
        if (window.stateManager) {
          window.stateManager.saveState()
        }
      })
    }
  
    if (rejectBtn) {
      rejectBtn.addEventListener("click", async () => {
        if (!window.currentChat) return
  
        // First show "Response Rejected" message
        if (statusText) statusText.textContent = "Response Rejected"
  
        // Wait a moment to show the rejection message before showing the loading spinner
        await new Promise((resolve) => setTimeout(resolve, 500))
  
        // Then show loading spinner with "Re-processing Rejected response..." text
        if (statusText) statusText.textContent = "Re-processing Rejected response..."
  
        // Update the loading spinner text for rejection
        updateLoadingSpinnerText(loadingSpinnerMain, true)
        if (loadingSpinnerMain) loadingSpinnerMain.classList.remove("hidden")
  
        try {
          const rejectedResponse = window.lastAIResult?.customer_response || ""
          const aiResult = await sendToAIAgent(window.currentChat, agentPersona, true, rejectedResponse)
          window.lastAIResult = aiResult
  
          // Hide loading spinner
          if (loadingSpinnerMain) loadingSpinnerMain.classList.add("hidden")
  
          renderAIResponse(aiResult)
          if (statusText) statusText.textContent = "Reprocessed response rendered!"
  
          // Save state after reprocessing response
          if (window.stateManager) {
            window.stateManager.saveState()
          }
        } catch (error) {
          // Hide loading spinner on error too
          if (loadingSpinnerMain) loadingSpinnerMain.classList.add("hidden")
  
          if (statusText) statusText.textContent = "Error reprocessing response"
          console.error("Reprocessing error:", error)
        }
      })
    }
  
    if (acceptBtn2) {
      acceptBtn2.addEventListener("click", () => {
        if (aiResponseContainer2) {
          aiResponseContainer2.classList.add("hidden")
          window.addChatMessage("Response Accepted", false)
          if (window.lastChatAIResult && window.lastChatAIResult.customer_response) {
            navigator.clipboard
              .writeText(window.lastChatAIResult.customer_response)
              .then(() => {
                console.log("Customer response copied to clipboard")
                showCopyNotification()
              })
              .catch((err) => console.error("Could not copy text: ", err))
          }
        }
        window.currentChatMessage = null
  
        // Save state after accepting chat response
        if (window.stateManager) {
          window.stateManager.saveState()
        }
      })
    }
  
    if (rejectBtn2) {
      rejectBtn2.addEventListener("click", async () => {
        if (!window.currentChatMessage) return
  
        // First show "Response Rejected" message
        window.addChatMessage("Response Rejected", false)
  
        // Wait a moment to show the rejection message before showing the loading spinner
        await new Promise((resolve) => setTimeout(resolve, 500))
  
        // Update the loading spinner text for rejection
        updateLoadingSpinnerText(loadingSpinner, true)
        if (loadingSpinner) loadingSpinner.classList.remove("hidden")
  
        try {
          const rejectedResponse = window.lastChatAIResult?.customer_response || ""
          const aiResult = await sendToAIAgent(window.currentChatMessage, agentPersona, true, rejectedResponse)
          window.lastChatAIResult = aiResult
  
          // Hide loading spinner
          if (loadingSpinner) loadingSpinner.classList.add("hidden")
  
          window.addChatMessage(
            aiResult.customer_question_ukranian || "No response from AI",
            false,
            "Customer Question Ukrainian",
          )
          window.addChatMessage(aiResult.customer_response || "No response from AI", false, "Customer Response")
          window.addChatMessage(aiResult.operator_response || "No response from AI", false, "Operator Response")
          renderChatAIResponse(aiResult)
  
          // Save state after reprocessing chat response
          if (window.stateManager) {
            window.stateManager.saveState()
          }
        } catch (error) {
          // Hide loading spinner on error too
          if (loadingSpinner) loadingSpinner.classList.add("hidden")
          window.addChatMessage("Error: Could not reprocess response", false)
        }
      })
    }
  
    if (sendBtn) {
      sendBtn.addEventListener("click", handleChatSend)
      if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleChatSend()
          }
        })
      }
    }
  
    // Show clipboard copy notification
    function showCopyNotification() {
      const notification = document.createElement("div")
      notification.className = "copy-notification"
      notification.textContent = "Response copied to clipboard!"
      document.body.appendChild(notification)
  
      // Remove notification after 2 seconds
      setTimeout(() => {
        notification.classList.add("fade-out")
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 500)
      }, 2000)
    }
  
    // Initialize page
    if (window.location.href.includes("chat.html")) {
      showPage("chat")
    } else {
      showPage("autoreply")
    }
  
    // Initialize WebSocket manager if available
    if (typeof window.wsManager === "undefined" && typeof WebSocketManager !== "undefined") {
      window.wsManager = new WebSocketManager()
    }
  
    // Initialize state manager
    if (window.stateManager) {
      window.stateManager.initialize().then((state) => {
        if (state) {
          window.stateManager.applyState(state)
        }
      })
    }
  
    // Initialize button states
    updateTrackingButtonStates()
  
    // Replace the renderAIResponse function with this improved version
    function renderAIResponse(aiResult) {
      if (!aiResult) return
  
      // Hide chat history container
      window.toggleChatHistory(false)
  
      // Populate response data
      if (customerQuestionUkrainian) {
        customerQuestionUkrainian.textContent = aiResult.customer_question_ukranian || "No response from AI"
      }
      if (customerResponse) {
        customerResponse.textContent = aiResult.customer_response || "No response from AI"
      }
      if (operatorResponse) {
        operatorResponse.textContent = aiResult.operator_response || "No response from AI"
      }
  
      // Show AI response container
      if (aiResponseContainer) {
        aiResponseContainer.classList.remove("hidden")
  
        // Ensure container has proper height to avoid scrolling
        aiResponseContainer.style.height = "auto"
        aiResponseContainer.style.maxHeight = "450px"
      }
  
      // Initialize carousel with proper event listeners
      window.initCarousel()
  
      // Save state after rendering AI response
      if (window.stateManager) {
        window.stateManager.saveState()
      }
    }
  
    // Dummy renderChatAIResponse function
    function renderChatAIResponse(aiResult) {
      if (!aiResult) return
  
      if (aiResponseContainer2) {
        aiResponseContainer2.classList.remove("hidden")
      }
    }
  
    // Dummy handleChatSend function
    function handleChatSend() {
      console.log("Chat message sent!")
    }
  })
  