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
      if (window.wsManager && !window.wsManager.isConnected) {
        window.wsManager.connect(token)
  
        // Set up WebSocket event handlers
        window.wsManager.onDisconnect((event) => {
          // If disconnected with an auth error code, redirect to login
          if (event.code === 1008) {
            localStorage.removeItem("whatsapp_helper_token")
            localStorage.removeItem("whatsapp_helper_agent_id")
            localStorage.removeItem("whatsapp_helper_agent_name")
            localStorage.removeItem("whatsapp_helper_auth")
            window.location.href = "login.html"
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
    const startBtn = document.getElementById("start-btn")
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
  
        const apiResponse = await fetch("https://n8n.srv768692.hstgr.cloud/webhook-test/trigger", {
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
        if (statusText) statusText.textContent = "Extracting chat data..."
        if (startBtn) startBtn.disabled = true
  
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
  
        if (statusText) statusText.textContent = "Chat data extracted successfully!"
  
        const unreadChats = chatData.filter((chat) => Number.parseInt(chat.unread_count) > 0)
        if (unreadChats.length > 0) {
          if (statusText) statusText.textContent = "Processing unread chats..."
  
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
  
          if (statusText) statusText.textContent = "Waiting for operator action..."
        }
      } catch (error) {
        console.error("Extraction error:", error)
        if (statusText) statusText.textContent = error.message || "Error extracting chat data"
        if (responseBox) responseBox.textContent = ""
        if (loadingSpinnerMain) loadingSpinnerMain.classList.add("hidden")
      } finally {
        if (startBtn) startBtn.disabled = false
      }
    }
  
    // Carousel Functions
    window.initCarousel = () => {
      window.currentSlide = 0
      window.updateCarousel()
  
      if (prevSlideBtn) {
        prevSlideBtn.addEventListener("click", () => {
          if (window.currentSlide > 0) {
            window.currentSlide--
            window.updateCarousel()
  
            // Save state after slide change
            if (window.stateManager) {
              window.stateManager.saveState()
            }
          }
        })
      }
  
      if (nextSlideBtn) {
        nextSlideBtn.addEventListener("click", () => {
          if (window.currentSlide < 2) {
            window.currentSlide++
            window.updateCarousel()
  
            // Save state after slide change
            if (window.stateManager) {
              window.stateManager.saveState()
            }
          }
        })
      }
  
      if (carouselIndicators) {
        carouselIndicators.forEach((indicator) => {
          indicator.addEventListener("click", () => {
            const index = Number.parseInt(indicator.getAttribute("data-index"))
            if (!isNaN(index) && index >= 0 && index <= 2) {
              window.currentSlide = index
              window.updateCarousel()
  
              // Save state after slide change
              if (window.stateManager) {
                window.stateManager.saveState()
              }
            }
          })
        })
      }
    }
  
    window.updateCarousel = () => {
      if (carouselTrack) carouselTrack.style.transform = `translateX(-${window.currentSlide * 100}%)`
      if (prevSlideBtn) prevSlideBtn.disabled = window.currentSlide === 0
      if (nextSlideBtn) nextSlideBtn.disabled = window.currentSlide === 2
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
  
    function renderAIResponse(aiResult) {
      if (aiResponseContainer) {
        // Hide chat history container
        window.toggleChatHistory(false)
  
        // Show AI response container
        aiResponseContainer.classList.remove("hidden")
  
        if (customerResponse) customerResponse.textContent = aiResult.customer_response || "No response provided"
        if (operatorResponse) operatorResponse.textContent = aiResult.operator_response || "No response provided"
        if (customerQuestionUkrainian)
          customerQuestionUkrainian.textContent = aiResult.customer_question_ukranian || "No response provided"
        window.initCarousel()
  
        // Save state after rendering AI response
        if (window.stateManager) {
          window.stateManager.saveState()
        }
      }
    }
  
    function renderChatAIResponse(aiResult) {
      if (aiResponseContainer2) {
        aiResponseContainer2.classList.remove("hidden")
  
        // Save state after rendering chat AI response
        if (window.stateManager) {
          window.stateManager.saveState()
        }
      }
    }
  
    // Chat Functions
    window.addChatMessage = (message, isUser = false, title = "") => {
      if (!chatHistory) return
      const messageDiv = document.createElement("div")
      messageDiv.classList.add("chat-message", isUser ? "user" : "ai")
      if (!isUser && title) {
        const titleElement = document.createElement("h4")
        titleElement.classList.add("message-title")
        titleElement.textContent = title
        messageDiv.appendChild(titleElement)
      }
      const messageContent = document.createElement("p")
      messageContent.textContent = message
      messageDiv.appendChild(messageContent)
      chatHistory.appendChild(messageDiv)
      chatHistory.scrollTop = chatHistory.scrollHeight
  
      // Save state after adding chat message
      if (window.stateManager) {
        window.stateManager.saveState()
      }
    }
  
    async function handleChatSend() {
      if (!chatInput || !sendBtn) return
      const message = chatInput.value.trim()
      if (!message) return
  
      window.addChatMessage(message, true)
      chatInput.value = ""
  
      // Set loading spinner text for initial generation
      updateLoadingSpinnerText(loadingSpinner, false)
      if (loadingSpinner) loadingSpinner.classList.remove("hidden")
  
      try {
        const chatData = { message }
        window.currentChatMessage = chatData
        const aiResult = await sendToAIAgent(chatData, agentPersona)
        window.lastChatAIResult = aiResult
  
        if (loadingSpinner) loadingSpinner.classList.add("hidden")
  
        window.addChatMessage(
          aiResult.customer_question_ukranian || "No response from AI",
          false,
          "Customer Question Ukrainian",
        )
        window.addChatMessage(aiResult.customer_response || "No response from AI", false, "Customer Response")
        window.addChatMessage(aiResult.operator_response || "No response from AI", false, "Operator Response")
        renderChatAIResponse(aiResult)
      } catch (error) {
        if (loadingSpinner) loadingSpinner.classList.add("hidden")
        window.addChatMessage("Error: Could not get response from AI", false)
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
  
    // Event Listeners
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
  })
  