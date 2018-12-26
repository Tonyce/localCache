const request = require('request')

for (let index = 0; index < 10; index++) {
    request.get('http://baidu.com\?fadf\=fads', (error, response, body) => {
        if (error) console.error(error)
        else if (body) console.log(body)
    })
}