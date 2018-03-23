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

setHtml($$('label[for="color"]'), '@color');
setHtml($option[9], '@red');
setHtml($option[10], '@white');

setHtml($$('label[for="speed"]'), '@speed');
setHtml($option[14], '@normal');

setHtml($$('label[for="quality"]'), '@quality');
setHtml($$('label[for="title"]'), '@title');
setHtml($$('label[for="volume"]'), '@volume');
setHtml($$('label[for="embed"]'), '@embed');
setHtml($$('label[for="autoplay"]'), '@autoplay');
setHtml($$('label[for="chat"]'), '@chat');
setHtml($$('label[for="force-fullscreen"]'), '@force_fullscreen');
setHtml($$('label[for="close-tab"]'), '@close_tab');
setHtml($$('label[for="no-cookie"]'), '@no_cookie');
setHtml($$('label[for="captions"]'), '@captions');
setHtml($$('label[for="annotations"]'), '@annotations');
setHtml($$('label[for="related"]'), '@related');
setHtml($$('label[for="controls"]'), '@controls');
setHtml($$('label[for="show-info"]'), '@show_info');
setHtml($$('label[for="fullscreen-button"]'), '@fullscreen_button');
setHtml($$('label[for="yt-logo"]'), '@yt_logo');
setHtml($$('label[for="keyboard"]'), '@keyboard');
setHtml($$('label[for="noclick"]'), '@noclick');
setHtml($$('label[for="loop"]'), '@loop');
setHtml($$('label[for="proportion"]'), '@proportion');
setHtml($$('label[for="youtube-api"]'), '@youtube_api');
setHtml($$('label[for="animate-title"]'), '@animate_title');
setHtml($$('label[for="shuffle"]'), '@shuffle');
setHtml($$('label[for="pause"]'), '@pause');
setHtml($$('label[for="spoof-referrer"]'), '@spoof_referrer');
setHtml($$('label[for="youtube-tv-on-error"]'), '@youtube_tv_on_error');
setHtml($$('label[for="force-youtube-tv"]'), '@force_youtube_tv');
setHtml($$('label[for="fix-popup"]'), '@fix_popup');
setHtml($$('label[for="app"]'), '@app');
setHtml($$('label[for="borderless"]'), '@borderless');
setHtml($$('label[for="always-on-top"]'), '@always_on_top');
setHtml($$('label[for="helium"]'), '@helium');
setHtml($$('label[for="helium-pin-tab"]'), '@helium_pin_tab');
setHtml($$('label[for="helium-version"]'), '@helium_version');
setHtml($$('label[for="keep-popup"]'), '@keep_popup');
setHtml($$('label[for="keep-dimensions"]'), '@keep_dimensions');
setHtml($$('label[for="use-context"]'), '@use_context');
setHtml($$('label[for="enable-history"]'), '@enable_history');

setHtml($('requires-api'), '@requires_api');

var $defaultConfig = $('default-config');
setHtml($defaultConfig, '@default');

var $sourceCode = $('source-code');
setHtml($sourceCode, '@source_code');

var $seeHistory = $('see-history');
setHtml($seeHistory, '@history');
// End Translation strings



var $align = $('align');
$align.value = options.align;
onChange($align, function() {
    setOption('align', +this.value);
});

var $width = $('width');
var $height = $('height');

$width.value = options.width;
onInput($width, function() {
    setOption('width', +this.value);
    highlightResolution(this.value, $height.value);
});

$height.value = options.height;
onInput($height, function() {
    setOption('height', +this.value);
    highlightResolution($width.value, this.value);
});

highlightResolution($width.value, $height.value);

var $horizontalMargin = $('horizontal-margin');
$horizontalMargin.value = options.horizontalMargin;
onInput($horizontalMargin, function() {
    setOption('horizontalMargin', +this.value);
});

var $verticalMargin = $('vertical-margin');
$verticalMargin.value = options.verticalMargin;
onInput($verticalMargin, function() {
    setOption('verticalMargin', +this.value);
});

var $color = $('color');
$color.value = options.color;
onChange($color, function() {
    setOption('color', this.value);
});

var $speed = $('speed');
$speed.value = options.speed;
onChange($speed, function() {
    setOption('speed', +this.value);
});

var $quality = $('quality');
$quality.value = options.quality;
onChange($quality, function() {
    setOption('quality', this.value);
});

var $title = $('title');
$title.value = options.title;
onInput($title, function() {
    setOption('title', this.value);
});

var $volume = $('volume');
var $currentVolume = $('current-volume');
$volume.value = options.volume;
$currentVolume.innerText = options.volume;
onInput($volume, function() {
    setOption('volume', +this.value);
    $currentVolume.innerText = this.value;
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

var $chat = $('chat');
$chat.checked = options.chat;
onChange($chat, function() {
    setOption('chat', this.checked);
});

var $forceFullscreen = $('force-fullscreen');
$forceFullscreen.checked = options.forceFullscreen;
onChange($forceFullscreen, function() {
    setOption('forceFullscreen', this.checked);
});

var $closeTab = $('close-tab');
$closeTab.checked = options.closeTab;
onChange($closeTab, function() {
    setOption('closeTab', this.checked);
});

var $noCookie = $('no-cookie');
$noCookie.checked = options.noCookie;
onChange($noCookie, function() {

    var $this = this;
    var isChecked = $this.checked;

    if (isChecked) {
        chrome.permissions.request({
            origins: ['*://www.youtube-nocookie.com/*']
        },
        function(granted) {
            if (granted) {
                setOption('noCookie', true);
            }
            else {
                $this.checked = false;
                setOption('noCookie', false);
            }
        });
    }
    else {
        setOption('noCookie', false);
    }
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

var $fullscreenButton = $('fullscreen-button');
$fullscreenButton.checked = options.fullscreenButton;
onChange($fullscreenButton, function() {
    setOption('fullscreenButton', this.checked);
});

var $ytLogo = $('yt-logo');
$ytLogo.checked = options.ytLogo;
onChange($ytLogo, function() {
    setOption('ytLogo', this.checked);
});

var $keyboard = $('keyboard');
$keyboard.checked = options.keyboard;
onChange($keyboard, function() {
    setOption('keyboard', this.checked);
});

var $noclick = $('noclick');
$noclick.checked = options.noclick;
onChange($noclick, function() {
    setOption('noclick', this.checked);
});

var $loop = $('loop');
$loop.checked = options.loop;
onChange($loop, function() {
    setOption('loop', this.checked);
});

var $proportion = $('proportion');
$proportion.checked = options.proportion;
onChange($proportion, function() {
    setOption('proportion', this.checked);
});

var $youtubeApi = $('youtube-api');
$youtubeApi.checked = options.youtubeApi;
onChange($youtubeApi, function() {
    setOption('youtubeApi', this.checked);
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

var $spoofReferrer = $('spoof-referrer');
$spoofReferrer.checked = options.spoofReferrer;
onChange($spoofReferrer, function() {
    setOption('spoofReferrer', this.checked);
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

var $fixPopup = $('fix-popup');
$fixPopup.checked = options.fixPopup;
onChange($fixPopup, function() {
    setOption('fixPopup', this.checked);
});

var $app = $('app');
$app.checked = options.app;
onChange($app, function() {
    setOption('app', this.checked);
});

var $borderless = $('borderless');
$borderless.checked = options.borderless;
onChange($borderless, function() {
    setOption('borderless', this.checked);
});

var $alwaysOnTop = $('always-on-top');
$alwaysOnTop.checked = options.alwaysOnTop;
onChange($alwaysOnTop, function() {
    setOption('alwaysOnTop', this.checked);
});

var $helium = $('helium');
$helium.checked = options.helium;
onChange($helium, function() {
    setOption('helium', this.checked);
});

var $heliumPinTab = $('helium-pin-tab');
$heliumPinTab.checked = options.heliumPinTab;
onChange($heliumPinTab, function() {
    setOption('heliumPinTab', this.checked);
});

var $heliumVersion = $('helium-version');
$heliumVersion.value = options.heliumVersion;
onChange($heliumVersion, function() {
    setOption('heliumVersion', this.value);
});

var $keepPopup = $('keep-popup');
$keepPopup.checked = options.keepPopup;
onChange($keepPopup, function() {
    setOption('keepPopup', this.checked);
});

var $keepDimensions = $('keep-dimensions');
$keepDimensions.checked = options.keepDimensions;
onChange($keepDimensions, function() {
    setOption('keepDimensions', this.checked);
});

var $context = $('use-context');
$context.checked = options.context;
onChange($context, function() {
    setOption('context', this.checked);
});

var $enableHistory = $('enable-history');
$enableHistory.checked = options.history;
onChange($enableHistory, function() {
    setOption('history', this.checked);
});

onClick($defaultConfig, function(e) {
    e.preventDefault();

    var isOption;

    if (confirm(getText('u_sure'))) {
        for (var i in localStorage) {
            if (localStorage.hasOwnProperty(i)) {
                isOption = i.substr(0, OPTIONS_PREFIX.length) === OPTIONS_PREFIX;

                if (isOption) {
                    localStorage.removeItem(i);
                }
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
        resolution = $target.innerText.split('x');
        width = resolution[0];
        height = resolution[1];

        $width.value = width;
        $height.value = height;

        setOption('width', +width);
        setOption('height', +height);

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
