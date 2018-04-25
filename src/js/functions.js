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
    chrome.browserAction.onClicked.addListener(function(tab) {
        pageUrl = new Url(tab.url);
        tabId = tab.id;

        onExtensionClick();
    });
}

function showInstructions() {
    chrome.tabs.create({
        url: getExtensionUrl('instructions.html')
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

function setVars(str, vars) {
    return str.replace(/\{([a-z_]+)\}/gi, function(match, p1) {
        return vars[p1];
    });
}
