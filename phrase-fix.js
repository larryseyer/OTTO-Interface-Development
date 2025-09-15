// Standalone phrase tab fix - can be loaded after main script
console.log("Loading phrase tab fix...");

// Wait for DOM and main app to be ready
function initPhraseFix() {
  console.log("Initializing phrase fix...");

  const phraseTabs = document.querySelectorAll(".phrase-tab");
  const phrasePrevBtn = document.getElementById("phrase-prev-btn");
  const phraseNextBtn = document.getElementById("phrase-next-btn");

  console.log("Found elements:");
  console.log("- Phrase tabs:", phraseTabs.length);
  console.log("- Prev button:", phrasePrevBtn);
  console.log("- Next button:", phraseNextBtn);

  // Check if main app exists
  if (!window.ottoInterface) {
    console.error("Main interface not found! Waiting...");
    setTimeout(initPhraseFix, 500);
    return;
  }

  // Debug: Check what methods are available
  console.log("Available on ottoInterface:", Object.getOwnPropertyNames(Object.getPrototypeOf(window.ottoInterface)));
  console.log("switchToPhrase exists?", typeof window.ottoInterface.switchToPhrase);
  console.log("navigatePhrase exists?", typeof window.ottoInterface.navigatePhrase);

  // Check if phraseInterface exists
  if (!window.phraseInterface) {
    console.warn("phraseInterface not ready, waiting...");
    setTimeout(initPhraseFix, 500);
    return;
  }

  console.log("phraseInterface found:", window.phraseInterface);

  // Simple direct event listeners
  phraseTabs.forEach((tab, index) => {
    console.log(`Setting up tab ${index}:`, tab.dataset.phrase);

    // Remove any existing listeners
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);

    // Add new listener
    newTab.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const phrase = this.dataset.phrase;
      console.log("Phrase tab clicked (from fix):", phrase);

      // Try multiple ways to call the method
      if (window.phraseInterface && window.phraseInterface.switchToPhrase) {
        console.log("Using phraseInterface");
        window.phraseInterface.switchToPhrase(phrase);
      } else if (window.ottoInterface && typeof window.ottoInterface.switchToPhrase === 'function') {
        console.log("Using ottoInterface.switchToPhrase");
        window.ottoInterface.switchToPhrase(phrase);
      } else if (window.switchPhrase) {
        console.log("Using global switchPhrase");
        window.switchPhrase(phrase);
      } else {
        console.error("No phrase switching method available!");
        console.log("Available: phraseInterface=", window.phraseInterface, "ottoInterface=", window.ottoInterface);
      }
    });
  });

  // Fix prev button
  if (phrasePrevBtn) {
    const newPrev = phrasePrevBtn.cloneNode(true);
    phrasePrevBtn.parentNode.replaceChild(newPrev, phrasePrevBtn);

    newPrev.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Prev button clicked (from fix)");

      if (window.phraseInterface && window.phraseInterface.navigatePhrase) {
        window.phraseInterface.navigatePhrase(-1);
      } else if (window.ottoInterface && window.ottoInterface.navigatePhrase) {
        window.ottoInterface.navigatePhrase(-1);
      } else {
        console.error("navigatePhrase not available");
      }
    });
  }

  // Fix next button
  if (phraseNextBtn) {
    const newNext = phraseNextBtn.cloneNode(true);
    phraseNextBtn.parentNode.replaceChild(newNext, phraseNextBtn);

    newNext.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Next button clicked (from fix)");

      if (window.phraseInterface && window.phraseInterface.navigatePhrase) {
        window.phraseInterface.navigatePhrase(1);
      } else if (window.ottoInterface && window.ottoInterface.navigatePhrase) {
        window.ottoInterface.navigatePhrase(1);
      } else {
        console.error("navigatePhrase not available");
      }
    });
  }

  console.log("Phrase fix applied!");
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initPhraseFix, 3000); // Wait 3 seconds for main app to fully initialize
  });
} else {
  setTimeout(initPhraseFix, 3000); // DOM already loaded, but wait for app
}

// Also provide a manual fix function
window.fixPhraseTabs = initPhraseFix;

console.log("Phrase fix script loaded. Will initialize in 3 seconds...");