var $video = document.getElementsByTagName('video')[0];
var $youtubeChat = document.getElementsByTagName('ytd-live-chat-frame')[0];

var time = 0;
var isYoutubeLive = false;

if ($video) {
    try {
        // Pause video
        $video.pause();

        // Get current video time
        time = Math.floor($video.currentTime);

        // Is YouTube live stream?
        isYoutubeLive = !!$youtubeChat;
    }
    catch(e) {
        console.log(e);
    }
}

[time, isYoutubeLive];
