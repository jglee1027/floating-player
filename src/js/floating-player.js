var OS = {
    WINDOWS_XP: 5.1,
    WINDOWS_VISTA: 6,
    WINDOWS_7: 6.1,
    WINDOWS_8: 6.2,
    WINDOWS_8_1: 6.3,
    WINDOWS_10: 10,
    LINUX: 100,
    MACOS: 200,
    CHROME_OS: 300
};

var FORMAT = {
    F16X9: 1,
    F4X3: 2
};

var ALIGN = {
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_LEFT: 3,
    BOTTOM_RIGHT: 4,
    TOP_CENTER: 5,
    BOTTOM_CENTER: 6,
    LEFT_CENTER: 7,
    RIGHT_CENTER: 8,
    CENTER: 9
};

var OPTIONS_PREFIX = '@';

// Default options
var defaultOptions = {
    align: ALIGN.BOTTOM_RIGHT,
    width: 512,
    height: 288,
    horizontalMargin: 0,
    verticalMargin: 0,
    color: 'red',
    speed: 1,
    quality: 'auto',
    title: '%playlist% %title% - YouTube',
    volume: 100,
    embed: true,
    autoplay: true,
    chat: false,
    forceFullscreen: false,
    closeTab: false,
    noCookie: false,
    captions: true,
    annotations: true,
    related: false,
    controls: true,
    showInfo: true,
    fullscreenButton: true,
    ytLogo: true,
    keyboard: true,
    noclick: false,
    loop: false,
    proportion: true,
    youtubeApi: true,
    animateTitle: false,
    shuffle: false,
    pause: true,
    spoofReferrer: true,
    youtubeTvOnError: false,
    forceYoutubeTv: false,
    fixPopup: true,
    app: false,
    borderless: false,
    alwaysOnTop: true,
    helium: false,
    heliumPinTab: true,
    heliumVersion: 'helium',
    keepPopup: true,
    keepDimensions: false,
    context: true,
    history: false
};

// User options
var options = {};

// Context menu url or tab url
var pageUrl = null;

// Tab id
var tabId = null;

// Popup info
var popup = {
    url: null,
    windowId: null,
    tabId: null,
    pos: {
        top: null,
        left: null,
        width: null,
        height: null
    }
};

// Second popup info (for now only for YouTube/Twitch chat)
var popup2 = {
    url: null,
    pos: {
        top: null,
        left: null,
        width: null,
        height: null
    }
};

// Video info
var video = {
    time: 0,
    format: null,
    youtubeId: null,
    isYoutubeLive: false
};

var widthFix = 0;
var heightFix = 0;

var userOs;
var userOsClass;

var isFirefox = !!window.sidebar;

function setUserOS() {
    var regexWindows = /Windows NT ([0-9.]+)/i;
    var matches = navigator.userAgent.match(regexWindows);

    // Using Windows
    if (matches) {
        userOs = parseFloat(matches[1]);
        userOsClass = 'windows';
    }

    // Using Mac OS X
    else if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        userOs = OS.MACOS;
        userOsClass = 'mac';
    }

    // Using Chrome OS
    else if (/\bCrOS\b/.test(navigator.userAgent)) {
        userOs = OS.CHROME_OS;
        userOsClass = 'chromeos';
    }

    // Using Linux or other
    else {
        userOs = OS.LINUX;
        userOsClass = 'linux';
    }
}

function fixWindowDimensions() {
    if (isFirefox) {
        switch (userOs) {
            case OS.WINDOWS_XP:
                widthFix = 8;
                heightFix = 35;
                break;

            case OS.WINDOWS_VISTA:
                widthFix = 16;
                heightFix = 37;
                break;

            case OS.WINDOWS_7:
                widthFix = 16;
                heightFix = 39;
                break;

            case OS.WINDOWS_8:
            case OS.WINDOWS_8_1:
                widthFix = 18;
                heightFix = 41;
                break;

            case OS.WINDOWS_10:
                widthFix = 16;
                heightFix = 40;
                break;

            case OS.LINUX:
                heightFix = 1;
                break;

            case OS.MACOS:
                heightFix = 24;
                break;

            // No Firefox for ChromeOS
            // case OS.CHROME_OS:
        }
    }

    else {
        switch (userOs) {
            case OS.WINDOWS_XP:
            case OS.WINDOWS_VISTA:
                widthFix = 10;
                heightFix = 31;
                break;

            case OS.WINDOWS_7:
                widthFix = 10;
                heightFix = 29;
                break;

            case OS.WINDOWS_8:
            case OS.WINDOWS_8_1:
            case OS.WINDOWS_10:
                widthFix = 16;
                heightFix = 39;
                break;

            case OS.LINUX:
                // empty
                break;

            case OS.MACOS:
                heightFix = 22;
                break;

            case OS.CHROME_OS:
                heightFix = 33;
                break;
        }
    }
}

function getOption(name) {
    /* Ex.: b,true => Boolean(true)
     *      n,1000 => Number(1000)
     *      s,text => String("text")
     */
    var value = localStorage.getItem(OPTIONS_PREFIX + name);

    if (value === null) {
        return defaultOptions[name];
    }

    var type = value.charAt(0);
    value = value.substr(2);

    // Number
    if (type === 'n') {
        value = +value;
    }

    // Boolean
    else if (type === 'b') {
        value = (value === 'true') ? true : false;
    }

    return value;
}

function getAllOptions() {
    for (var i in defaultOptions) {
        if (defaultOptions.hasOwnProperty(i)) {
            options[i] = getOption(i);
        }
    }
}

function setOption(name, value) {
    if (value === defaultOptions[name]) {
        localStorage.removeItem(OPTIONS_PREFIX + name);
    }
    else {
        var valueWithType = (typeof value).charAt(0) + ':' + value;
        localStorage.setItem(OPTIONS_PREFIX + name, valueWithType);
    }

    options[name] = value;
}

function fromContextMenu() {
    return tabId === null;
}

function getPopup(callback) {
    var popupNotFound;

    if (popup.tabId === null) {
        popupNotFound = true;
        callback(popupNotFound);
    }

    else {
        chrome.tabs.get(popup.tabId, function() {
            popupNotFound = !!chrome.runtime.lastError;
            callback(popupNotFound);
        });
    }
}

function getPopupUrl() {
    return popup.url.toString();
}

function getVideoProportion(callback) {
    video.format = FORMAT.F16X9;

    // [BUG] All live streams are reported as 4:3 videos
    if (video.isYoutubeLive) {
        return callback();
    }

    var youtubeUrl = 'https://www.youtube.com/watch?v=' + video.youtubeId;
    var url = 'https://www.youtube.com/oembed?url=' + Url.encode(youtubeUrl);

    var xhr = new XMLHttpRequest();
    xhr.timeout = 5000;
    xhr.open('GET', url, true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    var originalWidth = response.width;
                    var originalHeight = response.height;
                    var proportion = originalWidth / originalHeight;
                    var is4x3 = proportion <= 1.4;

                    if (is4x3) {
                        video.format = FORMAT.F4X3;
                    }

                    callback();
                }
                catch(e) {
                    console.log('oEmbed parse error', xhr);
                    callback();
                }
            }
            else {
                console.log('oEmbed error', xhr);
                callback();
            }
        }
    };
    xhr.send();
}

function setPopupPosition() {
    var width = options.width;
    var height = options.height;

    var top;
    var left;

    if (video.format === FORMAT.F4X3) {
        width = Math.round((4 * height) / 3);
    }

    // Don't fix width/height if using app (https://goo.gl/QDERoA)
    if (options.fixPopup && !options.app) {
        width += widthFix;
        height += heightFix;
    }

    switch (options.align) {
        case ALIGN.TOP_LEFT:
            top = options.verticalMargin;
            left = options.horizontalMargin;
            break;

        case ALIGN.TOP_RIGHT:
            top = options.verticalMargin;
            left = screen.width - width - options.horizontalMargin;
            break;

        case ALIGN.BOTTOM_LEFT:
            top = screen.height - height - options.verticalMargin;
            left = options.horizontalMargin;
            break;

        case ALIGN.BOTTOM_RIGHT:
            top = screen.height - height - options.verticalMargin;
            left = screen.width - width - options.horizontalMargin;
            break;

        case ALIGN.TOP_CENTER:
            top = options.verticalMargin;
            left = (screen.width - width) / 2;
            break;

        case ALIGN.BOTTOM_CENTER:
            top = screen.height - height - options.verticalMargin;
            left = (screen.width - width) / 2;
            break;

        case ALIGN.LEFT_CENTER:
            top = (screen.height - height) / 2;
            left = options.horizontalMargin;
            break;

        case ALIGN.RIGHT_CENTER:
            top = (screen.height - height) / 2;
            left = screen.width - width - options.horizontalMargin;
            break;

        case ALIGN.CENTER:
            top = (screen.height - height) / 2;
            left = (screen.width - width) / 2;
            break;
    }

    popup.pos = {
        top: top,
        left: left,
        width: width,
        height: height
    };
}

function identifyPopupUrl() {
    popup.url = pageUrl;
    popup.url.query.floating_player = 1;

    popup2.url = null;

    if (!options.embed) {
        return;
    }

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
        case 'go.twitch.tv':
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

                pageUrl = new Url(pageUrl.query.url);
                identifyPopupUrl();
            }
    }
}

function setVideoTime(callback) {
    var opt = {
        file: 'js/inject.js'
    };

    chrome.tabs.executeScript(tabId, opt, function(result) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }

        if (Array.isArray(result)) {
            result[0] = result[0] || [];

            video.time = result[0][0] || 0;
            video.isYoutubeLive = result[0][1];
        }
        callback();
    });
}

function onExtensionClick() {
    getAllOptions();

    video.time = 0;
    video.format = FORMAT.F16X9;
    video.youtubeId = null;
    video.isYoutubeLive = false;

    if (options.history) {
        historyAdd(pageUrl.toString());
    }

    if (!fromContextMenu() && options.pause) {
        setVideoTime(function() {
            identifyPopupUrl();
            preparePopup();
        });
    }

    else {
        identifyPopupUrl();
        preparePopup();
    }
}

function preparePopup() {
    if (!fromContextMenu() && options.closeTab) {
        chrome.tabs.remove(tabId);
    }

    if (options.helium) {
        openHelium();
    }
    else if (video.youtubeId && options.proportion) {
        getVideoProportion(function() {
            createOrUpdatePopup();
        });
    }
    else {
        createOrUpdatePopup();
    }
}

function createOrUpdatePopup() {
    setPopupPosition();

    if (options.app && !options.forceFullscreen) {
        callExternalApp();
    }
    else if (options.keepPopup) {
        getPopup(function(popupNotFound) {
            if (popupNotFound) {
                createNewPopup();
            }
            else {
                updateCurrentPopup();
            }
        });
    }
    else {
        createNewPopup();
    }
}

function createNewPopup() {
    var opt;
    if (options.forceFullscreen) {
        opt = {
            url: getPopupUrl(),
            state: 'fullscreen'
        };
    }
    else {
        opt = {
            url: getPopupUrl(),
            width: popup.pos.width,
            height: popup.pos.height,
            top: popup.pos.top,
            left: popup.pos.left,
            type: 'popup'
        };

        if (!isFirefox) {
            opt.focused = true;
        }
    }

    chrome.windows.create(opt, function(windowInfo) {
        popup.tabId = windowInfo.tabs[0].id;
        popup.windowId = windowInfo.id;

        if (popup2.url) {
            createSecondPopup();
        }
    });
}

function createSecondPopup() {
    var distance = 5;

    var opt = {
        url: popup2.url.toString(),
        width: popup.pos.width,
        height: popup.pos.height,
        top: popup.pos.top,
        left: popup.pos.left - popup.pos.width - distance,
        type: 'popup'
    };

    if (opt.left < 0) {
        opt.left = popup.pos.left + popup.pos.width + distance;
    }

    if (!isFirefox) {
        opt.focused = false;
    }

    chrome.windows.create(opt);
}

function updateCurrentPopup() {
    chrome.tabs.update(popup.tabId, {
        url: getPopupUrl()
    });

    if (!options.forceFullscreen && !options.keepDimensions) {
        var opt = {
            // top: popup.pos.top, <-- // See below
            left: popup.pos.left,
            width: popup.pos.width,
            height: popup.pos.height
        };

        // [BUG] If top is set, the popup will be
        // under the taskbar on Windows and Mac OS
        if (userOs === OS.LINUX) {
            opt.top = popup.pos.top;
        }

        if (!isFirefox) {
            opt.focused = true;
        }

        chrome.windows.update(popup.windowId, opt);
    }
}

function callExternalApp() {
    var defaultAppId = 'neefhpglbgbkmlkgdgkfoofkcpbodbfb';
    var customAppId = localStorage.getItem('appid') || '';
    var appId;

    if (customAppId.match(/^[a-z]{32}$/)) {
        appId = customAppId;
    }
    else {
        appId = defaultAppId;
    }

    var opt = {
        url: getPopupUrl(),
        width: popup.pos.width,
        height: popup.pos.height,
        top: popup.pos.top,
        left: popup.pos.left,
        type: 'popup',
        borderless: options.borderless,
        alwaysOnTop: options.alwaysOnTop
    };

    chrome.runtime.sendMessage(appId, opt);
}

function openHelium() {
    var heliumUrl;

    if (options.heliumVersion === 'helium') {
        heliumUrl = 'helium://' + popup.url;
    }
    else {
        heliumUrl = 'heliumlift://openURL=' + popup.url;
    }

    chrome.tabs.create({
        url: heliumUrl,
        pinned: options.heliumPinTab,
        active: false
    }, function(tab) {
        setTimeout(function() {
            chrome.tabs.remove(tab.id);
        }, 3000);
    });
}

function parseTime(time) {
    var regexTime = /^(?:([0-9]+)h)?(?:([0-9]+)m)?(?:([0-9]+)s?)?$/;
    var matches = ('' + time).match(regexTime) || [];

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
    var regexChannel = /^\/user\/([a-zA-Z0-9_-]+).*$/;
    var youtubeDomain;

    var playlist;
    var isShortLink;

    if (options.noCookie) {
        youtubeDomain = 'https://www.youtube-nocookie.com';
    }
    else {
        youtubeDomain = 'https://www.youtube.com';
    }


    if (pageUrl.host === 'youtu.be') {
        video.youtubeId = pageUrl.path.slice(1);
        isShortLink = true;
    }
    else {
        video.youtubeId = pageUrl.query.v || '';
        playlist = pageUrl.query.list;
    }


    function ytCommonParams() {
        if (!options.related) {
            popup.url.query.rel = '0';
        }

        if (options.captions) {
            popup.url.query.cc_load_policy = '1';
        }

        var annotations = options.annotations ? '1' : '3';
        popup.url.query.iv_load_policy = annotations;

        if (!options.controls) {
            popup.url.query.controls = '0';
        }

        if (!options.showInfo) {
            popup.url.query.showinfo = '0';
        }

        if (options.loop && playlist) {
            popup.url.query.loop = '1';
        }

        if (!options.fullscreenButton) {
            popup.url.query.fs = '0';
        }

        if (!options.ytLogo) {
            popup.url.query.modestbranding = '1';
        }

        if (!options.keyboard) {
            popup.url.query.disablekb = '1';
        }

        if (options.color === 'white') {
            popup.url.query.color = 'white';
        }

        if (options.youtubeApi && !options.helium && !options.app) {
            popup.url.query.enablejsapi = '1';
            popup.url.query.origin = getExtensionUrl('').slice(0, -1);

            var currentPopupUrl = getPopupUrl();

            popup.url = new Url(getExtensionUrl('youtube.html'));
            popup.url.query.url = currentPopupUrl;
        }
    }

    // YouTube video or playlist
    if (pageUrl.path === '/watch' || pageUrl.path === '/playlist' || isShortLink) {
        popup.url = new Url(youtubeDomain + '/embed/' + video.youtubeId);

        if (options.autoplay) {
            popup.url.query.autoplay = '1';
        }

        if (playlist) {
            popup.url.query.listType = 'playlist';
            popup.url.query.list = playlist;
        }

        var time = video.time ||
                   pageUrl.query.start ||
                   pageUrl.query.t ||
                   pageUrl.query.time_continue;

        if (time) {
            popup.url.query.start = parseTime(time);
        }

        if (video.isYoutubeLive && options.chat) {
            // [BUG] YouTube chat doesn't work with youtube-nocookie.com
            popup2.url = new Url('https://www.youtube.com/live_chat');
            popup2.url.query.is_popout = '1';
            popup2.url.query.v = video.youtubeId;
        }

        ytCommonParams();
    }

    // YouTube channel
    else if ((matches = pageUrl.path.match(regexChannel))) {
        var channel = matches[1];

        popup.url = new Url(youtubeDomain + '/embed');
        popup.url.query.listType = 'user_uploads';
        popup.url.query.list = channel;

        ytCommonParams();
    }

    // YouTube search
    else if (pageUrl.path === '/results') {
        var search = pageUrl.query.search_query || pageUrl.query.q;

        // [BUG] YouTube search doesn't work with youtube-nocookie.com
        popup.url = new Url('https://www.youtube.com/embed');
        popup.url.query.listType = 'search';
        popup.url.query.list = search;

        ytCommonParams();
    }
}

function parseYouTubeAsTv() {
    var playlist;

    popup.url = new Url('https://www.youtube.com/tv');
    popup.url.hash = '#/watch?';

    if (pageUrl.host === 'youtu.be') {
        video.youtubeId = pageUrl.path.slice(1);
    }
    else {
        video.youtubeId = pageUrl.query.v || '';
        playlist = pageUrl.query.list;
    }

    if (video.youtubeId) {
        popup.url.hash += '&v=' + Url.encode(video.youtubeId);
    }

    if (playlist) {
        popup.url.hash += '&list=' + Url.encode(playlist);
    }

    // [BUG] Video time doesn't work with list on YouTube TV
    var time = video.time ||
               pageUrl.query.start ||
               pageUrl.query.t ||
               pageUrl.query.time_continue;

    if (time) {
        popup.url.hash += '&t=' + parseTime(time);
    }
}

function parseTwitch() {
    var matches;

    var regexChannel = /^\/([a-z0-9_]{1,25})$/i;
    var regexOldVideo = /^\/(?:[a-z0-9_]{1,25})\/p\/([0-9]+)$/i;
    var regexVideo = /^\/videos\/([0-9]+)$/i;

    var volume = options.volume / 100;

    if ((matches = pageUrl.path.match(regexChannel))) {
        var channel = matches[1];

        popup.url = new Url('https://player.twitch.tv');
        popup.url.query.volume = volume;
        popup.url.query.channel = channel;

        if (!options.autoplay) {
            popup.url.query.autoplay = 'false';
        }

        if (options.chat) {
            popup2.url = new Url('https://www.twitch.tv/popout/' +
                channel + '/chat');
        }
    }

    else if ((matches = pageUrl.path.match(regexOldVideo)) ||
        (matches = pageUrl.path.match(regexVideo))) {

        var videoId = matches[1];

        popup.url = new Url('https://player.twitch.tv');
        popup.url.query.volume = volume;
        popup.url.query.video = 'v' + videoId;

        if (!options.autoplay) {
            popup.url.query.autoplay = 'false';
        }

        if (video.time) {
            popup.url.query.time = video.time + 's';
        }
    }
}

function parseVimeo() {
    var matches;
    var regexVideo = /^\/([0-9]+)$/;

    if ((matches = pageUrl.path.match(regexVideo))) {
        var videoId = matches[1];
        popup.url = new Url('https://player.vimeo.com/video/' + videoId);

        if (options.autoplay) {
            popup.url.query.autoplay = '1';
        }

        if (video.time) {
            popup.url.hash = '#t=' + video.time + 's';
        }
    }
}

function parseDailymotion() {
    var matches;
    var regexVideo = /^\/video\/([a-z0-9]+)/i;

    if ((matches = pageUrl.path.match(regexVideo))) {
        var videoId = matches[1];
        popup.url = new Url('http://www.dailymotion.com/embed/video/' + videoId);

        if (options.autoplay) {
            popup.url.query.autoplay = '1';
        }

        if (!options.controls) {
            popup.url.query.controls = '0';
        }

        if (!options.related) {
            popup.url.query['endscreen-enable'] = '0';
        }

        if (video.time) {
            popup.url.query.start = video.time;
        }
    }
}

function parseUstream() {
    var matches;
    var regexRecorded = /\/recorded\/[0-9]+/i;
    var regexChannel = /\/channel\/.+/i;

    if ((matches = pageUrl.path.match(regexRecorded)) ||
        (matches = pageUrl.path.match(regexChannel))) {
        popup.url = new Url('http://www.ustream.tv' + matches[0] + '/pop-out');
    }
}

function parseSmashcast() {
    var matches;
    var regexChannel = /^\/([a-z0-9]{3,25})$/i;
    var regexVideo = /^\/[a-z0-9]{3,25}\/videos\/([0-9]+)$/i;

    if ((matches = pageUrl.path.match(regexChannel))) {
        var channel = matches[1];
        popup.url = new Url('https://www.smashcast.tv/embed/' + channel);

        if (options.autoplay) {
            popup.url.query.autoplay = 'true';
        }
    }

    else if ((matches = pageUrl.path.match(regexVideo))) {
        var videoId = matches[1];
        popup.url = new Url('https://www.smashcast.tv/embed/video/' + videoId);

        if (options.autoplay) {
            popup.url.query.autoplay = 'true';
        }
    }
}

function parseFacebook() {
    var regexVideo = /^\/[a-z0-9_]+\/videos(\/vb\.[0-9]+)?\/[0-9]+/i;

    if (pageUrl.path.match(regexVideo)) {
        popup.url = new Url('https://www.facebook.com/plugins/video.php');
        popup.url.query.href = pageUrl.toString();

        if (options.autoplay) {
            popup.url.query.autoplay = '1';
        }
    }
}

function parseInstagram() {
    var matches;
    var regexVideo = /^\/p\/[a-z0-9_-]+\/$/i;

    if ((matches = pageUrl.path.match(regexVideo))) {
        popup.url = new Url('https://www.instagram.com' + matches[0] + 'embed');
    }
}

function parseTed() {
    var matches;
    var regexVideo = /^\/talks\/[a-z0-9_]+$/i;

    if ((matches = pageUrl.path.match(regexVideo))) {
        popup.url = new Url('https://embed.ted.com' + matches[0]);
    }
}

function parseYouku() {
    var matches;
    var regexVideo = /id_([a-z0-9==]+)/i;

    if ((matches = pageUrl.path.match(regexVideo))) {
        popup.url = new Url('http://player.youku.com/embed/' + matches[1]);
    }
}

function parseVevo() {
    var matches;
    var regexVideo = /[A-Z0-9]+/g;

    if ((matches = pageUrl.path.match(regexVideo))) {
        popup.url = new Url('https://embed.vevo.com');
        popup.url.query.video = matches[0];

        if (options.autoplay) {
            popup.url.query.autoplay = '1';
        }
    }
}

function parseMetacafe() {
    var matches;
    var regexVideo = /watch\/(.+)/;

    if ((matches = pageUrl.path.match(regexVideo))) {
        popup.url = new Url('http://www.metacafe.com/embed/' + matches[1]);
    }
}

function parsePocket() {
    if (pageUrl.path === '/redirect' && pageUrl.query.url) {
        pageUrl = new Url(pageUrl.query.url);
        identifyPopupUrl();
    }
}


setUserOS();
fixWindowDimensions();
getAllOptions();
document.body.classList.add('os-' + userOsClass);
