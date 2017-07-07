chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    var $video = document.getElementsByTagName('video')[0];
    var time;

    if ($video) {
        try {
            // Pause video
            $video.pause();

            // Get current video time
            time = Math.floor($video.currentTime);
        }
        catch(e) {
            console.log(e);
        }
    }

    response(time);
});
