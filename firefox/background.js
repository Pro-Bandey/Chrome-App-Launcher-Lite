const ua = navigator.userAgent || "";
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
const isFirefox = ua.includes("Firefox");

if (isMobile) {
    browser.action.setPopup({ popup: "" });

    browser.action.onClicked.addListener(() => {
        browser.tabs.create({
            url: browser.runtime.getURL("index.html")
        });
    });
} else if (isFirefox) {
    browser.action.setPopup({
        popup: "index.html"
    });
}