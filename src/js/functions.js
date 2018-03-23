function addContextMenu() {
    chrome.contextMenus.create({
        'id': 'flp',
        'title': getText('open_in_popup'),
        'contexts': ['link']
    }, function() {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });

    chrome.contextMenus.onClicked.addListener(function(info) {
        pageUrl = new Url(info.linkUrl);
        tabId = null;

        onExtensionClick();
    });
}

function setBrowserAction() {
    chrome.browserAction.setTitle({
        title: 'Floating Player'
    });

    chrome.browserAction.onClicked.addListener(function(tab) {
        pageUrl = new Url(tab.url);
        tabId = tab.id;

        onExtensionClick();
    });
}

function getExtensionUrl(url) {
    return chrome.runtime.getURL(url);
}

function getText(key) {
    return chrome.i18n.getMessage(key);
}

function htmlEscape(str) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&#34;',
        "'": '&#39;'
    };

    return ('' + str).replace(/[&<>"']/g, function(match) {
        return map[match];
    });
}

function versionCompare(left, right) {
    var a = left.split('.').map(function(e) { return +e; });
    var b = right.split('.').map(function(e) { return +e; });
    var len = Math.max(a.length, b.length);

    for (var i = 0; i < len; i++) {
        if ((a[i] && !b[i] && a[i] > 0) || (a[i] > b[i])) {
            return 1;
        }
        else if ((b[i] && !a[i] && b[i] > 0) || (a[i] < b[i])) {
            return -1;
        }
    }

    return 0;
}

function historyGet() {
    return JSON.parse(localStorage.getItem('history')) || [];
}

function historySet(value) {
    localStorage.setItem('history', JSON.stringify(value));
}

function historyAdd(link) {
    var currentHistory = historyGet();
    var timestamp = Date.now();

    currentHistory.unshift({
        link: link,
        timestamp: timestamp
    });

    historySet(currentHistory);
}

function historyRemove(timestamp) {
    var currentHistory = historyGet();
    var indexToRemove;

    for (var i = 0, len = currentHistory.length; i < len; i++) {
        if (currentHistory[i].timestamp === timestamp) {
            indexToRemove = i;
            break;
        }
    }

    if (indexToRemove !== undefined) {
        currentHistory.splice(indexToRemove, 1);
        historySet(currentHistory);
    }
}

function historyClear() {
    localStorage.removeItem('history');
}

function $(selector) {
    return document.getElementById(selector);
}

function $$(selector) {
    return document.querySelector(selector);
}

function $$$(selector) {
    return document.querySelectorAll(selector);
}

function addEvent(obj, type, callback) {
    obj.addEventListener(type, callback);
}

function onInput(obj, callback) {
    addEvent(obj, 'input', callback);
}

function onChange(obj, callback) {
    addEvent(obj, 'change', callback);
}

function onClick(obj, callback) {
    addEvent(obj, 'click', callback);
}

function setHtml(node, str) {
    var html;
    if (str[0] === '@') {
        html = getText(str.slice(1));
    }
    else {
        html = str;
    }
    node.innerText = html;
}
