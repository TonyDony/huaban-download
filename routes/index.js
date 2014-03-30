var io = require('socket.io').listen(3001)
var request = require('request')
var path = require('path')
var fs = require('fs')
var downLoadRoot = path.join(__dirname, '..', '下载好的文件在这里')

var chat = io
    .of('/huaban')
    .on('connection', function (socket) {
        socket.on('after-open-download-directory', function (data) {
            openDirector = data.boolean
        })

        socket.on('start download', function (data) {
            loadPageSource(data.url, socket)
        })
    })

var http = require('http')

//完成后是否打开目录
var openDirector

function trim(str) {
    return str.replace(/[\s\\\/'"|_?<>:*]/gi, '')
}

function loadPageSource(url, socket) {

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                var id = body.match(/"pin_id"[\s\S]+?(\d+)/m)
                loadAllPin(url, id[1], undefined, socket)
            } catch (e) {
                console.log(e)
            }
        }
    })

}


function loadAllPin(baseurl, currentId, fileArr, socket) {

    if (!fileArr) fileArr = []

    function _loadAllPin(currentId) {
        socket.emit('process', {msg: '已获取到' + fileArr.length + '张图片'})

        var url = baseurl + '?htcvzojp&max=' + currentId + '&limit=20&wfl=1'
        request({
            url: url,
            headers: {
                Accept: 'application/json',
                'X-Request': 'JSON',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }, function (error, response, body) {
            if (error) console.log('抓取网页发生错误', error)
            try {
                var data = JSON.parse(body)
                data.user.pins.forEach(function (obj) {
                    fileArr.push({
                        board: trim(obj.board.title),
                        key: obj.file.key,
                        type: obj.file.type,
                        text: trim(obj.raw_text)
                    })
                })
                if (data.user.pins.length >= 20) {
                    _loadAllPin(data.user.pins[data.user.pins.length - 1].pin_id)
                } else {
                    done(fileArr, socket)
                }
            } catch (e) {
                console.log('加载失败，开始重复加载' + currentId)
                console.log(e)
                done(fileArr, socket)
            }
        });

    }

    _loadAllPin(currentId)

}

function done(fileArr, socket) {
    socket.emit('process', {msg: '数据加载完毕，您一共有' + fileArr.length + '个图片,开始下载'})
    createDir(fileArr, socket)
}

function createDir(fileArr, socket) {

    var dirName = []
    fileArr.forEach(function (item) {
        if (dirName.indexOf(item.board) < 0) {
            dirName.push(item.board)
        }
    })
    socket.emit('process', {msg: '开始创建文件夹：' + dirName.join(',')})
    var spawn = require('child_process').spawn,
        ls = spawn('mkdir', dirName, {
            cwd: downLoadRoot
        });
    ls.on('close', function (code) {
        download(fileArr, socket)
    })
}

function download(fileArr, socket) {
    socket.emit('process', {msg: '开始下载图片'})


    console.log(fileArr, '123123')

    function _download() {
        var current = fileArr.shift()
        if (!current) {
            socket.emit('process', {msg: '下载完毕'})
            return
        }
        var type = current.type.substring(current.type.indexOf('/') + 1)
        var fileName = current.text + '.' + type
        var filePath = path.join(downLoadRoot, current.board, fileName)

        var url = 'http://img.hb.aicdn.com/' + current.key
        socket.emit('process', {msg: '开始下载：' + fileName})
        request({url: url, encoding: null}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(typeof body)
                fs.writeFile(filePath, body, function (err) {
                    if (err) {
                        socket.emit('process', {msg: '错误：' + fileName + '下载失败'})
                    } else {
                        socket.emit('process', {msg: '下载成功' + fileName})
                    }
                    socket.emit('process', {msg: '还剩下' + fileArr.length + '张图片'})
                    _download(fileArr)
                });
            }
        })
    }

    _download()

}
