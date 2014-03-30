var express = require('express')
var app = express()
app.use(express.static(__dirname + '/static'));

var server = require('http').createServer(app)
var io = require('socket.io').listen(server)

//下载完成时，是否自动打开目录
var openDirector

server.listen(3000);

io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });

    socket.on('after-open-download-directory', function (data) {
        openDirector = data.boolean
    });



});