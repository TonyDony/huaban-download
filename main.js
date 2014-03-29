jQuery(function () {

    var $ = jQuery

    $('body').append($('' +
        '<div style="background: #c50b25;border:solid 2px #ccc;position:fixed;left:0;top:0;width:300px;height:120px;z-index:999999;">' +
        '<p id="huaban-pins-downloads-extname"></p>' +
        '<a id="start-download-all-pins" href="javascript:this.appData=window.app;alert(1)">开始下载</a>' +
        '</div>'))
    var $process = $('huaban-pins-downloads-extname')


    //"pin_id":122978818

    var id = $('html').html().match(/"pin_id"[\s\S]+?(\d+)/m)
    var fileArr = []
    var currentId;

    function trim(str) {
        if (!str) return str
        return str.replace(/[\s\\\/'"|_]/gi, '')
    }

    var cl = setInterval(function () {
        if ($('#waterfall').find('div[data-id]').length > 0) {
            clearInterval(cl)
            currentId = $('#waterfall').find('div[data-id]').each(function (i, item) {
                try {
                    var obj = JSON.parse(item.getAttribute('data-file'))
                    fileArr.push({
                        key: obj.key,
                        type: obj.type,
                        text: trim(item.querySelector('p.description').innerText)
                    })
                } catch (e) {
                    console.log(e)
                }
            }).last().data('id')
            loadAllPin()
        }
    }, 10)

    function loadAllPin() {
        $.ajax({
            url: './?htcvzojp&max=' + currentId + '&limit=20&wfl=1',
            dataType: 'json',
            header: {
                'X-Request': 'JSON',
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (data) {
                try {
                    data.user.pins.forEach(function (obj) {
                        fileArr.push({
                            key: obj.file.key,
                            type: obj.file.type,
                            text: trim(obj.raw_text)
                        })
                    })
                    if (data.user.pins.length >= 20) {
                        currentId = data.user.pins[data.user.pins.length - 1].pin_id
                        loadAllPin()
                    } else {
                        done()
                    }
                } catch (e) {
                    console.log(e)
                }

            }
        })
    }

    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

    function done() {
        var fileList = fileArr.map(function (currentFile) {
            var url = 'http://img.hb.aicdn.com/' + currentFile.key
            var type = currentFile.type.substring(currentFile.type.indexOf('/') + 1)
            return url
        })

        console.log(fileList)
    }


})

