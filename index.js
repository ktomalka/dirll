/**
 * Internal libraries of Node.js
 */
const { readdirSync, createReadStream, lstatSync, existsSync } = require('fs');
const { parse: urlParse } = require('url');
const { resolve, parse: parsePath } = require('path');
const http = require('http');

const mimeTypes = {
    ico: { type: 'image/x-icon', show: true },
    json: { type: 'application/json', show: true },
    txt: { type: 'text/plain', show: true },
    css: { type: 'text/css', show: true },
    png: { type: 'image/png', show: true },
    jpg: { type: 'image/jpeg', show: true },
    wav: { type: 'audio/wav', show: false },
    mp3: { type: 'audio/mpeg', show: false },
    svg: { type: 'image/svg+xml', show: true },
    pdf: { type: 'application/pdf', show: false },
    doc: { type: 'application/msword', show: true },
    avi: { type: 'video/x-msvideo', show: false },
    mkv: { type: 'video/x-matroska', show: false },
    mp4: { type: 'video/mp4', show: false },
};

/**
 * The function scans directory and subdirectories for files.
 */
const scanDir = (path) => {
    // The list of files
    let result = [];
    const dir = readdirSync(path);

    dir.forEach((item) => {
        const currentPath = `${path}/${item}`;

        if (lstatSync(currentPath).isFile()) {
            if (currentPath !== './index.js') result.push(currentPath.replace(resolve('.'), ''));

            /**
             * If item isn't a file, call function again and add result to the results
             */
        } else {
            result = [...result, ...scanDir(currentPath)];
        }
    });

    return result;
};

http.createServer((req, res) => {
    const result = scanDir(process.env.SCAN_PATH);
    let html = '';

    result.forEach((item) => {
        html += `<li class="list-group-item">
            <a href="${item}" target="_blank">${item.split('/').pop().split('.').slice(0, -1).join('.')}</a>
        </li>`;
    });

    const parsedUrl = urlParse(req.url);
    const pathname = parsedUrl.pathname;
    const ext = parsePath(pathname).ext.replace('.', '');

    const contentType = mimeTypes[ext];

    if (contentType) {
        try {
            const filePath = resolve(process.env.SCAN_PATH) + pathname;

            if (!existsSync(filePath)) {
                res.writeHead(500);
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
        res.setHeader('Content-type', 'text/html');
        res.write(`<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
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
