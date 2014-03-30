var io = require('socket.io').listen(3001)
var request = require('request')
var path = require('path')
var fs = require('fs')
var os = require('os')
var child_process = require('child_process')
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

        socket.on('open-download-directory', function () {
            var isWin = os.type().toLowerCase().indexOf('windows') > -1
            child_process.spawn(isWin ? 'start' : 'open', [downLoadRoot]);
        })

    })

var http = require('http')

//完成后是否打开目录
var openDirector

function trim(str) {
    if (!str) return 'null'
    if (str.length > 200) str = str.substring(0, 200)
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


//读取画集的所有JSON数据
function loadAllPin(baseurl, currentId, fileArr, socket) {

    if (!fileArr) fileArr = []

    function _loadAllPin(currentId) {
        socket.emit('load pins', {count: (fileArr.length + 1)})

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

//JSON抓取完毕，开始建立文件夹
function done(fileArr, socket) {
    socket.emit('process', {msg: '数据加载完毕，您一共有' + (fileArr.length + 1) + '个图片,开始下载'})
    createDir(fileArr, socket)
}


//根据分类创建好文件夹
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

    //储存总的图片数量
    var allCount = fileArr.length + 1
    console.log(fileArr)

    var downloadErrorCount = 0
    var downloadSuccessCount = 0


    function _download() {
        var current = fileArr.shift()
        if (!current) {
            socket.emit('process', {msg: '所有图片下载完毕', left: 0, sum: allCount})
            return
        }
        var type = current.type.substring(current.type.indexOf('/') + 1)
        var fileName = current.text + '.' + type
        var filePath = path.join(downLoadRoot, current.board, fileName)

        var url = 'http://img.hb.aicdn.com/' + current.key
        request({url: url, encoding: null}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                fs.writeFile(filePath, body, function (err) {
                    if (err) {
                        socket.emit('download error', {
                            msg: '错误：' + fileName + '下载失败'
                        })
                        downloadErrorCount++
                    } else {
                        socket.emit('download success', {
                            msg: '下载成功' + fileName
                        })
                        downloadSuccessCount++
                    }

                    socket.emit('process', {
                        msg: '还剩下' + (fileArr.length + 1) + '张图片',
                        left: fileArr.length,
                        successCount: downloadSuccessCount,
                        errorCount: downloadErrorCount,
                        sum: allCount
                    })
                    _download(fileArr)
                });
            } else {
                _download(fileArr)
            }
        })
    }

    _download()

}
