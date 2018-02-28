// Translation strings
var strInstructions = getText('instructions');
setHtml($$('title'), strInstructions);
setHtml($$('h1 a'), strInstructions);

setHtml($$('#instructions-click-icon div'), '@instructions_click_icon');
setHtml($$('#instructions-right-click div'), '@instructions_right_click');
setHtml($$('#instructions-windows div'), '@instructions_windows');
setHtml($$('#instructions-linux div'), '@instructions_linux');
setHtml($$('#instructions-mac div'), '@instructions_macos');
setHtml($$('#instructions-chromeos div'), '@instructions_chromeos');
setHtml($$('#instructions-options div'), '@instructions_options');
// End Translation strings

var $deskpins = $('deskpins');
$deskpins.href = 'https://bitbucket.org/efotinis/deskpins/downloads/' +
    'DeskPins-1.32-setup.exe';

var $helium = $('helium');
$helium.target = '_blank';
$helium.href = 'https://itunes.apple.com/br/app/helium/id1054607607';

var $app = $('app');
$app.target = '_blank';
$app.href = 'https://chrome.google.com/webstore/detail/' +
    'neefhpglbgbkmlkgdgkfoofkcpbodbfb';

$('instructions-' + userOSclass).classList.remove('hidden');
