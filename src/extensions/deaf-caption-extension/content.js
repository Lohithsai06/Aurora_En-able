// Create sidebar for all captions
const sidebar = document.createElement("div");
sidebar.style.position = "fixed";
sidebar.style.top = "5%";
sidebar.style.right = "0";
sidebar.style.width = "450px";
sidebar.style.maxHeight = "80vh";
sidebar.style.overflowY = "auto";
sidebar.style.background = "linear-gradient(135deg, #1a1a1a, #2d2d2d)";
sidebar.style.color = "#fff";
sidebar.style.fontSize = "16px";
sidebar.style.padding = "20px";
sidebar.style.borderRadius = "15px 0 0 15px";
sidebar.style.zIndex = "2147483647";
sidebar.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
sidebar.style.fontFamily = "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
document.body.appendChild(sidebar);

let allCaptions = [];
let fullTranscript = "";
let latestCaption = "";
let isRecording = false;
let isCaptureActive = false;
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let resizeStartX = 0;
let resizeStartWidth = 0;
let soundNotifierDiv = null;
let sidebarVisible = true;

// Create global sound notifier IMMEDIATELY
createGlobalSoundNotifier();

function createGlobalSoundNotifier() {
  if (soundNotifierDiv) return;
  
  soundNotifierDiv = document.createElement("div");
  soundNotifierDiv.style.position = "fixed";
  soundNotifierDiv.style.top = "50%";
  soundNotifierDiv.style.left = "50%";
  soundNotifierDiv.style.transform = "translate(-50%, -50%)";
  soundNotifierDiv.style.background = "linear-gradient(135deg, #ff5722, #ff9800)";
  soundNotifierDiv.style.color = "white";
  soundNotifierDiv.style.padding = "30px 50px";
  soundNotifierDiv.style.borderRadius = "20px";
  soundNotifierDiv.style.zIndex = "2147483647";
  soundNotifierDiv.style.fontWeight = "bold";
  soundNotifierDiv.style.fontSize = "24px";
  soundNotifierDiv.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5)";
  soundNotifierDiv.style.display = "none";
  soundNotifierDiv.style.textAlign = "center";
  soundNotifierDiv.style.minWidth = "400px";
  soundNotifierDiv.style.border = "5px solid white";
  soundNotifierDiv.innerHTML = `
    <div style="font-size: 60px; margin-bottom: 15px; animation: shake 0.5s infinite;">🔔</div>
    <div style="font-size: 28px; margin-bottom: 10px; font-weight: 800;">SOUND ALERT!</div>
    <div id="sound-alert-text" style="font-size: 18px; margin-top: 15px;">Sound detected in another tab</div>
  `;
  document.body.appendChild(soundNotifierDiv);
  
  // Add CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-15deg); }
      75% { transform: rotate(15deg); }
    }
    @keyframes flashBorder {
      0%, 100% { border-color: white; }
      50% { border-color: yellow; }
    }
  `;
  document.head.appendChild(style);
}

function showSoundNotification(tabTitle) {
  console.log("Showing sound notification for:", tabTitle);
  
  if (!soundNotifierDiv) {
    console.log("Creating sound notifier div...");
    createGlobalSoundNotifier();
  }
  
  const alertText = document.getElementById("sound-alert-text");
  if (alertText) {
    alertText.textContent = `Sound detected from: \"${tabTitle}\"`;
  }
  
  console.log("Displaying notification...");
  soundNotifierDiv.style.display = "block";
  soundNotifierDiv.style.animation = "flashBorder 0.5s infinite";
  
  // Play visual flash effect
  let flashCount = 0;
  const flashInterval = setInterval(() => {
    soundNotifierDiv.style.background = flashCount % 2 === 0 
      ? "linear-gradient(135deg, #ff5722, #ff9800)" 
      : "linear-gradient(135deg, #ffeb3b, #ffc107)";
    flashCount++;
    if (flashCount > 10) {
      clearInterval(flashInterval);
      soundNotifierDiv.style.background = "linear-gradient(135deg, #ff5722, #ff9800)";
    }
  }, 200);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    soundNotifierDiv.style.display = "none";
  }, 5000);
}

function updateSidebar() {
  sidebar.innerHTML = "";
  
  // Header (draggable) with controls
  const header = document.createElement("div");
  header.style.fontWeight = "600";
  header.style.marginBottom = "1em";
  header.style.fontSize = "18px";
  header.style.borderBottom = "2px solid #444";
  header.style.paddingBottom = "10px";
  header.style.cursor = "move";
  header.style.userSelect = "none";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  
  const title = document.createElement("span");
  title.textContent = "🎙️ Live Captions";
  header.appendChild(title);
  
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.background = "transparent";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#fff";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.padding = "0 8px";
  closeBtn.style.lineHeight = "1";
  closeBtn.title = "Close sidebar";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    sidebar.style.display = "none";
    sidebarVisible = false;
  };
  header.appendChild(closeBtn);
  
  sidebar.appendChild(header);
  
  // Control buttons
  const controlDiv = document.createElement("div");
  controlDiv.style.marginBottom = "15px";
  controlDiv.style.display = "flex";
  controlDiv.style.gap = "10px";
  
  const recordBtn = document.createElement("button");
  recordBtn.textContent = "RECORD";
  recordBtn.style.flex = "1";
  recordBtn.style.padding = "10px";
  recordBtn.style.background = isCaptureActive ? "#888" : "#4CAF50";
  recordBtn.style.color = "white";
  recordBtn.style.border = "none";
  recordBtn.style.borderRadius = "5px";
  recordBtn.style.cursor = isCaptureActive ? "not-allowed" : "pointer";
  recordBtn.style.fontWeight = "bold";
  recordBtn.disabled = isCaptureActive;
  recordBtn.onclick = () => {
    if (!isCaptureActive) {
      chrome.runtime.sendMessage({ cmd: "START_STT" });
      isCaptureActive = true;
      updateSidebar();
    }
  };
  
  const stopBtn = document.createElement("button");
  stopBtn.textContent = "STOP";
  stopBtn.style.flex = "1";
  stopBtn.style.padding = "10px";
  stopBtn.style.background = !isCaptureActive ? "#888" : "#f44336";
  stopBtn.style.color = "white";
  stopBtn.style.border = "none";
  stopBtn.style.borderRadius = "5px";
  stopBtn.style.cursor = !isCaptureActive ? "not-allowed" : "pointer";
  stopBtn.style.fontWeight = "bold";
  stopBtn.disabled = !isCaptureActive;
  stopBtn.onclick = () => {
    if (isCaptureActive) {
      chrome.runtime.sendMessage({ cmd: "STOP_STT" });
      isCaptureActive = false;
      updateSidebar();
    }
  };
  
  controlDiv.appendChild(recordBtn);
  controlDiv.appendChild(stopBtn);
  sidebar.appendChild(controlDiv);
  
  // Latest caption display
  const latestDiv = document.createElement("div");
  latestDiv.style.fontWeight = "600";
  latestDiv.style.fontSize = "18px";
  latestDiv.style.padding = "15px";
  latestDiv.style.background = "rgba(76, 175, 80, 0.2)";
  latestDiv.style.borderRadius = "10px";
  latestDiv.style.marginBottom = "15px";
  latestDiv.style.border = "2px solid #4CAF50";
  latestDiv.textContent = latestCaption || "Waiting for audio...";
  sidebar.appendChild(latestDiv);
  
  // Full transcript header with buttons
  const transcriptHeader = document.createElement("div");
  transcriptHeader.style.fontWeight = "600";
  transcriptHeader.style.marginBottom = "10px";
  transcriptHeader.style.fontSize = "16px";
  transcriptHeader.style.borderBottom = "2px solid #444";
  transcriptHeader.style.paddingBottom = "10px";
  transcriptHeader.style.display = "flex";
  transcriptHeader.style.justifyContent = "space-between";
  transcriptHeader.style.alignItems = "center";
  
  const transcriptTitle = document.createElement("span");
  transcriptTitle.textContent = "Full Transcript";
  transcriptHeader.appendChild(transcriptTitle);
  
  const transcriptBtnGroup = document.createElement("div");
  transcriptBtnGroup.style.display = "flex";
  transcriptBtnGroup.style.gap = "5px";
  
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "🗑️";
  clearBtn.title = "Clear transcript";
  clearBtn.style.background = "#ff9800";
  clearBtn.style.color = "white";
  clearBtn.style.border = "none";
  clearBtn.style.borderRadius = "5px";
  clearBtn.style.padding = "5px 10px";
  clearBtn.style.cursor = "pointer";
  clearBtn.style.fontSize = "14px";
  clearBtn.onclick = () => {
    if (confirm("Clear all captions?")) {
      fullTranscript = "";
      allCaptions = [];
      latestCaption = "";
      updateSidebar();
    }
  };
  
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "💾";
  exportBtn.title = "Export transcript";
  exportBtn.style.background = "#2196F3";
  exportBtn.style.color = "white";
  exportBtn.style.border = "none";
  exportBtn.style.borderRadius = "5px";
  exportBtn.style.padding = "5px 10px";
  exportBtn.style.cursor = "pointer";
  exportBtn.style.fontSize = "14px";
  exportBtn.onclick = () => {
    exportTranscript();
  };
  
  transcriptBtnGroup.appendChild(clearBtn);
  transcriptBtnGroup.appendChild(exportBtn);
  transcriptHeader.appendChild(transcriptBtnGroup);
  
  sidebar.appendChild(transcriptHeader);
  
  // Full transcript
  const transcriptDiv = document.createElement("div");
  transcriptDiv.textContent = fullTranscript || "No captions yet...";
  transcriptDiv.style.lineHeight = "1.6";
  transcriptDiv.style.padding = "10px";
  transcriptDiv.style.background = "rgba(0,0,0,0.3)";
  transcriptDiv.style.borderRadius = "10px";
  transcriptDiv.style.whiteSpace = "pre-wrap";
  transcriptDiv.style.wordWrap = "break-word";
  transcriptDiv.style.maxHeight = "200px";
  transcriptDiv.style.overflowY = "auto";
  transcriptDiv.style.marginBottom = "15px";
  sidebar.appendChild(transcriptDiv);
  
  // Summary section
  const summaryHeader = document.createElement("div");
  summaryHeader.style.fontWeight = "600";
  summaryHeader.style.marginBottom = "10px";
  summaryHeader.style.fontSize = "16px";
  summaryHeader.style.borderBottom = "2px solid #444";
  summaryHeader.style.paddingBottom = "10px";
  summaryHeader.textContent = "Video Summary";
  sidebar.appendChild(summaryHeader);
  
  const summarizeBtn = document.createElement("button");
  summarizeBtn.textContent = isRecording ? "⏸️ Stop & Summarize" : "📝 Start Summary Recording";
  summarizeBtn.style.width = "100%";
  summarizeBtn.style.padding = "12px";
  summarizeBtn.style.background = isRecording ? "#f44336" : "#2196F3";
  summarizeBtn.style.color = "#fff";
  summarizeBtn.style.border = "none";
  summarizeBtn.style.borderRadius = "8px";
  summarizeBtn.style.cursor = "pointer";
  summarizeBtn.style.fontSize = "14px";
  summarizeBtn.style.fontWeight = "600";
  summarizeBtn.style.marginBottom = "10px";
  summarizeBtn.onclick = () => {
    if (isRecording) {
      chrome.runtime.sendMessage({ cmd: "GENERATE_SUMMARY" });
      showNotification("📊 Processing", "Generating summary...");
    } else {
      isRecording = true;
      showNotification("▶️ Started", "Recording for summary...");
      updateSidebar();
    }
  };
  sidebar.appendChild(summarizeBtn);
  
  const summaryDiv = document.createElement("div");
  summaryDiv.id = "summary-output";
  summaryDiv.style.lineHeight = "1.6";
  summaryDiv.style.padding = "10px";
  summaryDiv.style.background = "rgba(33, 150, 243, 0.1)";
  summaryDiv.style.borderRadius = "10px";
  summaryDiv.style.whiteSpace = "pre-wrap";
  summaryDiv.style.wordWrap = "break-word";
  summaryDiv.style.minHeight = "80px";
  summaryDiv.textContent = "Click 'Start Summary Recording' to begin.";
  sidebar.appendChild(summaryDiv);
  
  // Resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.style.position = "absolute";
  resizeHandle.style.left = "0";
  resizeHandle.style.top = "0";
  resizeHandle.style.bottom = "0";
  resizeHandle.style.width = "5px";
  resizeHandle.style.cursor = "ew-resize";
  resizeHandle.style.background = "rgba(255,255,255,0.1)";
  resizeHandle.style.zIndex = "10";
  resizeHandle.title = "Drag to resize";
  
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = sidebar.offsetWidth;
    e.preventDefault();
    e.stopPropagation();
  });
  
  sidebar.appendChild(resizeHandle);
  
  // Setup dragging
  setupDragging(header);
}

function setupDragging(dragHandle) {
  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX - sidebar.offsetLeft;
    dragStartY = e.clientY - sidebar.offsetTop;
    e.preventDefault();
  });
  
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const newLeft = e.clientX - dragStartX;
      const newTop = e.clientY - dragStartY;
      sidebar.style.left = Math.max(0, Math.min(window.innerWidth - sidebar.offsetWidth, newLeft)) + "px";
      sidebar.style.top = Math.max(0, Math.min(window.innerHeight - sidebar.offsetHeight, newTop)) + "px";
      sidebar.style.right = "auto";
    }
    
    if (isResizing) {
      const deltaX = resizeStartX - e.clientX;
      const newWidth = Math.max(300, Math.min(800, resizeStartWidth + deltaX));
      sidebar.style.width = newWidth + "px";
    }
  });
  
  document.addEventListener("mouseup", () => {
    isDragging = false;
    isResizing = false;
  });
}

function exportTranscript() {
  if (!fullTranscript || fullTranscript.trim().length === 0) {
    showNotification("⚠️ No Content", "No transcript to export");
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const filename = `transcript-${timestamp}.txt`;
  
  const blob = new Blob([fullTranscript], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  showNotification("✅ Exported", `Saved as ${filename}`);
}

function showNotification(title, message) {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.background = "#323232";
  notification.style.color = "#fff";
  notification.style.padding = "15px 20px";
  notification.style.borderRadius = "8px";
  notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
  notification.style.zIndex = "2147483648";
  notification.style.maxWidth = "300px";
  notification.innerHTML = `<div style="font-weight:600; margin-bottom:5px;">${title}</div><div style="font-size:14px;">${message}</div>`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = "opacity 0.3s";
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateSummary(summary) {
  const summaryDiv = document.getElementById("summary-output");
  if (summaryDiv) {
    summaryDiv.textContent = summary;
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CAPTURE_STARTED") {
    isCaptureActive = true;
    updateSidebar();
  }
  
  if (msg.type === "CAPTURE_STOPPED") {
    isCaptureActive = false;
    updateSidebar();
  }
  
  if (msg.type === "TRANSCRIPT") {
    // Filter out status messages and errors, only show actual captions
    const isStatusMessage = msg.text.includes("Buffered:") || 
                           msg.text.includes("Transcribing") || 
                           msg.text.includes("Volume:") ||
                           msg.text.includes("Listening for audio") ||
                           msg.text.includes("Transcription error") ||
                           msg.text.includes("Error") ||
                           msg.text.includes("Audio capture stopped") ||
                           msg.text.includes("⚠️") ||
                           msg.text.includes("❌");
    
    if (!isStatusMessage && msg.text.trim().length > 0) {
      latestCaption = msg.text;
      allCaptions.push(msg.text);
      
      // Add to full transcript with proper spacing
      if (fullTranscript.length > 0) {
        fullTranscript += " " + msg.text;
      } else {
        fullTranscript = msg.text;
      }
      
      updateSidebar();
    }
  }
  
  if (msg.type === "SUMMARY") {
    updateSummary(msg.text);
    showNotification("Summary Ready", "Video summary has been generated!");
    isRecording = false;
    updateSidebar();
  }
  
  if (msg.type === "SUMMARY_PROGRESS") {
    showNotification("Processing", msg.text);
  }
  
  if (msg.type === "SOUND_NOTIFICATION") {
    console.log("Sound notification received:", msg.tabTitle);
    showSoundNotification(msg.tabTitle);
  }
  
  if (msg.type === "SETUP_SOUND_MONITOR") {
    createGlobalSoundNotifier();
    // Monitor audio elements on page
    const audioElements = document.querySelectorAll("audio, video");
    audioElements.forEach((elem) => {
      elem.addEventListener("play", () => {
        chrome.runtime.sendMessage({
          type: "SOUND_DETECTED",
          tabTitle: document.title
        });
      });
    });
  }
  
  if (msg.type === "SOUND_NOTIFICATION") {
    showSoundNotification(msg.tabTitle);
  }
});

// Initialize sidebar
updateSidebar();
