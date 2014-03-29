function checkForValidUrl(tabId, changeInfo, tab) {
    if (/http:\/\/huaban\.com\/[^\\]+\/pins/.test(tab.url)) {
        chrome.pageAction.show(tabId)
    }
};

chrome.tabs.onUpdated.addListener(checkForValidUrl);