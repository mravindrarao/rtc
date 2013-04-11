var websocket = require('websocket')
  , http = require('http')
  , server
  , serverPort = 3000
  , wsServer
  , connList = []
  , debugEnabled = true;

function debug(s) {
    if (debugEnabled) {
        console.log((new Date()) + ' ' + s);
    }
}

function ConnInfo(connection, role, room, other) {
    this.conn = connection;
    this.role = role;
    this.room = room;
    this.other = other;
}

function getConnInfo(conn) {
    for (var i = 0; i < connList.length; i++) {
        if (connList[i].conn == conn) {
            break;
        }
    }
    if (i === connList.length) {
        return null;
    } else {
        return connList[i];
    }
}

function removeConnInfo(conn) {
    for (var i = 0; i < connList.length; i++) {
        if (connList[i].conn == conn) {
            break;
        }
    }
    if (i < connList.length) {
        debug('Removing ' + connList[i].role + ' in room ' + connList[i].room);
        connList.splice(i, 1);
    } else {
        debug('Connection not found for deletion');
    }
}

function listConnInfo() {
    debug('Number of registered connections is ' + connList.length);
    for (var i = 0; i < connList.length; i++) {
        debug(+i + ': ' + connList[i].role + ' in room ' + connList[i].room);
    }
}

function getAvailableProvider(room) {
    for (var i = 0; i < connList.length; i++) {
        if (connList[i].role === 'PROVIDER' &&
            connList[i].room === room &&
            connList[i].other == null) {
            break;
        }
    }
    if (i === connList.length) {
        return null;
    } else {
        return connList[i];
    }
}


server = http.createServer(function(req, res) {
    return true;
});

server.listen(serverPort, function() {
    debug('Server is listening on port ' + serverPort);
});

wsServer = new websocket.server({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', function(request) {
   var conn = request.accept('talk2us', request.origin);
    debug('Connection from ' + conn.remoteAddress + ' accepted');

    conn.on('message', function(message) {
       if (message.type === 'utf8') {
           processMessage(this, message.utf8Data);
       } else if (message.type === 'binary'){
           debug('Received ' + message.binaryData.length +
                 ' bytes of binary data unexpectedly');
       } else {
           debug('Unexpected message type ' + message.type);
       }
    });

    conn.on('close', function(reasonCode, description) {
        debug('Closed connection ' + conn.remoteAddress + 
              ' reason ' + reasonCode);
        removeConnInfo(this);
        listConnInfo();
    });

    function processMessage(connection, data) {
        var conn = null
          , item = null
          , senderInfo = null
          , receiverInfo = null
          , msg = JSON.parse(data);

        debug('Received msg of type ' + msg.msg_type);
 
        switch(msg.msg_type) {

        case 'ROOM':
            if (getConnInfo(connection)) {
                debug('ROOM request sent from existing connection');
                return;
            }
            var connInfo = new ConnInfo(connection, msg.role, 
                                        msg.room, null);
            connList.push(connInfo);
            debug('New ' + msg.role + ' connection in room ' + msg.room);
            break;

        case 'OFFER':
            senderInfo = getConnInfo(connection);
            if (!senderInfo) {
                debug('Offer received from unknown connection');
                return;
            }
            if (senderInfo.role !== 'CLIENT') {
                debug('Exception: only CLIENT can make offer');
                return;
            }
            debug('Offer from ' + senderInfo.role + 
                  ' in room ' + senderInfo.room);

            receiverInfo = getAvailableProvider(senderInfo.room);
            if (!receiverInfo) {
                debug('No provider found in room ' + senderInfo.room);
                listConnInfo();
                return;
            }
            senderInfo.other = receiverInfo.conn;
            receiverInfo.other = senderInfo.conn;
            receiverInfo.conn.send(JSON.stringify(msg));
            break;

        case 'ANSWER':
            senderInfo = getConnInfo(connection);
            if (!senderInfo) {
                debug('Answer received from unknown connection');
                return;
            }
            senderInfo.other.send(JSON.stringify(msg));
            break;

        case 'CANDIDATE':
            senderInfo = getConnInfo(connection);
            if (!senderInfo) {
                debug('Candidate received from unknown connection');
                return;
            }
            if (!senderInfo.other) {
                debug('Peer unknown for sending candidate');
                return;
            }
            senderInfo.other.send(JSON.stringify(msg));
            break;

        case 'HANGUP':
            senderInfo = getConnInfo(connection);
            if (!senderInfo) {
                debug('Hangup received from unknown connection');
                return;
            }
            if (!senderInfo.other) {
                debug('Peer unknown for sending hangup');
                return;
            }
            receiverInfo = getConnInfo(senderInfo.other);
            senderInfo.other.send(JSON.stringify(msg));
            // Remove the pairing information
            if (receiverInfo) {
                receiverInfo.other = null;
            } else {
                debug('Recepient for hangup not registered');
            }
            senderInfo.other = null;
            break;

        default:
            debug('Unknown message type ' + msg.msg_type);
            break;
        }
    }
});
