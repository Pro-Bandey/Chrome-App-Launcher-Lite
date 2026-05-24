// Initialize with default settings
// UniversalToaster.init();

// Or, initialize with custom options
UniversalToaster.init({
    delay: 200,          // Wait 200ms before showing
    fontSize: '14px',
    borderRadius: '8px',
    backgroundColor: "var(--bg)", // e.g. "#333"
    textColor: "var(--text)",   // e.g. "#fff"
    // TYPOGRAPHY
    fontFamily: "inherit", // Uses page font
    fontSize: "13px",
    fontWeight: "500",
    // SHAPE
    borderRadius: "var(--radius-pill)",
    padding: "8px 12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
});