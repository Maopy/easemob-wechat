var conn = null
var curChatUserId = null
var curUserId = null
var $ = window.$
var Easemob = window.Easemob
var msgCardDivId = 'chat01'
var talkInputId = 'talkInputId'
var textSending = false
var time = 0
// 当前聊天对象，name要为id
var curContact = {name: '10272', toJid: 'haoyayi#haoyayidocdev_10272@easemob.com', subscription: 'both'}

var encode = function (str) {
  if (!str || str.length === 0) return ''
  var s = ''
  s = str.replace(/&amp;/g, '&')
  s = s.replace(/<(?=[^o][^)])/g, '&lt;')
  s = s.replace(/>/g, '&gt;')
  s = s.replace(/"/g, '&quot;')
  s = s.replace(/\n/g, '<br>')
  return s
}

// easemobwebim-sdk注册回调函数列表
$(document).ready(function () {
  conn = new Easemob.im.Connection({
    multiResources: Easemob.im.config.multiResources,
    https: Easemob.im.config.https,
    url: Easemob.im.config.xmppURL
  })
  // 初始化连接
  conn.listen({
    // 当连接成功时的回调方法
    onOpened: function () {
      handleOpen(conn)
    },
    // 收到文本消息时的回调方法
    onTextMessage: function (message) {
      handleTextMessage(message)
    },
    // 收到图片消息时的回调方法
    onPictureMessage: function (message) {
      handlePictureMessage(message)
    }
  })

  // 自动登录
  login()

  $('#notice-block-div').on('hidden.bs.modal', function (e) {})

  $(function () {
    $(window).on('beforeunload', function () {
      if (conn) {
        conn.close()
        return ''
      }
    })
  })
})

// easemobwebim-sdk收到图片消息的回调方法的实现
var handlePictureMessage = function (message) {
  var filename = message.filename // 文件名称，带文件扩展名
  var from = message.from // 文件的发送者
  var contactDivId = from

  var img = document.createElement('img')
  img.src = message.url
  appendMsg(from, contactDivId, {
    data: [ {
      type: 'pic',
      filename: filename || '',
      data: img
    } ]
  })
}

// 定义消息编辑文本域的快捷键，enter和ctrl+enter为发送，alt+enter为换行
// 控制提交频率
$(function () {
  $('textarea').keydown(function (event) {
    if (event.altKey && event.keyCode === 13) {
      var e = $(this).val()
      $(this).val(e + '\n')
    } else if (event.ctrlKey && event.keyCode === 13) {
      event.returnValue = false
      sendText()
      return false
    } else if (event.keyCode === 13) {
      event.returnValue = false
      sendText()
      return false
    }
  })
})

var sendText = function () {
  if (textSending) {
    return
  }
  textSending = true
  var msgInput = document.getElementById(talkInputId)
  var msg = msgInput.value
  if (msg === null || msg.length === 0) {
    textSending = false
    return
  }
  var to = curChatUserId
  if (to == null) {
    textSending = false
    return
  }
  var options = {
    to: to,
    msg: msg,
    type: 'chat'
  }

  // easemobwebim-sdk发送文本消息的方法 to为发送给谁，meg为文本消息对象
  conn.sendTextMessage(options)
  // 当前登录人发送的信息在聊天窗口中原样显示
  var msgtext = Easemob.im.Utils.parseLink(Easemob.im.Utils.parseEmotions(encode(msg)))
  appendMsg(curUserId, to, msgtext)
  msgInput.value = ''
  msgInput.focus()
  setTimeout(function () {
    textSending = false
  }, 1000)
}

// 登录系统时的操作方法
var login = function () {
  setTimeout(function () {
    var user = 'o8fvljqtlykcgt6w3vbbr-r9m5js'
    var pass = '12345678'
    // 根据用户名密码登录系统
    conn.open({
      apiUrl: Easemob.im.config.apiURL,
      user: user,
      pwd: pass,
      // 连接时提供appkey
      appKey: Easemob.im.config.appkey
    })
    return false
  }, 50)
}

// 处理连接时函数,主要是登录成功后对页面元素做处理
var handleOpen = function (conn) {
  // 从连接中获取到当前的登录人注册帐号名
  curUserId = conn.context.userId
  // 获取当前登录人的联系人列表
  conn.getRoster({
    success: function (roster) {
      // 页面处理
      showChatUI()
      var curroster = null
      // 遍历一下，有curContact的话把其选定为当前聊天对象
      for (var i in roster) {
        if (roster[i].jid === curContact.toJid) {
          curroster = roster[i]
        }
      }
      // 没有的话加一个再查
      if (!curroster) {
        conn.addRoster(curContact)
        conn.getRoster({
          success: function (newRoster) {
            for (var j in newRoster) {
              if (newRoster[j].jid === curContact.toJid) {
                curroster = newRoster[j]
              }
            }
          }
        })
      }
      setCurrentContact(curroster.name) // 设置这个人作为聊天对象
      conn.setPresence() // 设置用户上线状态，必须调用
    }
  })

  // 启动心跳
  if (conn.isOpened()) {
    conn.heartBeat(conn)
  }
}

var showChatUI = function () {
  $('#content').css({
    'display': 'block'
  })
}

// easemobwebim-sdk收到文本消息的回调方法的实现
var handleTextMessage = function (message) {
  var from = message.from // 消息的发送者
  var messageContent = message.data // 文本消息体
  // TODO  根据消息体的to值去定位那个群组的聊天记录
  appendMsg(from, from, messageContent)
}

// 设置当前显示的聊天窗口div，如果有联系人则默认选中联系人中的第一个联系人
var setCurrentContact = function (defaultUserId) {
  showContactChatDiv(defaultUserId)
  curChatUserId = defaultUserId
}

// 显示当前选中联系人的聊天窗口div，并将该联系人在联系人列表中背景色置为蓝色
var showContactChatDiv = function (chatUserId) {
  var contentDiv = getContactChatDiv(chatUserId)
  if (contentDiv == null) {
    contentDiv = createContactChatDiv(chatUserId)
    document.getElementById(msgCardDivId).appendChild(contentDiv)
  }
  contentDiv.style.display = 'block'
}

// 构造当前聊天记录的窗口div
var getContactChatDiv = function (chatUserId) {
  return document.getElementById(curUserId + '-' + chatUserId)
}

// 如果当前没有某一个联系人的聊天窗口div就新建一个
var createContactChatDiv = function (chatUserId) {
  var msgContentDivId = curUserId + '-' + chatUserId
  var newContent = document.createElement('div')
  $(newContent).attr({
    'id': msgContentDivId,
    'class': 'chat01_content',
    'className': 'chat01_content',
    'style': 'display:none'
  })
  return newContent
}

// 显示聊天记录的统一处理方法
var appendMsg = function (who, contact, message, onlyPrompt, isOppositeDirection) {
  console.log('from, to , msg', who, contact, message, onlyPrompt)

  var contactDivId = contact
  // 消息体 {isemotion:true;body:[{type:txt,msg:ssss}{type:emotion,msg:imgdata}]}
  var localMsg = null
  if (typeof message === 'string') {
    localMsg = Easemob.im.Helper.parseTextMessage(message)
    localMsg = localMsg.body
  } else {
    localMsg = message.data
  }
  var headstr = onlyPrompt ? ['<p1>' + message + '</p1>'] : [ '<p1>' + who + '   <span></span>' + '   </p1>',
    '<p2>' + getLoacalTimeString() + '<b></b><br/></p2>' ]
  var header = $(headstr.join(''))
  var lineDiv = document.createElement('div')
  for (var i = 0; i < header.length; i++) {
    var ele = header[i]
    lineDiv.appendChild(ele)
  }
  var messageContent = localMsg
  var flg = onlyPrompt ? 0 : messageContent.length

  for (var j = 0; j < flg; j++) {
    var msg = messageContent[j]
    var type = msg.type
    var data = msg.data
    if (type === 'pic') {
      var fileele = $('<p>' + msg.filename + '</p>')
      fileele.attr('class', 'chat-content-p3')
      lineDiv.appendChild(fileele.get(0))
      data.nodeType && lineDiv.appendChild(data)
      $(data).on('load', function () {
        var last = $(msgContentDiv).children().last().get(0)
        last && last.scrollIntoView && last.scrollIntoView()
      })
    } else {
      var eles = $('<p>' + data + '</p>')
      eles.attr('class', 'chat-content-p3')
      lineDiv.appendChild(eles.get(0))
    }
  }
  if (curChatUserId == null) {
    onlyPrompt || setCurrentContact(contact)
    if (time < 1) {
      time++
    }
  }
  var msgContentDiv = getContactChatDiv(contactDivId)
  if (onlyPrompt) {
    lineDiv.style.textAlign = 'center'
  } else if (curUserId === who) {
    lineDiv.style.textAlign = 'right'
  } else {
    lineDiv.style.textAlign = 'left'
  }
  // var create = false
  // if (msgContentDiv == null) {
  //   msgContentDiv = createContactChatDiv(contactDivId)
  //   create = true
  // }
  // 往上加还是往下加
  if (isOppositeDirection) {
    msgContentDiv.insertBefore(lineDiv, msgContentDiv.firstChild)
  } else {
    msgContentDiv.appendChild(lineDiv)
  }
  // if (create) {
  //   document.getElementById(msgCardDivId).appendChild(msgContentDiv)
  // }

  msgContentDiv.scrollTop = msgContentDiv.scrollHeight
  return lineDiv
}

var getLoacalTimeString = function getLoacalTimeString () {
  var date = new Date()
  var time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
  return time
}
