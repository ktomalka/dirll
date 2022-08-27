/**
 * Internal libraries of Node.js
 */
const { readdirSync, createReadStream, lstatSync, existsSync } = require('fs');
const { parse: urlParse } = require('url');
const { resolve } = require('path');
const http = require('http');
let ignoreDirs = ['.git', 'node_modules', '.vscode', '.idea'];

/**
 * The function scans directory and subdirectories for files.
 */
const scanDir = (path) => {
    // The list of files
    let result = [];
    const dir = readdirSync(path);

    dir.forEach((item) => {
        const currentPath = `${path}/${item}`;

        /**
         * If item isn't a file, call function again and add result to the main results
         */
        if (lstatSync(currentPath).isDirectory()) {
            if (!ignoreDirs.includes(item)) result = [...result, ...scanDir(currentPath)];
        } else {
            result.push(currentPath.replace(resolve('.'), ''));
        }
    });

    return result;
};

http.createServer((req, res) => {
    const basicAuthorization = req.headers['authorization']?.replace('Basic ', '');
    if (process.env.BASIC_AUTH !== basicAuthorization) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

        return res.end('Unauthorized');
    }

    const parsedUrl = urlParse(req.url);
    const pathname = parsedUrl.pathname;

    if (pathname !== '/') {
        try {
            const filePath = resolve(process.env.SCAN_PATH) + pathname;

            if (!existsSync(filePath)) {
                res.writeHead(404);
                return res.end();
            }

            const readStream = createReadStream(filePath);

            readStream.on('open', () => readStream.pipe(res))
            readStream.on('error', err => {
                res.end(err);

                console.log(error)
            });
        } catch (error) {
            res.writeHead(500);
            res.end('Internal Server Error');

            console.log(error)
        }
    } else {
        const result = scanDir(process.env.SCAN_PATH);
        let html = '';

        result.forEach((item) => {
            html += `<li class="list-group-item">
                <a href="${item}" target="_blank">${item}</a>
            </li>`;
        });

        res.setHeader('Content-type', 'text/html');
        res.write(`<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name=viewport content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=yes">
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet">

                    <title>DIRLL - List of Files</title>
                </head>
                <body>
                    <div class="container pt-5">
                        <ul class="list-group">${html}</ul>
                    </div>
                </body>
                </html>`);
        res.end();
    }
}).listen(Number(process.env.PORT));
