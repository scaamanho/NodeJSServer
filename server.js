var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var express = require('express');

//Configuramos sockets y conexiones http
var io, serverCfg;

//No limitamos el numero de procesos
process.setMaxListeners(0);
startServer();

//Leemos fichero con configuracion del server e iniciamos componentes
function startServer() {
  fs.readFile(__dirname + '/server.cfg', 'utf8', function (err, data) {
    if (err)
      return console.log(err);
    //Almacenams configuracion en un objeto parseado por JSON
    serverCfg = JSON.parse(data);
    console.log('[*] server configuration loaded');
    initComponents();
  });
}

//Inicializamos Servidor web y registramos colas amqp
function initComponents() {
  //Arrancamos servidor de sockets
  initHttpdServer(serverCfg.serverProtocol, serverCfg.serverPort);
  console.log('[*] ' + serverCfg.serverProtocol +
              ' server running on port:' + serverCfg.serverPort);
}

function initHttpdServer(protocol, port) {
  var app = express();
  app.use(express.static(__dirname + '/public/'));

  //Configure Https Server
  if (protocol === 'https') {
    console.log('Configuring https server');
    //SSL certificates [create_cert.ssh]
    var sslOptions = {
      key: fs.readFileSync('./ssl/server.key'),
      cert: fs.readFileSync('./ssl/server.crt'),
      ca: fs.readFileSync('./ssl/ca.crt'),
      requestCert: true,
      rejectUnauthorized: false
    };

    app.listen = function() {
      httpd = https.createServer(sslOptions,this);
      return httpd.listen.apply(httpd, arguments);
    };
  }

  //Arrancamos servidor web static
  var server = app.listen(port);

  //Arrancamos web sockets
  io = require('socket.io').listen(server);

  //Subimos el nivel de log de la libreria sockets
  io.set('log level', 0);

  //Gestor Clientes Websockets
  //Este metodo se ejecuta antes que io.sockets.on('connection'
  io.set('authorization', function (handshakeData, cb) {
    //en handshakeData._query.profiles vendrán los profiles como un string separados por ;
    //para autorizar ejecutar cb(null, true) y para desautorizar ejecutar cb(null, false)
    cb(null, true);
  });

  //Este metodo se ejecuta si se ha sido autorizado en la funcion de authorization
  io.on('connection', function (socket) {
    try {
      // en socket.handshake.query.profiles vienen los profiles como un string separados por ;
      //console.log(socket.handshake.query.profiles);
      channel = socket.handshake.query.channel;
      userName = socket.handshake.query.userName;
      socket.join(channel);
      console.log(userName+' connected in chanel:'+channel);
    } catch(e) {
      console.log(e.message);
      console.log('Error login user with data:' + socket.handshake.query.profiles);
    }

    socket.on('chatUpdate', function (data) {
      //TODO Sebd message to
      channel = socket.handshake.query.channel;
      broadcastMessage(channel, 'chatUpdate', data);
    });

    socket.on('disconnect', function (data) {
      channel = socket.handshake.query.channel;
      userName = socket.handshake.query.userName;
      console.log(userName+' disconnected from chanel:'+channel);
    });
  });
}



function broadcastMessage (channel,msgType,msg) {
  msg = filterEmbedCode (msg);
  if (channel && channel !== 'ALL') {
    console.log ('broadcasting '+msgType+' to channel:'+channel);
    io.sockets.in (channel).emit (msgType,msg);
  } else {
    console.log ('broadcasting '+msgType+' to ALL');
    io.sockets.emit (msgType,msg);
  }
}

//Funccion que filtra codigo embeido del chat
function filterEmbedCode(data) {
  var text = data.text;
  if(text != null) {
    text = text.replace('<', '');
    text = text.replace('>', '');
    text = text.replace('script', '_script_');
    text = text.replace('javascript', '_javascript_');
    text = text.replace('eval', '_eval_');
    data.text = text;
  } else {
    data.text={};
  }
  return data;
}
