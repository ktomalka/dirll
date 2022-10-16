/**
 * Internal libraries of Node.js
 */
const { readdirSync, createReadStream, lstatSync, existsSync, readFileSync } = require('fs');
const { parse: urlParse } = require('url');
const { resolve } = require('path');
const http = require('http');
const https = require('https');

const certPath = resolve('cert');
const server = { https: existsSync(certPath) };
server.type = server.https ? https : http;
server.certPem = server.https ? readFileSync(resolve('cert/cert.pem')) : undefined;
server.certKey = server.https ? readFileSync(resolve('cert/cert.key')) : undefined;

const CONFIG = {
    PORT: Number(process.env.PORT),
    BASIC_AUTH: process.env.BASIC_AUTH,
    SCAN_PATH: process.env.SCAN_PATH,
    ONLY_EXT: process.env.ONLY_EXT?.split(','),
}

let ignoreDirs = ['.git', 'node_modules', '.vscode', '.idea'];

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
            if (CONFIG.ONLY_EXT) {
                CONFIG.ONLY_EXT.forEach((ext) => {
                    if (currentPath.split('.').pop() === ext) {
                        result.push({
                            path: currentPath.replace(resolve('.'), ''),
                            size: formatBytes(lstatSync(currentPath).size),
                        });
                    }
                });
            } else {
                result.push({
                    path: currentPath.replace(resolve('.'), ''),
                    size: formatBytes(lstatSync(currentPath).size),
                });
            }
        }
    });

    return result;
};

server.type.createServer({
    cert: server.certPem,
    key: server.certKey,
}, (req, res) => {
    const basicAuthorization = req.headers['authorization']?.replace('Basic ', '');
    if (CONFIG.BASIC_AUTH !== basicAuthorization) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

        return res.end('Unauthorized');
    }

    const parsedUrl = urlParse(req.url);
    const pathname = parsedUrl.pathname;

    if (pathname !== '/') {
        try {
            const filePath = (resolve(process.env.SCAN_PATH) + pathname).replace(/%20/ig, ' ');

            console.log(filePath);

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
        const result = scanDir(CONFIG.SCAN_PATH);
        let html = '';

        result.forEach((item) => {
            html += `<li class="list-group-item">
                <a href="${item.path}" target="_blank">${item.path} <strong>(${item.size})</strong></a>
            </li>`;
        });

        res.setHeader('Content-type', 'text/html');
        res.write(`<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name=viewport content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=yes">
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>* { word-break: break-word; }</style>
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
}).listen(CONFIG.PORT);
