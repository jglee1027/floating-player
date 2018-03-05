// Translation strings
var strInstructions = getText('instructions');
setHtml($$('title'), strInstructions);
setHtml($$('h1 a'), strInstructions);

var $instructionsClickIcon = $$('#instructions-click-icon p');
var $instructionsRightClick = $$('#instructions-right-click p');
var $instructionsWindows = $$$('#instructions-windows p');
var $instructionsLinux = $$('#instructions-linux p');
var $instructionsMac = $$$('#instructions-mac p');
var $instructionsChromeOs = $$$('#instructions-chromeos p');
var $instructionsOptions = $$('#instructions-options p');

setHtml($instructionsClickIcon, '@instructions_click_icon');
setHtml($instructionsRightClick, '@instructions_right_click');
setHtml($instructionsWindows[0], '@instructions_windows');
setHtml($instructionsWindows[1], '@instructions_windows2');
setHtml($instructionsLinux, '@instructions_linux');
setHtml($instructionsMac[0], '@instructions_macos');
setHtml($instructionsMac[1], '@instructions_macos2');
setHtml($instructionsChromeOs[0], '@instructions_chromeos');
setHtml($instructionsChromeOs[1], '@instructions_chromeos2');
setHtml($instructionsOptions, '@instructions_options');
// End Translation strings


$instructionsWindows[1].innerHTML = setVars($instructionsWindows[1].innerHTML, {
    'DeskPins': '<a href="https://bitbucket.org/efotinis/deskpins/downloads/' +
        'DeskPins-1.32-setup.exe">DeskPins</a>'
});

$instructionsMac[1].innerHTML = setVars($instructionsMac[1].innerHTML, {
    'Helium': '<a target="_blank" href="https://itunes.apple.com/br/app/' +
        'helium/id1054607607">Helium</a>'
});

$instructionsChromeOs[1].innerHTML = setVars($instructionsChromeOs[1].innerHTML, {
    'addon': '<a target="_blank" href="https://chrome.google.com/webstore/' +
        'detail/neefhpglbgbkmlkgdgkfoofkcpbodbfb">' + getText('addon') + '</a>'
});

$('instructions-' + userOsClass).classList.remove('hidden');
