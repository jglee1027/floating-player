if (options.context) {
    addContextMenu();
}

// 1st time
if (!localStorage.getItem('installed')) {
    localStorage.setItem('installed', Date.now());
    showInstructions();
}

setBrowserAction();

// In order to embed VEVO videos we have to spoof the Referrer header
if (options.spoofReferrer) {
    chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        var foundReferrer = false;
        var fakeReferrer = 'https://www.youtube.com/';

        for (var i = 0, len = details.requestHeaders.length; i < len; i++) {
            if (details.requestHeaders[i].name === 'Referer') {
                details.requestHeaders[i].value = fakeReferrer;
                foundReferrer = true;
                break;
            }
        }

        if (!foundReferrer) {
            details.requestHeaders.push({
                name: 'Referer',
                value: fakeReferrer
            });
        }

        return {
            requestHeaders: details.requestHeaders
        };
    },
        {urls: [
            'https://www.youtube.com/embed/*',
            'https://www.youtube-nocookie.com/embed/*'
        ]},
        ['blocking', 'requestHeaders']
    );
}
