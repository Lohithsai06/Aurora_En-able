const statusBox = document.getElementById("status-box");
const statusText = document.getElementById("status-text");
const recordBtn = document.getElementById("record");
const stopBtn = document.getElementById("stop");

let isRecording = false;

function updateStatus(message, isActive = false) {
  statusText.textContent = message;
  if (isActive) {
    statusBox.classList.add("recording");
    statusBox.style.borderColor = "#4CAF50";
    statusBox.style.background = "#e8f5e9";
  } else {
    statusBox.classList.remove("recording");
    statusBox.style.borderColor = "#ddd";
    statusBox.style.background = "white";
  }
}

recordBtn.onclick = () => {
  chrome.runtime.sendMessage({ cmd: "START_STT" });
  isRecording = true;
  updateStatus("🔴 Recording... Capturing audio from current tab", true);
  recordBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  chrome.runtime.sendMessage({ cmd: "STOP_STT" });
  isRecording = false;
  updateStatus("⏹️ Stopped. Click RECORD to start again.", false);
  recordBtn.disabled = false;
  stopBtn.disabled = true;
};

document.getElementById("reload").onclick = () => {
  chrome.runtime.reload();
};

// Listen for real-time status updates from background/offscreen
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "POPUP_STATUS") {
    if (isRecording) {
      updateStatus(msg.text, true);
    }
  }
});

// Initialize button states
stopBtn.disabled = true;
