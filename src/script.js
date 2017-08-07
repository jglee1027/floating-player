(function(window, document, chrome, screen, navigator, localStorage) {
'use strict';

// Constants
var TOP_LEFT = 1;
var TOP_RIGHT = 2;
var BOTTOM_LEFT = 3;
var BOTTOM_RIGHT = 4;
var TOP_CENTER = 5;
var BOTTOM_CENTER = 6;
var LEFT_CENTER = 7;
var RIGHT_CENTER = 8;
var CENTER = 9;

var COLOR_RED = 1;
var COLOR_WHITE = 2;

var VIDEO_16X9 = 1;
var VIDEO_4X3 = 2;


// Options
var LOCALSTORAGE_PREFIX = '_';
var options;

var defaultOptions = {
    align: BOTTOM_RIGHT,
    width: 512,
    height: 288,
    hmargin: 0,
    vmargin: 0,
    color: COLOR_RED,
    speed: 1,
    quality: 'auto',
    volume: 100,
    embed: true,
    autoplay: true,
    closeTab: false,
    noCookie: false,
    captions: true,
    annotations: true,
    related: false,
    controls: true,
    showInfo: true,
    fullscreen: true,
    ytLogo: true,
    keyboard: true,
    loop: false,
    proportion: true,
    api: true,
    playlistCounter: true,
    animateTitle: false,
    shuffle: false,
    pause: true,
    youtubeTvOnError: true,
    forceYoutubeTv: false,
    fix: true,
    helium: false,
    keepPopup: true,
    context: true,
    history: false
};


// Popup info
var popupUrl;
var popupTabId;
var popupWindowId;

// Tab info
var tabId;
var pageUrl; // <-- Either tab url or context menu url

// Video info
var videoFormat;
var videoTime;
var youtubeVideoId;


// Fix for popup width/height on Windows and Mac OS X
var WIDTH_FIX = 0;
var HEIGHT_FIX = 0;


// Using Mac OS X
var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
if (isMac) {
    HEIGHT_FIX = 22;
}

// Using Windows
else {
    var windowsVersion;
    if (windowsVersion = navigator.userAgent.match(/Windows NT ([0-9.]+)/i)) {

        windowsVersion = parseFloat(windowsVersion[1]);

        var WINDOWS_XP = 5.1;
        var WINDOWS_VISTA = 6;
        var WINDOWS_7 = 6.1;
        var WINDOWS_8 = 6.2;
        var WINDOWS_8_1 = 6.3;
        var WINDOWS_10 = 10;

        switch (windowsVersion) {
            case WINDOWS_XP:
            case WINDOWS_VISTA:
                WIDTH_FIX = 10;
                HEIGHT_FIX = 31;
                break;

            case WINDOWS_7:
                WIDTH_FIX = 10;
                HEIGHT_FIX = 29;
                break;

            case WINDOWS_8:
            case WINDOWS_8_1:
            case WINDOWS_10:
                WIDTH_FIX = 16;
                HEIGHT_FIX = 39;
        }
    }
}


var encodeURL = encodeURIComponent;
var decodeURL = decodeURIComponent;


function queryStringParse(q) {
    var vars = q.split('&'),
        result = {},
        part,
        key, value;

    for (var i = 0, len = vars.length; i < len; i++) {
        part = vars[i].split('=');

        key = (part[0] && decodeURL(part[0])) || '';
        value = (part[1] && decodeURL(part[1])) || '';

        if (key) {
            result[key] = value;
        }
    }

    return result;
}

function parseUrl(url) {
    var e = document.createElement('a');
    e.href = url;

    var rawQuery = e.search.slice(1);

    return {
        href: url,
        protocol: e.protocol,
        host: e.host.toLowerCase(),
        path: e.pathname,
        hash: e.hash,
        rawQuery: rawQuery,
        query: queryStringParse(rawQuery)
    };
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

function getOption(name) {
    var value = localStorage.getItem(LOCALSTORAGE_PREFIX + name);

    if (value === null) {
        return defaultOptions[name];
    }
    if (value === 'false') {
        return false;
    }
    if (value === 'true') {
        return true;
    }
    // Is number (https://stackoverflow.com/a/174921)
    if (value - 0 == value && ('' + value).trim().length > 0) {
        return +value;
    }
    // String
    return value;
}

function getAllOptions() {
    var opt = {};

    for (var i in defaultOptions) {
        opt[i] = getOption(i);
    }

    return opt;
}

function setOption(name, value) {
    localStorage.setItem(LOCALSTORAGE_PREFIX + name, value);
    options[name] = getOption(name);
}

function getCurrentPopup(callback) {
    var error;

    if (popupTabId === undefined) {
        error = true;
        callback(error);
    }
    else {
        chrome.tabs.get(popupTabId, function() {
            error = chrome.runtime.lastError;
            callback(error);
        });
    }
}

function getExtensionUrl(url) {
    return chrome.runtime.getURL(url);
}

function getText(key) {
    return chrome.i18n.getMessage(key);
}

function ajax(option) {
    var xhr = new XMLHttpRequest();
    xhr.timeout = 5000;
    xhr.open('GET', option.url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                option.success(xhr.responseText);
            }
            else {
                option.error();
            }
        }
    };
    xhr.send();
}

function getVideoProportion(callback) {

    var youtubeUrl = 'https://www.youtube.com/watch?v=' + youtubeVideoId;
    videoFormat = VIDEO_16X9;

    ajax({
        url: 'https://www.youtube.com/oembed?url=' + encodeURL(youtubeUrl),
        success: function(response) {
            try {
                var response = JSON.parse(response);
                var originalWidth = response.width;
                var originalHeight = response.height;
                var proportion = originalWidth / originalHeight;
                var is4x3 = proportion <= 1.4;

                if (is4x3) {
                    videoFormat = VIDEO_4X3;
                }

                callback();
            }
            catch(e) {
                console.log('oEmbed parse error');
                callback();
            }
        },
        error: function() {
            console.log('oEmbed error');
            callback();
        }
    });
}

function getWindowPosition() {
    var width = options.width;
    var height = options.height;
    var top;
    var left;

    if (videoFormat === VIDEO_4X3) {
        width = Math.round((4 * height) / 3);
    }

    if (options.fix) {
        width += WIDTH_FIX;
        height += HEIGHT_FIX;
    }

    switch (options.align) {

        case TOP_LEFT:
            top = options.vmargin;
            left = options.hmargin;
            break;

        case TOP_RIGHT:
            top = options.vmargin;
            left = screen.width - width - options.hmargin;
            break;

        case BOTTOM_LEFT:
            top = screen.height - height - options.vmargin;
            left = options.hmargin;
            break;

        case BOTTOM_RIGHT:
            top = screen.height - height - options.vmargin;
            left = screen.width - width - options.hmargin;
            break;

        case TOP_CENTER:
            top = options.vmargin;
            left = (screen.width - width) / 2;
            break;

        case BOTTOM_CENTER:
            top = screen.height - height - options.vmargin;
            left = (screen.width - width) / 2;
            break;

        case LEFT_CENTER:
            top = (screen.height - height) / 2;
            left = options.hmargin;
            break;

        case RIGHT_CENTER:
            top = (screen.height - height) / 2;
            left = screen.width - width - options.hmargin;
            break;

        case CENTER:
            top = (screen.height - height) / 2;
            left = (screen.width - width) / 2;
    }

    return {
        top: top,
        left: left,
        width: width,
        height: height
    };
}

function showInstructions() {
    var lang = chrome.i18n.getUILanguage().toLowerCase();
    var suffix;

    switch (lang) {
        case 'pt-br':
        case 'pt-pt':
        case 'pt':
            suffix = 'pt';
            break;

        default:
            suffix = 'en';
    }

    chrome.tabs.create({
        url: 'https://public-folder.github.io/floating-player/instructions-'
            + suffix + '.html'
    });
}

function addContextMenu() {
    var menu = chrome.contextMenus;

    menu.create({
        'id': 'flp',
        'title': getText('open_in_popup'),
        'contexts': ['link']
    }, function() {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });

    menu.onClicked.addListener(function(info) {
        pageUrl = parseUrl(info.linkUrl);
        tabId = null;

        preparePopup();
    });
}

function removeContextMenu() {
    chrome.contextMenus.removeAll();
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

function setHtml(obj, str) {
    var html;
    if (str[0] === '@') {
        html = getText(str.slice(1));
    }
    else {
        html = str;
    }
    obj.innerHTML = html;
}

function preparePopup() {
    options = getAllOptions();

    if (options.history) {
        historyAdd(pageUrl.href);
    }

    // From extension icon
    if (tabId !== null && options.pause) {

        // Get video time
        chrome.tabs.executeScript(tabId, {file: 'get-time.js'}, function(time) {
            videoTime = 0;

            if (Array.isArray(time) && typeof time[0] === 'number') {
                videoTime = time[0];
            }
            showPopup();
        });
    }

    // From context menu
    else {
        videoTime = 0;
        showPopup();
    }
}

function showPopup() {

    popupUrl = pageUrl.href;
    youtubeVideoId = null;

    if (options.embed) {
        parseHost();
    }

    if (youtubeVideoId && options.proportion) {

        getVideoProportion(function() {
            windowOpen();
        });

    }
    else {
        videoFormat = VIDEO_16X9;
        windowOpen();
    }

    function windowOpen() {

        if (options.helium) {
            popupUrl = 'helium://' + popupUrl;

            chrome.tabs.create({
                url: popupUrl,
                pinned: true,
                active: false
            }, function(tab) {
                setTimeout(function() {
                    chrome.tabs.remove(tab.id);
                }, 3000);
            });
        }
        else {
            var pos = getWindowPosition();

            function create() {
                chrome.windows.create({
                    url: popupUrl,
                    width: pos.width,
                    height: pos.height,
                    top: pos.top,
                    left: pos.left,
                    type: 'popup',
                    focused: true
                }, function(info) {
                    popupTabId = info.tabs[0].id;
                    popupWindowId = info.id;
                });
            }

            if (options.keepPopup) {

                // Find the current popup if any
                getCurrentPopup(function(error) {

                    // No popup found; create a new one
                    if (error) {
                        create();
                    }

                    // We found the popup, let's update its url
                    else {
                        chrome.tabs.update(popupTabId, {
                            url: popupUrl // <-- needs web_accessible_resources
                        });

                        chrome.windows.update(popupWindowId, {
                            // top: pos.top, <-- // [BUG] If top is set,
                                                 // the popup will be
                                                 // under the taskbar
                                                 // on Windows and Mac OS
                            left: pos.left,
                            width: pos.width,
                            height: pos.height,
                            focused: true
                        });
                    }
                });
            }
            else {
                create();
            }
        }

        // Close current tab
        if (tabId !== null && options.closeTab) {
            chrome.tabs.remove(tabId);
        }
    }
}

function parseHost() {
    switch (pageUrl.host) {
        case 'youtube.com':
        case 'www.youtube.com':
        case 'm.youtube.com':
        case 'gaming.youtube.com':
        case 'youtu.be':
            if (options.forceYoutubeTv) {
                parseYouTubeAsTv();
            }
            else {
                parseYouTube();
            }
            break;

        case 'www.twitch.tv':
            parseTwitch();
            break;

        case 'vimeo.com':
            parseVimeo();
            break;

        case 'www.dailymotion.com':
            parseDailymotion();
            break;

        case 'www.ustream.tv':
            parseUstream();
            break;

        case 'www.smashcast.tv':
            parseSmashcast();
            break;

        case 'www.facebook.com':
            parseFacebook();
            break;

        case 'www.instagram.com':
            parseInstagram();
            break;

        case 'www.ted.com':
            parseTed();
            break;

        case 'v.youku.com':
            parseYouku();
            break;

        case 'www.vevo.com':
            parseVevo();
            break;

        case 'www.metacafe.com':
            parseMetacafe();
            break;

        case 'getpocket.com':
            parsePocket();
            break;

        default:
            // Google search, eg.:
            // - www.google.com
            // - www.google.com.br
            // - www.google.co.uk
            // - www.google.es
            if (pageUrl.host.match(/^www\.google\./) &&
                pageUrl.path === '/url' && pageUrl.query.url) {

                pageUrl = parseUrl(pageUrl.query.url);
                parseHost();
            }
    }
}

function parseTime(time) {
    var matches = ('' + time).match(
        /^(?:([0-9]+)h)?(?:([0-9]+)m)?(?:([0-9]+)s?)?$/) || [];

    if (matches.length === 4) {
        var hours = +(matches[1] || 0);
        var minutes = +(matches[2] || 0);
        var seconds = +(matches[3] || 0);

        return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
}

function parseYouTube() {
    var matches;
    var youtubeDomain;

    var videoId;
    var playlist;
    var isShortLink;

    if (options.noCookie) {
        youtubeDomain = 'https://www.youtube-nocookie.com';
    }
    else {
        youtubeDomain = 'https://www.youtube.com';
    }


    if (pageUrl.host === 'youtu.be') {
        videoId = pageUrl.path.slice(1);
        youtubeVideoId = videoId;
        isShortLink = true;
    }
    else {
        videoId = pageUrl.query.v || '';
        youtubeVideoId = videoId;
        playlist = pageUrl.query.list;
    }


    function ytCommonParams() {
        if (!options.related) {
            popupUrl += '&rel=0';
        }

        if (options.captions) {
            popupUrl += '&cc_load_policy=1';
        }

        var annotations = options.annotations ? '1' : '3';
        popupUrl += '&iv_load_policy=' + annotations;

        if (!options.controls) {
            popupUrl += '&controls=0';
        }

        if (!options.showInfo) {
            popupUrl += '&showinfo=0';
        }

        if (options.loop) {
            popupUrl += '&loop=1';

            // Workaround to make single videos loop
            if (!playlist) {
                popupUrl += '&playlist=' + videoId;
            }
        }

        if (!options.fullscreen) {
            popupUrl += '&fs=0';
        }

        if (!options.ytLogo) {
            popupUrl += '&modestbranding=1';
        }

        if (!options.keyboard) {
            popupUrl += '&disablekb=1';
        }

        if (options.color === COLOR_WHITE) {
            popupUrl += '&color=white';
        }

        if (options.api && !options.helium) {
            popupUrl += '&enablejsapi=1&origin=' + encodeURL(getExtensionUrl('').
                slice(0, -1));

            popupUrl = getExtensionUrl('youtube.html?' + encodeURL(popupUrl));
        }
    }

    // YouTube video or playlist
    if (pageUrl.path === '/watch' || pageUrl.path === '/playlist' || isShortLink) {
        popupUrl = youtubeDomain + '/embed/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        if (playlist) {
            popupUrl += '&listType=playlist&list=' + encodeURL(playlist);
        }

        var time = videoTime ||
                   pageUrl.query.start ||
                   pageUrl.query.t ||
                   pageUrl.query.time_continue;

        if (time) {
            popupUrl += '&start=' + parseTime(time);
        }

        ytCommonParams();
    }

    // YouTube channel
    else if (matches = pageUrl.path.match(/^\/user\/([a-zA-Z0-9_-]+).*$/)) {
        var channel = matches[1];

        popupUrl = youtubeDomain + '/embed?listType=user_uploads&list=' +
            encodeURL(channel);

        ytCommonParams();
    }

    // YouTube search
    else if (pageUrl.path === '/results') {
        var search = pageUrl.query.search_query || pageUrl.query.q;

        // [BUG] YouTube search doesn't work with youtube-nocookie.com

        popupUrl = 'https://www.youtube.com/embed?listType=search&list=' +
            encodeURL(search);

        ytCommonParams();
    }
}

function parseYouTubeAsTv() {
    var videoId;
    var playlist;

    popupUrl = 'https://www.youtube.com/tv#/watch?';

    if (pageUrl.host === 'youtu.be') {
        videoId = pageUrl.path.slice(1);
        youtubeVideoId = videoId;
    }
    else {
        videoId = pageUrl.query.v || '';
        youtubeVideoId = videoId;
        playlist = pageUrl.query.list;
    }

    if (videoId) {
        popupUrl += '&v=' + encodeURL(videoId);
    }

    if (playlist) {
        popupUrl += '&list=' + encodeURL(playlist);
    }

    // [BUG] Video time doesn't work with list on YouTube TV
    var time = videoTime ||
               pageUrl.query.start ||
               pageUrl.query.t ||
               pageUrl.query.time_continue;

    if (time) {
        popupUrl += '&t=' + parseTime(time);
    }
}

function parseTwitch() {
    var matches;

    if (matches = pageUrl.path.match(/^\/([a-z0-9_]{1,25})$/i)) {
        var channel = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&channel=' + channel;

        if (!options.autoplay) {
            popupUrl += '&autoplay=false';
        }
    }

    else if ((matches = pageUrl.path.match(/^\/(?:[a-z0-9_]{1,25})\/p\/([0-9]+)$/i))
          || (matches = pageUrl.path.match(/^\/videos\/([0-9]+)$/i))) {
        var videoId = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&video=v' + videoId;

        if (!options.autoplay) {
            popupUrl += '&autoplay=false';
        }

        if (videoTime) {
            popupUrl += '&time=' + videoTime + 's';
        }
    }
}

function parseVimeo() {
    var matches;

    if (matches = pageUrl.path.match(/^\/([0-9]+)$/)) {
        var videoId = matches[1];
        popupUrl = 'https://player.vimeo.com/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        if (videoTime) {
            popupUrl += '#t=' + videoTime + 's';
        }
    }
}

function parseDailymotion() {
    var matches;

    if (matches = pageUrl.path.match(/^\/video\/([a-z0-9]+)/i)) {
        var videoId = matches[1];
        popupUrl = 'http://www.dailymotion.com/embed/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        if (!options.controls) {
            popupUrl += '&controls=0';
        }

        if (!options.related) {
            popupUrl += '&endscreen-enable=0';
        }

        if (videoTime) {
            popupUrl += '&start=' + videoTime;
        }
    }
}

function parseUstream() {
    var matches;

    if ((matches = pageUrl.path.match(/\/recorded\/[0-9]+/i)) ||
        (matches = pageUrl.path.match(/\/channel\/.+/i))) {
        popupUrl = 'http://www.ustream.tv' + matches[0] + '/pop-out';
    }
}

function parseSmashcast() {
    var matches;

    if (matches = pageUrl.path.match(/^\/([a-z0-9]{3,25})$/i)) {
        var channel = matches[1];
        popupUrl = 'https://www.smashcast.tv/embed/' + channel + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=true';
        }
    }

    else if (matches = pageUrl.path.match(/^\/[a-z0-9]{3,25}\/videos\/([0-9]+)$/i)) {
        var videoId = matches[1];
        popupUrl = 'https://www.smashcast.tv/embed/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=true';
        }
    }
}

function parseFacebook() {
    if (pageUrl.path.match(/^\/[a-z0-9_]+\/videos(\/vb\.[0-9]+)?\/[0-9]+/i)) {
        popupUrl = 'https://www.facebook.com/plugins/video.php?href=' +
            encodeURL(pageUrl.href);

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }
    }
}

function parseInstagram() {
    var matches;

    if (matches = pageUrl.path.match(/^\/p\/[a-z0-9_-]+\/$/i)) {
        popupUrl = 'https://www.instagram.com' + matches[0] + 'embed';
    }
}

function parseTed() {
    var matches;

    if (matches = pageUrl.path.match(/^\/talks\/[a-z0-9_]+$/i)) {
        popupUrl = 'https://embed.ted.com' + matches[0];
    }
}

function parseYouku() {
    var matches;

    if (matches = pageUrl.path.match(/id_(.+)(\.html)?/)) {
        popupUrl = 'http://player.youku.com/embed/' + matches[1];
    }
}

function parseVevo() {
    var matches;

    if (matches = pageUrl.path.match(/[A-Z0-9]+/g)) {
        popupUrl = 'https://embed.vevo.com/?video=' + matches[0];

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }
    }
}

function parseMetacafe() {
    var matches;

    if (matches = pageUrl.path.match(/watch\/(.+)/)) {
        popupUrl = 'http://www.metacafe.com/embed/' + matches[1];
    }
}

function parsePocket() {
    if (pageUrl.path === '/redirect' && pageUrl.query.url) {
        pageUrl = parseUrl(pageUrl.query.url);
        parseHost();
    }
}
//------------------------------------------------------------------------------

var where = location.pathname.slice(1, -5);

if (where === 'background') {
    var context = getOption('context');

    if (context) {
        addContextMenu();
    }

    // 1st time
    if (!localStorage['ok']) {
        localStorage['ok'] = 1;
        showInstructions();
    }

    chrome.browserAction.setTitle({
        title: 'Floating Player'
    });

    // Extension icon
    chrome.browserAction.onClicked.addListener(function(tab) {
        pageUrl = parseUrl(tab.url);
        tabId = tab.id;

        preparePopup();
    });
}

else if (where === 'options') {

    // Translation strings
    var strOptions = getText('options');
    setHtml($$('title'), strOptions);
    setHtml($$('h1 a'), strOptions);
    setHtml($$('label[for="align"]'), '@align');

    var $option = $$$('option');
    setHtml($option[0], '@top_left');
    setHtml($option[1], '@top_right');
    setHtml($option[2], '@bottom_left');
    setHtml($option[3], '@bottom_right');
    setHtml($option[4], '@top_center');
    setHtml($option[5], '@bottom_center');
    setHtml($option[6], '@left_center');
    setHtml($option[7], '@right_center');
    setHtml($option[8], '@center');

    setHtml($$('label[for="width"]'), '@size');
    setHtml($('recommended'), '@recommended');
    setHtml($$('label[for="horizontal-margin"]'), '@horizontal_margin');
    setHtml($$('label[for="vertical-margin"]'), '@vertical_margin');
    setHtml($$('label[for="embed"]'), '@embed');
    setHtml($$('label[for="autoplay"]'), '@autoplay');
    setHtml($$('label[for="close-tab"]'), '@close_tab');
    setHtml($$('label[for="no-cookie"]'), '@no_cookie');
    setHtml($$('label[for="captions"]'), '@captions');
    setHtml($$('label[for="annotations"]'), '@annotations');
    setHtml($$('label[for="related"]'), '@related');
    setHtml($$('label[for="controls"]'), '@controls');
    setHtml($$('label[for="show-info"]'), '@show_info');
    setHtml($$('label[for="fullscreen"]'), '@fullscreen');
    setHtml($$('label[for="yt-logo"]'), '@yt_logo');
    setHtml($$('label[for="color"]'), '@color');
    setHtml($option[9], '@red');
    setHtml($option[10], '@white');

    setHtml($$('label[for="speed"]'), '@speed');
    setHtml($option[14], '@normal');

    setHtml($$('label[for="quality"]'), '@quality');
    setHtml($$('label[for="volume"]'), '@volume');
    setHtml($$('label[for="proportion"]'), '@proportion');
    setHtml($$('label[for="keyboard"]'), '@keyboard');
    setHtml($$('label[for="loop"]'), '@loop');
    setHtml($$('label[for="api"]'), '@api');
    setHtml($$('label[for="playlist-counter"]'), '@playlist_counter');
    setHtml($$('label[for="animate-title"]'), '@animate_title');
    setHtml($$('label[for="shuffle"]'), '@shuffle');
    setHtml($$('label[for="pause"]'), '@pause');
    setHtml($$('label[for="youtube-tv-on-error"]'), '@youtube_tv_on_error');
    setHtml($$('label[for="force-youtube-tv"]'), '@force_youtube_tv');
    setHtml($$('label[for="fix"]'), '@fix');
    setHtml($$('label[for="helium"]'), '@helium');
    setHtml($$('label[for="keep-popup"]'), '@keep_popup');
    setHtml($$('label[for="use-context"]'), '@use_context');
    setHtml($$('label[for="enable-history"]'), '@enable_history');

    setHtml($('requires-api'), '@requires_api');

    var $defaultConfig = $('default-config');
    setHtml($defaultConfig, '@default');

    var $sourceCode = $('source-code');
    setHtml($sourceCode, '@source_code');

    var $instructions = $('instructions');
    setHtml($instructions, '@instructions');

    var $seeHistory = $('see-history');
    setHtml($seeHistory, '@history');
    // End Translation strings


    // Add css class to body about the OS
    chrome.runtime.getPlatformInfo(function(info) {
        document.body.classList.add('os-' + info.os);
    });

    options = getAllOptions();

    var $align = $('align');
    $align.value = options.align;
    onChange($align, function() {
        setOption('align', this.value);
    });

    var $width = $('width');
    var $height = $('height');

    $width.value = options.width;
    onInput($width, function() {
        setOption('width', this.value);
        highlightResolution(this.value, $height.value);
    });

    $height.value = options.height;
    onInput($height, function() {
        setOption('height', this.value);
        highlightResolution($width.value, this.value);
    });

    highlightResolution($width.value, $height.value);

    var $horizontalMargin = $('horizontal-margin');
    $horizontalMargin.value = options.hmargin;
    onInput($horizontalMargin, function() {
        setOption('hmargin', this.value);
    });

    var $verticalMargin = $('vertical-margin');
    $verticalMargin.value = options.vmargin;
    onInput($verticalMargin, function() {
        setOption('vmargin', this.value);
    });

    var $embed = $('embed');
    $embed.checked = options.embed;
    onChange($embed, function() {
        setOption('embed', this.checked);
    });

    var $autoplay = $('autoplay');
    $autoplay.checked = options.autoplay;
    onChange($autoplay, function() {
        setOption('autoplay', this.checked);
    });

    var $closeTab = $('close-tab');
    $closeTab.checked = options.closeTab;
    onChange($closeTab, function() {
        setOption('closeTab', this.checked);
    });

    var $noCookie = $('no-cookie');
    $noCookie.checked = options.noCookie;
    onChange($noCookie, function() {
        setOption('noCookie', this.checked);
    });

    var $captions = $('captions');
    $captions.checked = options.captions;
    onChange($captions, function() {
        setOption('captions', this.checked);
    });

    var $annotations = $('annotations');
    $annotations.checked = options.annotations;
    onChange($annotations, function() {
        setOption('annotations', this.checked);
    });

    var $related = $('related');
    $related.checked = options.related;
    onChange($related, function() {
        setOption('related', this.checked);
    });

    var $controls = $('controls');
    $controls.checked = options.controls;
    onChange($controls, function() {
        setOption('controls', this.checked);
    });

    var $showInfo = $('show-info');
    $showInfo.checked = options.showInfo;
    onChange($showInfo, function() {
        setOption('showInfo', this.checked);
    });

    var $fullscreen = $('fullscreen');
    $fullscreen.checked = options.fullscreen;
    onChange($fullscreen, function() {
        setOption('fullscreen', this.checked);
    });

    var $ytLogo = $('yt-logo');
    $ytLogo.checked = options.ytLogo;
    onChange($ytLogo, function() {
        setOption('ytLogo', this.checked);
    });

    var $color = $('color');
    $color.value = options.color;
    onChange($color, function() {
        setOption('color', this.value);
    });

    var $speed = $('speed');
    $speed.value = options.speed;
    onChange($speed, function() {
        setOption('speed', this.value);
    });

    var $quality = $('quality');
    $quality.value = options.quality;
    onChange($quality, function() {
        setOption('quality', this.value);
    });

    var $volume = $('volume');
    var $currentVolume = $('current-volume');
    $volume.value = options.volume;
    $currentVolume.innerHTML = options.volume;
    onInput($volume, function() {
        setOption('volume', this.value);
        $currentVolume.innerHTML = this.value;
    });

    var $proportion = $('proportion');
    $proportion.checked = options.proportion;
    onChange($proportion, function() {
        setOption('proportion', this.checked);
    });

    var $keyboard = $('keyboard');
    $keyboard.checked = options.keyboard;
    onChange($keyboard, function() {
        setOption('keyboard', this.checked);
    });

    var $loop = $('loop');
    $loop.checked = options.loop;
    onChange($loop, function() {
        setOption('loop', this.checked);
    });

    var $api = $('api');
    $api.checked = options.api;
    onChange($api, function() {
        setOption('api', this.checked);
    });

    var $playlistCounter = $('playlist-counter');
    $playlistCounter.checked = options.playlistCounter;
    onChange($playlistCounter, function() {
        setOption('playlistCounter', this.checked);
    });

    var $animateTitle = $('animate-title');
    $animateTitle.checked = options.animateTitle;
    onChange($animateTitle, function() {
        setOption('animateTitle', this.checked);
    });

    var $shuffle = $('shuffle');
    $shuffle.checked = options.shuffle;
    onChange($shuffle, function() {
        setOption('shuffle', this.checked);
    });

    var $pause = $('pause');
    $pause.checked = options.pause;
    onChange($pause, function() {
        setOption('pause', this.checked);
    });

    var $youtubeTvOnError = $('youtube-tv-on-error');
    $youtubeTvOnError.checked = options.youtubeTvOnError;
    onChange($youtubeTvOnError, function() {
        setOption('youtubeTvOnError', this.checked);
    });

    var $forceYoutubeTv = $('force-youtube-tv');
    $forceYoutubeTv.checked = options.forceYoutubeTv;
    onChange($forceYoutubeTv, function() {
        setOption('forceYoutubeTv', this.checked);
    });

    var $fix = $('fix');
    $fix.checked = options.fix;
    onChange($fix, function() {
        setOption('fix', this.checked);
    });

    var $helium = $('helium');
    $helium.checked = options.helium;
    onChange($helium, function() {
        setOption('helium', this.checked);
    });

    var $keepPopup = $('keep-popup');
    $keepPopup.checked = options.keepPopup;
    onChange($keepPopup, function() {
        setOption('keepPopup', this.checked);
    });

    var $context = $('use-context');
    $context.checked = options.context;
    onChange($context, function() {
        var isChecked = this.checked;

        if (isChecked) {
            addContextMenu();
        }
        else {
            removeContextMenu();
        }
        setOption('context', isChecked);
    });

    var $enableHistory = $('enable-history');
    $enableHistory.checked = options.history;
    onChange($enableHistory, function() {
        setOption('history', this.checked);
    });

    onClick($defaultConfig, function(e) {
        e.preventDefault();

        if (!options.context) {
            addContextMenu();
        }

        var isOption;

        if (confirm(getText('u_sure'))) {
            for (var i in localStorage) {

                isOption = i.substring(0, LOCALSTORAGE_PREFIX.length) ===
                    LOCALSTORAGE_PREFIX;

                if (isOption) {
                    localStorage.removeItem(i);
                }
            }
            location.reload();
        }
    });

    onClick($sourceCode, function(e) {
        e.preventDefault();
        chrome.tabs.create({
            url: 'https://github.com/gabrielbarros/floating-player'
        });
    });

    onClick($instructions, function(e) {
        e.preventDefault();
        showInstructions();
    });

    onClick($seeHistory, function(e) {
        e.preventDefault();
        chrome.tabs.create({
            url: getExtensionUrl('history.html')
        });
    });

    onClick($('resolutions'), function(e) {
        var $target = e.target;
        var resolution;
        var width;
        var height;

        e.preventDefault();

        if ($target.href) {
            resolution = $target.innerHTML.split('x');
            width = resolution[0];
            height = resolution[1];

            $width.value = width;
            $height.value = height;

            setOption('width', width);
            setOption('height', height);

            highlightResolution(width, height);
        }
    });

    /*
    Algorithm to generate "perfect" resolutions:

    var width16x9;
    var height16x9;
    var width4x3;
    var height4x3;

    for (var i = 50; i < 500; i++) {
        height16x9 = height4x3 = i;
        width16x9 = (height16x9 * 16) / 9;
        width4x3 = (height4x3 * 4) / 3;

        if (width16x9 % 1 === 0 && width4x3 % 1 === 0) {
            console.log(width16x9 + 'x' + height16x9 +
                '; ' + width4x3 + 'x' + height4x3);
        }
    }
    */

    function highlightResolution(width, height) {
        var highlightClass = 'active-resolution';
        var $elem;

        $elem = $$('.' + highlightClass);
        $elem && $elem.classList.remove(highlightClass);

        $elem = $(width + 'x' + height);
        $elem && $elem.classList.add(highlightClass);
    }
}

else if (where === 'youtube') {

    var player;
    var playerId = 'player';

    var videoData;
    var videoId;
    var newVideoId;
    var videoTitle;
    var videoList;

    options = getAllOptions();

    function onYouTubeIframeAPIReady() {
        player = new YT.Player(playerId, {
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError
            }
        });
    }

    function onPlayerReady(event) {

        // To force the event onerror when the video cannot be played
        if (options.autoplay) {
            player.playVideo();
        }

        // Set video playback speed
        player.setPlaybackRate(options.speed);

        // Set volume
        player.setVolume(options.volume);

        // [BUG] To make shuffle work, sometimes we need to wait some time
        // https://stackoverflow.com/a/35229793
        // https://stackoverflow.com/a/34881913
        if (options.shuffle) {
            setTimeout(function() {
                player.setShuffle(true);
            }, 1000);
        }
    }

    function onPlayerStateChange(event) {
        videoData = player.getVideoData();
        newVideoId = videoData.video_id;

        // Set video quality
        player.setPlaybackQuality(options.quality);

        if (event.data === YT.PlayerState.PLAYING) {
            if (newVideoId !== videoId) {
                videoId = newVideoId;
                youtubeVideoId = videoId;
                onNextVideo();
            }
        }
    }

    function onNextVideo() {
        videoTitle = videoData.title;
        videoList = videoData.list;

        // Set video title
        setVideoTitle();

        // Add link to history
        if (options.history) {
            var link = 'https://www.youtube.com/watch?v=' + videoId;

            if (videoList) {
                link += '&list=' + videoList;
            }

            // Don't add duplicate link
            var latestLink = historyGet()[0];
            if (latestLink) {
                latestLink = latestLink.link;
            }

            if (link !== latestLink) {
                historyAdd(link);
            }
        }

        // Fix proportion of the next video in the playlist
        // Except if fullscreen
        var isFullscreen = window.innerWidth === screen.width;

        if (!isFullscreen && options.proportion) {
            getVideoProportion(function() {
                var pos = getWindowPosition();

                resizeTo(pos.width, pos.height);
                moveTo(pos.left, pos.top);

                /*
                chrome.windows.getCurrent({}, function(info) {
                    chrome.windows.update(info.id, {
                        top: pos.top,
                        left: pos.left,
                        width: pos.width,
                        height: pos.height
                    });
                });
                */
            });
        }
    }

    var animateTimer;
    function animateTitle(title) {
        clearInterval(animateTimer);

        title += ' \u2022 ';
        var length = title.length;
        var i = 0;

        animateTimer = setInterval(function() {
            if (i === length) {
                i = 0;
            }
            document.title = title.substr(i) + title.substr(0, i);
            i++;
        }, 300);
    }

    function setVideoTitle() {
        var playlistTitle = '';

        if (options.playlistCounter) {
            var playlistIndex = player.getPlaylistIndex() + 1;
            var playlistSize;

            if (playlistIndex > 0) {
                playlistSize = player.getPlaylist().length;
                playlistTitle = '(' + playlistIndex + '/' + playlistSize + ') ';
            }
        }

        var title;
        if (videoTitle) {
            title = playlistTitle + videoTitle + ' - YouTube';
        }
        else {
            title = 'YouTube';
        }
        document.title = title;

        if (options.animateTitle) {
            animateTitle(title);
        }
    }


    function onPlayerError(event) {
        var BLOCKED_BY_OWNER = 101;
        var BLOCKED_BY_OWNER_IN_DISGUISE = 150;

        if (event.data === BLOCKED_BY_OWNER ||
            event.data === BLOCKED_BY_OWNER_IN_DISGUISE) {

            var videoUrl = parseUrl(player.getVideoUrl());

            if (options.youtubeTvOnError) {
                pageUrl = videoUrl;
                parseYouTubeAsTv();
                location.href = popupUrl;
            }
            else if (confirm(getText('cannot_play'))) {
                location.href = videoUrl.href;
            }
        }
    }

    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

    var iframeUrl = decodeURL(location.search.slice(1));

    if (iframeUrl) {
        var iframe = document.createElement('iframe');
        iframe.id = playerId;
        iframe.src = iframeUrl;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = 'true';
        document.body.appendChild(iframe);
    }
}

else if (where === 'history') {

    // Translation strings
    var strHistory = getText('history');
    setHtml($$('title'), strHistory);
    setHtml($$('h1 a'), strHistory);

    var $clearHistory = $('clear-history');
    setHtml($clearHistory, '@clear_history');
    // End Translation strings

    var $table = $('table');

    var currentHistory = historyGet();
    var historySize = currentHistory.length;

    function historyIsEmpty() {
        var isHistoryEnabled = getOption('history');
        var key;

        if (isHistoryEnabled) {
            key = 'history_empty';
        }
        else {
            key = 'history_disabled';
        }

        $table.parentNode.removeChild($table);
        $clearHistory.outerHTML = '<p>' + getText(key) + '</p>';
    }

    if (historySize) {
        var tpl = '<tbody>';

        var link;
        var timestamp;
        var date;

        for (var i = 0; i < historySize; i++) {
            link = htmlEscape(currentHistory[i].link);
            timestamp = currentHistory[i].timestamp;
            date = new Date(timestamp).toLocaleString();

            tpl += '<tr>';
            tpl += '<td class="td-date">';
            tpl += date;
            tpl += '</td>';
            tpl += '<td class="td-link">';
            tpl += '<a href="' + link + '">' + link + '</a>';
            tpl += '</td>';
            tpl += '<td class="td-remove" data-timestamp="' + timestamp + '">';
            tpl += '</td>';
            tpl += '</tr>';
        }

        tpl += '</tbody>';

        $table.innerHTML = tpl;
    }
    else {
        historyIsEmpty();
    }

    // "X" image
    onClick($table, function(e) {
        var $target = e.target;
        if ($target.className === 'td-remove') {
            var timestamp = +$target.dataset.timestamp;
            var $tr = $target.parentNode;
            $tr.parentNode.removeChild($tr);

            historyRemove(timestamp);
            historySize--;

            if (historySize === 0) {
                historyIsEmpty();
            }
        }
    });

    onClick($clearHistory, function(e) {
        e.preventDefault();

        if (confirm(getText('u_sure'))) {
            historyClear();
            historyIsEmpty();
        }
    });
}

})(window, document, chrome, screen, navigator, localStorage);
