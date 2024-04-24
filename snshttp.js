const http = require('http');
const hostname = '0.0.0.0';
const port = 80;

var printRequest = function (req) {
    const util = require('util');
    util.log("receiving incoming message from SNS:");
    console.log("request header: " + JSON.stringify(req.headers));
    console.log("request method: " + JSON.stringify(req.method) +"\n");
}

var authChecker = function (auth, username, password) {
    var tmp = auth.split(' ');
    var buf = new Buffer(tmp[1], 'base64');
    var plain_auth = buf.toString();

    console.log("Decoded Authorization ", plain_auth);
    var creds = plain_auth.split(':');
    var authUsername = creds[0];
    var authPassword = creds[1];
    return authUsername === username && authPassword === password;
};

var confirmSubscription = function (confirmationURL) {
    const url = require('url');
    var https = require('https');
    var options = {
        host: url.parse(confirmationURL).hostname,
        port: 443,
        path: url.parse(confirmationURL).path,
        method: 'GET'
    };
    https.request(options, function (res) {
        console.log("http/https subscription confirmed");
    }).end();
}

const server = http.createServer((req, res) => {
    printRequest(req);
    const username = "foo";
    const password = "bar";
    const authRequired = false; // if auth is required
    const messageDeley = 500;   // http response delay in ms

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not support method:' + req.method + '\n');
        return;
    }

    if (authRequired) {
        var auth = req.headers['authorization'];
        console.log("Authorization Header is: ", auth);
        if (!auth) {
            console.log("No Authorization header for the request\n");
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.end('<html><body>Endpoint needs Authentication</body></html>');
            return;
        } else if (!authChecker(auth, username, password)) {
            console.log("Authorization header for the request mismatched");
            res.statusCode = 403;
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.end('<html><body>Username/Password not matched</body></html>');
            return;
        } else {
            console.log("Authorization header matched");
        }
    }

    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body);
        var messageBody = JSON.parse(body.toString())
        console.log("request body: " + JSON.stringify(messageBody) + "\n");
        var message_type = req.headers['x-amz-sns-message-type'];
        if (message_type === "SubscriptionConfirmation") {
            var subscribeurl = messageBody['SubscribeURL'].toString();
            confirmSubscription(subscribeurl);
        }

        setTimeout(function () {
            console.log("sending out HTTP 200 OK response");
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('message confirmed\n');
        }, messageDeley);
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});