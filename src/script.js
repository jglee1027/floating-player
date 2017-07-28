(function(window, document, chrome, screen, navigator, localStorage) {
'use strict';

var encodeURL = encodeURIComponent;
var decodeURL = decodeURIComponent;

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
    keepPopup: true,
    context: true,
    history: false
};

var tabId;
var pageUrl;
var fromContextMenu;
var videoTime;

var LOCALSTORAGE_PREFIX = '_';

var WIDTH_FIX = 0;
var HEIGHT_FIX = 0;

var WINDOWS_XP = 5.1;
var WINDOWS_VISTA = 6;
var WINDOWS_7 = 6.1;
var WINDOWS_8 = 6.2;
var WINDOWS_8_1 = 6.3;
var WINDOWS_10 = 10;

var ua = navigator.userAgent;
var windowsVersion = parseFloat((ua.match(/Windows NT ([0-9.]+)/i) || [])[1]);

// Fix popup width and height on Windows
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

function getTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        callback(tabs[0].url, tabs[0].id);
    });
}

function getURL(url) {
    return chrome.runtime.getURL(url);
}

function getText(key) {
    return chrome.i18n.getMessage(key);
}

function ajax(option) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', option.url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) { // XMLHttpRequest.DONE = 4
            if (xhr.status === 200) {
                option.success(xhr.responseText);
            }
            else {
                option.error(xhr.statusText);
            }
        }
    };
    xhr.send();
}

function getVideoProportion(option) {

    // option: videoId, onVideo16x9, onVideo4x3

    var youtubeUrl = 'https://www.youtube.com/watch?v=' + option.videoId;

    ajax({
        url: 'https://www.youtube.com/oembed?url=' + encodeURL(youtubeUrl),
        success: function(response) {
            try {
                var response = JSON.parse(response);
                var originalWidth = response.width;
                var originalHeight = response.height;
                var proportion = originalWidth / originalHeight;
                var is16x9 = proportion > 1.4;

                if (is16x9) {
                    option.onVideo16x9();
                }
                else {
                    option.onVideo4x3();
                }
            }
            catch(e) {
                option.onVideo16x9();
            }
        },
        error: function() {
            option.onVideo16x9();
        }
    });
}

function getWidth4x3(height) {
    return Math.round((4 * height) / 3);
}

function getWindowPosition(width, height) {

    if (options.fix) {
        width += WIDTH_FIX;
        height += HEIGHT_FIX;
    }

    var top;
    var left;

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
    var lang = navigator.language.toLowerCase();
    var suffix = (lang === 'pt-br' || lang === 'pt-pt') ? 'pt' : 'en';

    window.open('https://public-folder.github.io/floating-player/instructions-'
        + suffix + '.html');
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

        pageUrl = info.linkUrl;
        fromContextMenu = true;

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
        historyAdd(pageUrl);
    }

    if (!fromContextMenu && options.pause) {
        // Get video time (see content.js)
        chrome.tabs.sendMessage(tabId, '', function(time) {
            videoTime = time;
            showPopup();
        });
    }
    else {
        showPopup();
    }
}

function showPopup() {

    var url = parseUrl(pageUrl);
    var popupUrl = url.href;
    var parseResult = {};

    if (options.embed) {

        switch (url.host) {
            case 'youtube.com':
            case 'www.youtube.com':
            case 'm.youtube.com':
            case 'gaming.youtube.com':
            case 'youtu.be':
                if (options.forceYoutubeTv) {
                    parseResult = parseYouTubeAsTv(url);
                }
                else {
                    parseResult = parseYouTube(url);
                }
                break;

            case 'www.twitch.tv':
                parseResult = parseTwitch(url);
                break;

            case 'vimeo.com':
                parseResult = parseVimeo(url);
                break;

            case 'www.dailymotion.com':
                parseResult = parseDailymotion(url);
                break;

            case 'www.ustream.tv':
                parseResult = parseUstream(url);
                break;

            case 'www.smashcast.tv':
                parseResult = parseSmashcast(url);
                break;

            case 'www.facebook.com':
                parseResult = parseFacebook(url);
                break;

            case 'www.instagram.com':
                parseResult = parseInstagram(url);
                break;

            case 'www.ted.com':
                parseResult = parseTed(url);
                break;

            case 'v.youku.com':
                parseResult = parseYouku(url);
                break;

            case 'www.vevo.com':
                parseResult = parseVevo(url);
                break;

            case 'www.metacafe.com':
                parseResult = parseMetacafe(url);
                break;
        }

        if (parseResult.popupUrl) {
            popupUrl = parseResult.popupUrl;
        }
    }


    var youtubeVideoId = parseResult.youtubeVideoId;
    if (youtubeVideoId && options.proportion) {

        getVideoProportion({
            videoId: youtubeVideoId,
            onVideo16x9: function() {
                windowOpen(options.width, options.height);
            },
            onVideo4x3: function() {
                windowOpen(getWidth4x3(options.height), options.height);
            }
        });

    }
    else {
        windowOpen(options.width, options.height);
    }

    function windowOpen(width, height) {

        var pos = getWindowPosition(width, height);
        var popupName = options.keepPopup ? 'floatingPlayer' : '';

        /*
        chrome.windows.create({
            url: popupUrl,
            width: pos.width,
            height: pos.height,
            top: pos.top,
            left: pos.left,
            type: 'popup'
        });
        */

        window.open(popupUrl, popupName, 'width=' + pos.width + ', height=' +
            pos.height + ', top=' + pos.top + ', left=' + pos.left);

        if (!fromContextMenu) {

            // Close the extension popup
            window.close();

            // Close current tab
            if (options.closeTab) {
                chrome.tabs.remove(tabId);
            }
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


function parseYouTube(url) {
    var popupUrl;
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


    if (url.host === 'youtu.be') {
        videoId = url.path.slice(1);
        isShortLink = true;
    }
    else {
        videoId = url.query.v || '';
        playlist = url.query.list;
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

        if (options.api) {
            popupUrl += '&enablejsapi=1&origin=' + encodeURL(getURL('').
                slice(0, -1));

            popupUrl = getURL('youtube.html?' + encodeURL(popupUrl));
        }
    }

    // YouTube video or playlist
    if (url.path === '/watch' || url.path === '/playlist' || isShortLink) {
        popupUrl = youtubeDomain + '/embed/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        if (playlist) {
            popupUrl += '&listType=playlist&list=' + encodeURL(playlist);
        }

        var time = videoTime ||
                   url.query.start ||
                   url.query.t ||
                   url.query.time_continue;

        if (time) {
            popupUrl += '&start=' + parseTime(time);
        }

        ytCommonParams();
    }

    // YouTube channel
    else if (matches = url.path.match(/^\/user\/([a-zA-Z0-9_-]+).*$/)) {
        var channel = matches[1];

        popupUrl = youtubeDomain + '/embed?listType=user_uploads&list=' +
            encodeURL(channel);

        ytCommonParams();
    }

    // YouTube search
    else if (url.path === '/results') {
        var search = url.query.search_query || url.query.q;

        // [BUG] YouTube search doesn't work with youtube-nocookie.com

        popupUrl = 'https://www.youtube.com/embed?listType=search&list=' +
            encodeURL(search);

        ytCommonParams();
    }

    return {
        youtubeVideoId: videoId,
        popupUrl: popupUrl
    };
}


function parseYouTubeAsTv(url) {
    var popupUrl = 'https://www.youtube.com/tv#/watch?';

    var videoId = url.query.v;
    if (videoId) {
        popupUrl += '&v=' + encodeURL(videoId);
    }

    var playlist = url.query.list;
    if (playlist) {
        popupUrl += '&list=' + encodeURL(playlist);
    }

    // [BUG] Video time doesn't work with list on YouTube TV
    var time = videoTime || url.query.t;
    if (time) {
        popupUrl += '&t=' + time;
    }

    return {
        youtubeVideoId: videoId,
        popupUrl: popupUrl
    };
}


function parseTwitch(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/([a-z0-9_]{1,25})$/i)) {
        var channel = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&channel=' + channel;

        if (!options.autoplay) {
            popupUrl += '&autoplay=false';
        }
    }

    else if ((matches = url.path.match(/^\/(?:[a-z0-9_]{1,25})\/p\/([0-9]+)$/i))
          || (matches = url.path.match(/^\/videos\/([0-9]+)$/i))) {
        var videoId = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&video=v' + videoId;

        if (!options.autoplay) {
            popupUrl += '&autoplay=false';
        }

        if (videoTime) {
            popupUrl += '&time=' + videoTime + 's';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseVimeo(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/([0-9]+)$/)) {
        var videoId = matches[1];
        popupUrl = 'https://player.vimeo.com/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        if (videoTime) {
            popupUrl += '#t=' + videoTime + 's';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseDailymotion(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/video\/([a-z0-9]+)/i)) {
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

    return {
        popupUrl: popupUrl
    };
}


function parseUstream(url) {
    var popupUrl;
    var matches;

    if ((matches = url.path.match(/\/recorded\/[0-9]+/i)) ||
        (matches = url.path.match(/\/channel\/.+/i))) {
        popupUrl = 'http://www.ustream.tv' + matches[0] + '/pop-out';
    }

    return {
        popupUrl: popupUrl
    };
}


function parseSmashcast(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/([a-z0-9]{3,25})$/i)) {
        var channel = matches[1];
        popupUrl = 'https://www.smashcast.tv/embed/' + channel + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=true';
        }
    }

    else if (matches = url.path.match(/^\/[a-z0-9]{3,25}\/videos\/([0-9]+)$/i)) {
        var videoId = matches[1];
        popupUrl = 'https://www.smashcast.tv/embed/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=true';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseFacebook(url) {
    var popupUrl;

    if (url.path.match(/^\/[a-z0-9_]+\/videos(\/vb\.[0-9]+)?\/[0-9]+/i)) {
        popupUrl = 'https://www.facebook.com/plugins/video.php?href=' +
            encodeURL(url.href);
    }

    return {
        popupUrl: popupUrl
    };
}


function parseInstagram(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/p\/[a-z0-9_-]+\/$/i)) {
        popupUrl = 'https://www.instagram.com' + matches[0] + 'embed';
    }

    return {
        popupUrl: popupUrl
    };
}


function parseTed(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/talks\/[a-z0-9_]+$/i)) {
        popupUrl = 'https://embed.ted.com' + matches[0];
    }

    return {
        popupUrl: popupUrl
    };
}


function parseYouku(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/id_(.+)(\.html)?/)) {
        popupUrl = 'http://player.youku.com/embed/' + matches[1];
    }

    return {
        popupUrl: popupUrl
    };
}


function parseVevo(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/[A-Z0-9]+/g)) {
        popupUrl = 'https://embed.vevo.com/?video=' + matches[0];

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseMetacafe(url) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/watch\/(.+)/)) {
        popupUrl = 'http://www.metacafe.com/embed/' + matches[1];
    }

    return {
        popupUrl: popupUrl
    };
}


// -----------------------------------------------------------------------------

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
}

else if (where === 'popup') {
    getTab(function(url, id) {
        tabId = id;
        pageUrl = url;
        fromContextMenu = false;

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
        window.open('https://github.com/gabrielbarros/floating-player');
    });

    onClick($instructions, function(e) {
        e.preventDefault();
        showInstructions();
    });

    onClick($seeHistory, function(e) {
        e.preventDefault();
        window.open(getURL('history.html'));
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

    var videoId;
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
        var videoData = player.getVideoData();
        videoId = videoData.video_id;
        videoTitle = videoData.title;
        videoList = videoData.list;

        if (event.data === YT.PlayerState.BUFFERING) {

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
        }
        else if (event.data === YT.PlayerState.PLAYING) {

            // Set video title
            setVideoTitle();

            // Set video quality
            player.setPlaybackQuality(options.quality);

            // Fix proportion of the next video in the playlist
            // Except if fullscreen
            var isFullscreen = window.innerWidth === screen.width;

            if (!isFullscreen && options.proportion) {
                function resizeWindow(width, height) {
                    var pos = getWindowPosition(width, height);

                    resizeTo(pos.width, pos.height);
                    moveTo(pos.left, pos.top);
                }

                getVideoProportion({
                    videoId: videoId,
                    onVideo16x9: function() {
                        resizeWindow(options.width, options.height);
                    },
                    onVideo4x3: function() {
                        resizeWindow(getWidth4x3(options.height), options.height);
                    }
                });
            }
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
                location.href = parseYouTubeAsTv(videoUrl).popupUrl;
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
