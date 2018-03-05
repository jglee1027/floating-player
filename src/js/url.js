function Url(url) {
    var e = document.createElement('a');
    e.href = url;

    this.protocol = e.protocol;
    this.host = e.host.toLowerCase();
    this.path = e.pathname;
    this.hash = e.hash;
    this.rawQuery = e.search.slice(1);
    this.query = this._queryStringParse(this.rawQuery);
}

Url.encode = function(str) {
    return encodeURIComponent(str).
        replace(/!/g, '%21').
        replace(/'/g, '%27').
        replace(/\(/g, '%28').
        replace(/\)/g, '%29').
        replace(/\*/g, '%2A').
        replace(/%20/g, '+');
};

Url.decode = function(str) {
    return decodeURIComponent(str.replace(/\+/g, '%20'));
};

Url.prototype = {
    _queryStringParse: function(q) {
        var vars = q.split('&');
        var result = {};
        var part;
        var key;
        var value;

        for (var i = 0, len = vars.length; i < len; i++) {
            part = vars[i].split('=');

            key = (part[0] && Url.decode(part[0])) || '';
            value = (part[1] && Url.decode(part[1])) || '';

            if (key) {
                result[key] = value;
            }
        }

        return result;
    },

    _queryStringEncode: function(obj) {
        var str = [];

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                str.push(Url.encode(i) + '=' + Url.encode(obj[i]));
            }
        }

        return str.join('&');
    },

    updateRawQuery: function() {
        this.rawQuery = this._queryStringEncode(this.query);
    },

    toString: function() {
        this.updateRawQuery();

        return this.protocol + '//' + this.host + this.path +
            (this.rawQuery ? '?' + this.rawQuery : '') + this.hash;
    }
};
