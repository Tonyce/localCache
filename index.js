const http = require('http')
const request = require('request')
const fs = require('fs')
const url = require('url')

const cacheFolder = 'cache'

const localFiles = {

}

http.createServer((req, res) => {
    const urlObj = url.parse(req.url, {
        parseQueryString: true
    })
    const queryPathArr = []
    for (const key in urlObj.query) {
        const element = urlObj.query[key];
        queryPathArr.push(`${key}.${element}`)
    }
    const queryPath = queryPathArr.join('/')

    const filePath = `${cacheFolder}/${urlObj.hostname}/${queryPath}`;
    if (localFiles[filePath]) {
        if (localFiles[filePath].ready) {
            console.log('from local')
            const localFile = fs.createReadStream(filePath)
            localFile.on('end', () => {
                res.end()
            })
            localFile.pipe(res)
            return
        }
    } else {
        localFiles[filePath] = {}
    }

    let times = 0
    fs.mkdirSync(`${cacheFolder}/${urlObj.hostname}`, { recursive: true })
    const writeable = fs.createWriteStream(filePath, {encoding: 'binary'})
    writeable.on('finish', () => {
        console.log('finish')
        localFiles[filePath].ready = true
        localFiles[filePath].req = null
    })
    const method = req.method.toLowerCase()
    let requestPipe = request[method](req.url)

    function reqStreamHandler(reqStream) {
        reqStream.on('response', (resp) => {
            console.log('resp.statusCode', resp.statusCode)
            if (resp.statusCode !== 200) {
                reqStream.destroy(['!200'])
            } else {
                localFiles[filePath] = { 
                    req, 
                    ready: false 
                }
            }
        })
        reqStream.on('data', (chunk) => {
            res.write(chunk)
            if (localFiles[filePath].req === req) {
                writeable.write(chunk)
            }
            
        })
        reqStream.on('end', () => {
            console.log('times', times)
            res.end()
            if (localFiles[filePath].req === req) 
                writeable.end()
        })
        reqStream.on('error', () => {
            times += 1
            console.log('error times', times)
            if (times >= 2) {
                res.statusCode = 404
                res.end('no source valid')
            } else {
                requestPipe = request[method]('http://360.cn')
                reqStreamHandler(requestPipe)            
            }
        })
        req.pipe(requestPipe)
    }

    reqStreamHandler(requestPipe)
    
    
}).listen(3333, () => {
    console.log('server start at 30000')
})