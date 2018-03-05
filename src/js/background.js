if (options.context) {
    addContextMenu();
}

// Import old settings (this will be removed soon)
if (localStorage.getItem('ok')) {
    var key;
    var value;
    var isOption;

    for (var i in localStorage) {
        if (localStorage.hasOwnProperty(i)) {
            isOption = i.substr(0, 1) === '_';

            if (isOption) {
                key = i.substr(1);
                value = localStorage.getItem(i);

                // Update old keys/values
                switch (key) {
                    case 'api':
                        key = 'youtubeApi';
                        break;

                    case 'fix':
                        key = 'fixPopup';
                        break;

                    case 'hmargin':
                        key = 'horizontalMargin';
                        break;

                    case 'vmargin':
                        key = 'verticalMargin';
                        break;

                    case 'color':
                        if (value === '1') {
                            value = 'red';
                        }
                        else {
                            value = 'white';
                        }
                        break;
                }

                // Boolean true
                if (value === 'true') {
                    setOption(key, true);
                }
                // Boolean false
                else if (value === 'false') {
                    setOption(key, false);
                }
                // Number
                else if (key !== 'title' && (value - 0 == value &&
                    ('' + value).trim().length > 0)) {

                    setOption(key, +value);
                }
                // String
                else {
                    setOption(key, value);
                }

                localStorage.removeItem(i);
            }
        }
    }

    localStorage.removeItem('ok');
    localStorage.setItem('installed', Date.now());
    getAllOptions();
}

// 1st time
else if (!localStorage.getItem('installed')) {
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
