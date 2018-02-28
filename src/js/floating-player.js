var os = {
    windowsXp: 5.1,
    windowsVista: 6,
    windows7: 6.1,
    windows8: 6.2,
    windows8_1: 6.3,
    windows10: 10,
    linux: 100,
    macOs: 200,
    chromeOs: 300
};

var format = {
    f16x9: 1,
    f4x3: 2
};

var align = {
    top_left: 1,
    top_right: 2,
    bottom_left: 3,
    bottom_right: 4,
    top_center: 5,
    bottom_center: 6,
    left_center: 7,
    right_center: 8,
    center: 9
};



var LOCALSTORAGE_PREFIX = '@';

// Default options
var defaultOptions = {
    align: align.bottom_right,
    width: 512,
    height: 288,
    horizontalMargin: 0,
    verticalMargin: 0,
    color: 'red',
    speed: 1,
    quality: 'auto',
    volume: 100,
    title: '%playlist% %title% - YouTube',
    embed: true,
    autoplay: true,
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

// Video info
var video = {
    time: 0,
    format: null,
    youtubeId: null
};

var widthFix = 0;
var heightFix = 0;

var userOS;
var userOSclass;

var isFirefox = !!window.sidebar;

function setUserOS() {
    var regexWindows = /Windows NT ([0-9.]+)/i;
    var matches = navigator.userAgent.match(regexWindows);

    // Using Windows
    if (matches) {
        userOS = parseFloat(matches[1]);
        userOSclass = 'windows';
    }

    // Using Mac OS X
    else if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        userOS = os.macOs;
        userOSclass = 'mac';
    }

    // Using Chrome OS
    else if (/\bCrOS\b/.test(navigator.userAgent)) {
        userOS = os.chromeOs;
        userOSclass = 'chromeos';
    }

    // Using Linux or other
    else {
        userOS = os.linux;
        userOSclass = 'linux';
    }
}

function fixWindowDimensions() {
    if (isFirefox) {
        switch (userOS) {
            case os.windowsXp:
                widthFix = 8;
                heightFix = 35;
                break;

            case os.windowsVista:
                widthFix = 16;
                heightFix = 37;
                break;

            case os.windows7:
                widthFix = 16;
                heightFix = 39;
                break;

            case os.windows8:
            case os.windows8_1:
                widthFix = 18;
                heightFix = 41;
                break;

            case os.windows10:
                widthFix = 16;
                heightFix = 40;
                break;

            case os.linux:
                heightFix = 1;
                break;

            case os.macOs:
                heightFix = 24;
                break;

            // No Firefox for ChromeOS
            // case os.chromeOs:
        }
    }

    else {
        switch (userOS) {
            case os.windowsXp:
            case os.windowsVista:
                widthFix = 10;
                heightFix = 31;
                break;

            case os.windows7:
                widthFix = 10;
                heightFix = 29;
                break;

            case os.windows8:
            case os.windows8_1:
            case os.windows10:
                widthFix = 16;
                heightFix = 39;
                break;

            case os.linux:
                // empty
                break;

            case os.macOs:
                heightFix = 22;
                break;

            case os.chromeOs:
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
    var value = localStorage.getItem(LOCALSTORAGE_PREFIX + name);

    if (value === null) {
        return defaultOptions[name];
    }

    var type = value.charAt(0);
    value = value.substr(2);

    // Number
    if (type === 'n') {
        value = Number(value);
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
    var valueWithType = (typeof value).charAt(0) + ':' + value;
    localStorage.setItem(LOCALSTORAGE_PREFIX + name, valueWithType);
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
    video.format = format.f16x9;

    var youtubeUrl = 'https://www.youtube.com/watch?v=' + video.youtubeId;
    var url = 'https://www.youtube.com/oembed?url=' + Url.encodeUri(youtubeUrl);

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
                        video.format = format.f4x3;
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

    if (video.format === format.f4x3) {
        width = Math.round((4 * height) / 3);
    }

    // Don't fix width/height if using app (https://goo.gl/QDERoA)
    if (options.fixPopup && !options.app) {
        width += widthFix;
        height += heightFix;
    }

    switch (options.align) {
        case align.top_left:
            top = options.verticalMargin;
            left = options.horizontalMargin;
            break;

        case align.top_right:
            top = options.verticalMargin;
            left = screen.width - width - options.horizontalMargin;
            break;

        case align.bottom_left:
            top = screen.height - height - options.verticalMargin;
            left = options.horizontalMargin;
            break;

        case align.bottom_right:
            top = screen.height - height - options.verticalMargin;
            left = screen.width - width - options.horizontalMargin;
            break;

        case align.top_center:
            top = options.verticalMargin;
            left = (screen.width - width) / 2;
            break;

        case align.bottom_center:
            top = screen.height - height - options.verticalMargin;
            left = (screen.width - width) / 2;
            break;

        case align.left_center:
            top = (screen.height - height) / 2;
            left = options.horizontalMargin;
            break;

        case align.right_center:
            top = (screen.height - height) / 2;
            left = screen.width - width - options.horizontalMargin;
            break;

        case align.center:
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

function identifyPopupUrlFromHosts() {
    popup.url = pageUrl;
    popup.url.query.floating_player = 1;

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
                identifyPopupUrlFromHosts();
            }
    }
}

function setVideoTime(callback) {
    var opt = {
        file: 'js/inject.js'
    };

    chrome.tabs.executeScript(tabId, opt, function(time) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }

        if (Array.isArray(time) && typeof time[0] === 'number') {
            video.time = time[0];
        }
        callback();
    });
}

function onExtensionClick() {
    getAllOptions();

    video.time = 0;
    video.format = format.f16x9;
    video.youtubeId = null;

    if (options.history) {
        historyAdd(pageUrl.toString());
    }

    if (!fromContextMenu() && options.pause) {
        setVideoTime(function() {
            identifyPopupUrlFromHosts();
            preparePopup();
        });
    }

    else {
        identifyPopupUrlFromHosts();
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
    });
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
        if (userOS === os.linux) {
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
        popup.url.hash += '&v=' + Url.encodeUri(video.youtubeId);
    }

    if (playlist) {
        popup.url.hash += '&list=' + Url.encodeUri(playlist);
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
        identifyPopupUrlFromHosts();
    }
}


setUserOS();
fixWindowDimensions();
getAllOptions();
