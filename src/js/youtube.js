var player;
var playerId = 'player';

var videoData;
var videoId;
var newVideoId;
var videoTitle;
var videoList;

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
    videoTitle = videoData.title;
    videoList = videoData.list;

    // Set video quality
    player.setPlaybackQuality(options.quality);

    if (event.data === YT.PlayerState.PLAYING) {
        if (newVideoId !== videoId) {
            videoId = newVideoId;
            video.youtubeId = videoId;
            onNextVideo();
        }
    }

    else if (event.data === YT.PlayerState.ENDED &&
        options.loop && !videoList) {

        player.playVideo();
    }
}

function onNextVideo() {

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

    if (!isFullscreen && options.proportion && !options.keepDimensions) {
        getVideoProportion(function() {
            setPopupPosition();

            resizeTo(popup.pos.width, popup.pos.height);
            moveTo(popup.pos.left, popup.pos.top);

            /*
            chrome.windows.getCurrent({}, function(windowInfo) {
                chrome.windows.update(windowInfo.id, {
                    top: popup.pos.top,
                    left: popup.pos.left,
                    width: popup.pos.width,
                    height: popup.pos.height
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
    var playlistIndex = player.getPlaylistIndex() + 1;
    var playlistSize;

    if (playlistIndex > 0) {
        playlistSize = player.getPlaylist().length;
        playlistTitle = '(' + playlistIndex + '/' + playlistSize + ') ';
    }

    var title = options.title
        .replace(/%playlist%/g, playlistTitle)
        .replace(/%title%/g, videoTitle).trim();

    if (title === '') {
        title = '\uFEFF';
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

        var videoUrl = new Url(player.getVideoUrl());

        if (options.youtubeTvOnError) {
            pageUrl = videoUrl;
            parseYouTubeAsTv();
            location.href = popup.url.toString();
        }
        /*else if (confirm(getText('cannot_play'))) {
            location.href = videoUrl.toString();
        }*/
    }
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

var iframeUrl = (new Url(location.href)).query.url;

if (iframeUrl) {
    var iframe = document.createElement('iframe');
    iframe.id = playerId;
    iframe.src = iframeUrl;
    iframe.frameBorder = '0';
    iframe.allowFullscreen = 'true';
    document.body.appendChild(iframe);
}

if (options.noclick) {
    document.body.classList.add('noclick');
    addEvent(document, 'contextmenu', function(e) {
        e.preventDefault();
    });

    addEvent(document, 'dragstart', function(e) {
        e.preventDefault();
    });
}
