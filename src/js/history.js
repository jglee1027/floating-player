// Translation strings
var strHistory = getText('history');
setHtml($$('title'), strHistory);
setHtml($$('h1 a'), strHistory);

var $clearHistory = $('clear-history');
setHtml($clearHistory, '@clear_history');
// End Translation strings

var $table = $('table');

var currentHistory = historyGet();
var historySize = currentHistory.length;

function historyIsEmpty() {
    var isHistoryEnabled = getOption('history');
    var key;

    if (isHistoryEnabled) {
        key = 'history_empty';
    }
    else {
        key = 'history_disabled';
    }

    $table.parentNode.removeChild($table);
    $clearHistory.outerHTML = '<p>' + getText(key) + '</p>';
}

if (historySize) {
    var tpl = '<tbody>';

    var link;
    var timestamp;
    var date;

    for (var i = 0; i < historySize; i++) {
        link = htmlEscape(currentHistory[i].link);
        timestamp = currentHistory[i].timestamp;
        date = new Date(timestamp).toLocaleString();

        tpl += '<tr>';
        tpl += '<td class="td-date">';
        tpl += date;
        tpl += '</td>';
        tpl += '<td class="td-link">';
        tpl += '<a href="' + link + '">' + link + '</a>';
        tpl += '</td>';
        tpl += '<td class="td-remove" data-timestamp="' + timestamp + '">';
        tpl += '</td>';
        tpl += '</tr>';
    }

    tpl += '</tbody>';

    $table.innerHTML = tpl;
}
else {
    historyIsEmpty();
}

// "X" image
onClick($table, function(e) {
    var $target = e.target;
    if ($target.className === 'td-remove') {
        var timestamp = +$target.dataset.timestamp;
        var $tr = $target.parentNode;
        $tr.parentNode.removeChild($tr);

        historyRemove(timestamp);
        historySize--;

        if (historySize === 0) {
            historyIsEmpty();
        }
    }
});

onClick($clearHistory, function(e) {
    e.preventDefault();

    if (confirm(getText('u_sure'))) {
        historyClear();
        historyIsEmpty();
    }
});
