(function(window, document, chrome, screen, navigator, localStorage) {
'use strict';

var encodeURL = encodeURIComponent;
var decodeURL = decodeURIComponent;

var TOP_LEFT = 1;
var TOP_RIGHT = 2;
var BOTTOM_LEFT = 3;
var BOTTOM_RIGHT = 4;

var COLOR_RED = 1;
var COLOR_WHITE = 2;

var options;

var defaultOptions = {
    align: BOTTOM_RIGHT,
    width16x9: 512,
    height16x9: 288,
    width4x3: 384,
    height4x3: 288,
    hmargin: 0,
    vmargin: 0,
    color: COLOR_RED,
    embed: true,
    autoplay: true,
    noCookie: false,
    captions: true,
    annotations: true,
    related: false,
    controls: true,
    showInfo: true,
    proportion: true,
    api: true,
    playlistCounter: true,
    pause: true,
    youtubeTvOnError: true,
    fix: true,
    keepPopup: true,
    context: true
};

var LOCALSTORAGE_PREFIX = '_';

var WIDTH_FIX = 0;
var HEIGHT_FIX = 0;

var WINDOWS_XP = 5.1;
var WINDOWS_VISTA = 6;
var WINDOWS_7 = 6.1;
var WINDOWS_8 = 6.2;
var WINDOWS_8_1 = 6.3;
var WINDOWS_10 = 10;

var windowsVersion = parseFloat(
    (navigator.userAgent.match(/Windows NT ([0-9.]+)/i) || [])[1]
);

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
    return +value;
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

function showSourceCode() {
    window.open('https://github.com/gabrielbarros/floating-player');
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
        var contextMenu = true;
        preparePopup(info.linkUrl, contextMenu);
    });
}

function removeContextMenu() {
    chrome.contextMenus.removeAll();
}

function preparePopup(url, fromContextMenu, tabId) {
    options = getAllOptions();

    if (!fromContextMenu && options.pause) {
        // Get video time (see content.js)
        chrome.tabs.sendMessage(tabId, '', function(videoTime) {
            showPopup(url, fromContextMenu, videoTime);
        });
    }
    else {
        showPopup(url, fromContextMenu);
    }
}

function showPopup(url, fromContextMenu, videoTime) {

    url = parseUrl(url);
    var popupUrl = url.href;
    var parseResult = {};

    if (options.embed) {

        switch (url.host) {
            case 'www.youtube.com':
                parseResult = parseYouTube(url, videoTime);
                break;

            case 'www.twitch.tv':
                parseResult = parseTwitch(url, videoTime);
                break;

            case 'vimeo.com':
                parseResult = parseVimeo(url, videoTime);
                break;

            case 'www.dailymotion.com':
                parseResult = parseDailymotion(url, videoTime);
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
                windowOpen(options.width16x9, options.height16x9);
            },
            onVideo4x3: function() {
                windowOpen(options.width4x3, options.height4x3);
            }
        });

    }
    else {
        windowOpen(options.width16x9, options.height16x9);
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
            window.close();
        }
    }
}



function parseYouTube(url, videoTime) {
    var popupUrl;
    var videoId;
    var matches;
    var youtubeDomain;

    if (options.noCookie) {
        youtubeDomain = 'https://www.youtube-nocookie.com';
    }
    else {
        youtubeDomain = 'https://www.youtube.com';
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
    if (url.path === '/watch' || url.path === '/playlist') {
        videoId = url.query.v || '';

        popupUrl = youtubeDomain + '/embed/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoplay=1';
        }

        var playlist = url.query.list;
        if (playlist) {
            popupUrl += '&listType=playlist&list=' + encodeURL(playlist);
        }

        if (videoTime) {
            popupUrl += '&start=' + videoTime;
        }

        ytCommonParams();
    }

    // YouTube channel
    else if (matches = url.path.match(/^\/user\/([a-zA-Z0-9_-]+).*$/)) {
        var channel = matches[1];

        popupUrl = youtubeDomain + '/embed?listType=user_uploads&list=' +
            encodeURL(channel) + '&';

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


function parseTwitch(url, videoTime) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/([a-z0-9_]{1,25})$/i)) {
        var channel = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&channel=' + channel;
    }

    else if ((matches = url.path.match(/^\/(?:[a-z0-9_]{1,25})\/p\/([0-9]+)$/i))
          || (matches = url.path.match(/^\/videos\/([0-9]+)$/i))) {
        var videoId = matches[1];
        popupUrl = 'https://player.twitch.tv/?volume=0.5&video=v' + videoId;

        if (videoTime) {
            popupUrl += '&time=' + videoTime + 's';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseVimeo(url, videoTime) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/([0-9]+)$/)) {
        var videoId = matches[1];
        popupUrl = 'https://player.vimeo.com/video/' + videoId;

        if (videoTime) {
            popupUrl += '#t=' + videoTime + 's';
        }
    }

    return {
        popupUrl: popupUrl
    };
}


function parseDailymotion(url, videoTime) {
    var popupUrl;
    var matches;

    if (matches = url.path.match(/^\/video\/([a-z0-9]+)/i)) {
        var videoId = matches[1];
        popupUrl = 'http://www.dailymotion.com/embed/video/' + videoId + '?';

        if (options.autoplay) {
            popupUrl += '&autoPlay=1';
        }

        if (videoTime) {
            popupUrl += '&start=' + videoTime;
        }
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
        popupUrl = 'http://www.smashcast.tv/embed/' + channel;
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

    if (matches = url.path.match(/id_(.+)\.html/)) {
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
        popupUrl = 'http://cache.vevo.com/assets/html/embed.html?video=' + matches[0];
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
}

else if (where === 'popup') {
    getTab(function(tabUrl, tabId) {
        var contextMenu = false;
        preparePopup(tabUrl, contextMenu, tabId);
    });
}

else if (where === 'options') {
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

    // Translation strings
    var strOptions = getText('options');
    setHtml($$('title'), strOptions);
    setHtml($$('h1'), strOptions);
    setHtml($$('label[for="align"]'), '@align');


    var $option = $$$('option');
    setHtml($option[0], '@top_left');
    setHtml($option[1], '@top_right');
    setHtml($option[2], '@bottom_left');
    setHtml($option[3], '@bottom_right');

    setHtml($$('label[for="width16x9"]'), '@default_size');
    setHtml($$('label[for="width4x3"]'), '@size_4x3');
    setHtml($$('label[for="horizontal-margin"]'), '@horizontal_margin');
    setHtml($$('label[for="vertical-margin"]'), '@vertical_margin');
    setHtml($$('label[for="embed"]'), '@embed');
    setHtml($$('label[for="autoplay"]'), '@autoplay');
    setHtml($$('label[for="no-cookie"]'), '@no_cookie');
    setHtml($$('label[for="captions"]'), '@captions');
    setHtml($$('label[for="annotations"]'), '@annotations');
    setHtml($$('label[for="related"]'), '@related');
    setHtml($$('label[for="controls"]'), '@controls');
    setHtml($$('label[for="show-info"]'), '@show_info');
    setHtml($$('label[for="color"]'), '@color');
    setHtml($option[4], '@red');
    setHtml($option[5], '@white');

    setHtml($$('label[for="proportion"]'), '@proportion');
    setHtml($$('label[for="api"]'), '@api');
    setHtml($$('label[for="playlist-counter"]'), '@playlist_counter');
    setHtml($$('label[for="pause"]'), '@pause');
    setHtml($$('label[for="youtube-tv-on-error"]'), '@youtube_tv_on_error');
    setHtml($$('label[for="fix"]'), '@fix');
    setHtml($$('label[for="keep-popup"]'), '@keep_popup');
    setHtml($$('label[for="use-context"]'), '@use_context');

    var $defaultConfig = $('default-config');
    setHtml($defaultConfig, '@default');

    var $sourceCode = $('source-code');
    setHtml($sourceCode, '@source_code');

    var $instructions = $('instructions');
    setHtml($instructions, '@instructions');
    // End Translation strings


    options = getAllOptions();

    var $align = $('align');
    $align.value = options.align;
    onChange($align, function() {
        setOption('align', this.value);
    });

    var $width16x9 = $('width16x9');
    $width16x9.value = options.width16x9;
    onInput($width16x9, function() {
        setOption('width16x9', this.value);
    });

    var $height16x9 = $('height16x9');
    $height16x9.value = options.height16x9;
    onInput($height16x9, function() {
        setOption('height16x9', this.value);
    });

    var $width4x3 = $('width4x3');
    $width4x3.value = options.width4x3;
    onInput($width4x3, function() {
        setOption('width4x3', this.value);
    });

    var $height4x3 = $('height4x3');
    $height4x3.value = options.height4x3;
    onInput($height4x3, function() {
        setOption('height4x3', this.value);
    });

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

    var $color = $('color');
    $color.value = options.color;
    onChange($color, function() {
        setOption('color', this.value);
    });

    var $proportion = $('proportion');
    $proportion.checked = options.proportion;
    onChange($proportion, function() {
        setOption('proportion', this.checked);
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

    onClick($defaultConfig, function(e) {
        e.preventDefault();

        if (!options.context) {
            addContextMenu();
        }

        if (confirm(getText('u_sure'))) {
            for (var i in localStorage) {
                if (i !== 'ok') {
                    localStorage.removeItem(i);
                }
            }
            location.reload();
        }
    });

    onClick($sourceCode, function(e) {
        e.preventDefault();
        showSourceCode();
    });

    onClick($instructions, function(e) {
        e.preventDefault();
        showInstructions();
    });

    var strRecommended = getText('recommended');
    var $recommended = $$$('.recommended');
    setHtml($recommended[0], strRecommended);
    setHtml($recommended[1], strRecommended);

    var $recommendedResolutions16x9 = $('recommended-resolutions16x9');
    var $recommendedResolutions4x3 = $('recommended-resolutions4x3');

    /*
    Algorithm to generate "perfect" resolutions:

    var width;
    var height;

    for (var i = 100; i < 1024; i++) {
        width = i;
        height = (width * 9) / 16;

        if (height % 1 === 0) {
            console.log(width + 'x' + height);
        }
    }
    */

    onClick($recommendedResolutions16x9, function(e) {
        var $target = e.target;
        var resolution;
        var width;
        var height;

        e.preventDefault();

        if ($target.href) {
            resolution = $target.innerHTML.split('x');
            width = resolution[0];
            height = resolution[1];

            $width16x9.value = width;
            $height16x9.value = height;

            setOption('width16x9', width);
            setOption('height16x9', height);
        }
    });

    onClick($recommendedResolutions4x3, function(e) {
        var $target = e.target;
        var resolution;
        var width;
        var height;

        e.preventDefault();

        if ($target.href) {
            resolution = $target.innerHTML.split('x');
            width = resolution[0];
            height = resolution[1];

            $width4x3.value = width;
            $height4x3.value = height;

            setOption('width4x3', width);
            setOption('height4x3', height);
        }
    });
}

else if (where === 'youtube') {

    var player;
    var playerId = 'player';
    var videoData;
    options = getAllOptions();

    function onYouTubeIframeAPIReady() {
        player = new YT.Player(playerId, {
            /*
            height: '360',
            width: '640',
            videoId: 'OPHLENt_Hpw',
            playerVars: {
                list: 'PLEFFEEFD2F395B896',
                autoplay: 1,
                rel: 0
            },
            */
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
    }

    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {

            // Set video title
            videoData = player.getVideoData();
            setVideoTitle();

            // Fix proportion of the next video in the playlist
            if (options.proportion) {
                var videoId = videoData.video_id;

                function resizeWindow(width, height) {
                    var pos = getWindowPosition(width, height);

                    resizeTo(pos.width, pos.height);
                    moveTo(pos.left, pos.top);
                }

                getVideoProportion({
                    videoId: videoId,
                    onVideo16x9: function() {
                        resizeWindow(options.width16x9, options.height16x9);
                    },
                    onVideo4x3: function() {
                        resizeWindow(options.width4x3, options.height4x3);
                    }
                });
            }
        }
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
        if (videoData.title) {
            title = playlistTitle + videoData.title + ' - YouTube';
        }
        else {
            title = 'YouTube';
        }
        document.title = title;
    }


    function onPlayerError(event) {
        var BLOCKED_BY_OWNER = 101;
        var BLOCKED_BY_OWNER_IN_DISGUISE = 150;

        if (event.data === BLOCKED_BY_OWNER ||
            event.data === BLOCKED_BY_OWNER_IN_DISGUISE) {

            var videoUrl = player.getVideoUrl();

            if (options.youtubeTvOnError) {
                var youtubeTvUrl = 'https://www.youtube.com/tv#/watch/video/control?';
                var query = parseUrl(videoUrl).query;

                youtubeTvUrl += 'v=' + query.v;

                if (query.t) {
                    youtubeTvUrl += '&t=' + query.t;
                }

                location.href = youtubeTvUrl;
            }
            else if (confirm(getText('cannot_play'))) {
                location.href = videoUrl;
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

})(window, document, chrome, screen, navigator, localStorage);
