var express = require('express'),
app = express(),
port = 8080,
backlog = {},
rooms = {};
fileuser = []; 
fileroom = [];
filepass=[];
//var https = require('https');
//var fs = require('fs');
//var options = {
//  key: fs.readFileSync('key.pem'),
// cert: fs.readFileSync('cert.pem') };
//var server = https.createServer(options, app);
//var io = require('socket.io')(server);

const http= require('http').Server(app);
var io = require('socket.io')(http);

var bodyParser = require('body-parser');	
var multer = require('multer');
const path = require('path');
var ejs = require('ejs');
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('app'));


const storage = multer.diskStorage({
	destination: './public/uploads/',
	filename: function(req, file, cb){
	  cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
	}
  });
// Init Upload
const upload = multer({
	storage: storage,
	limits:{fileSize: 1000000},
	fileFilter: function(req, file, cb){
	  checkFileType(file, cb);
	}
  }).single('myImage');
// Check File Type
function checkFileType(file, cb){
	const filetypes = /jpeg|jpg|png|gif/;
	const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
	const mimetype = filetypes.test(file.mimetype); // Check mime
	if(mimetype && extname){
	  return cb(null,true);
	} else {
	  cb('Error: Images Only!');
	}
  }

  app.get('/', (req, res) => res.render('index'));

  io.on('connection', function(socket){
	var username = undefined,
		room = undefined ;
		
  app.get('/download' , function(req, res) {
	var filenm = req.param('file');
	console.log("downloaded", filenm)
	res.download("./public/uploads/"+ filenm );
  });	
 
  app.post('/upload', (req, res) => {
		upload(req, res, (err) => {
		  if(err){
			res.render('index', {msg: err});
		  } else {
			if(req.file == undefined){
			  res.render('index',
			  { msg: 'Error: No File Selected!'});
			} else {
			console.log("upload file", req.file.filename)
			res.render('index',{
				msg: 'File Uploaded!',
				name : req.username,
				file: `uploads/${req.file.filename}`,
			  });
			  io.to(fileroom[0]).emit('msg', {
				name : fileuser[0],
				room : fileroom[0],
				sentby : filepass[0],
				msg: "link file",
				file : true,
				filename : req.file.filename } )
		}
		} });
	  });

	function leave() {
		if(room && username) {
			for (var i = 0; i < rooms[room].users.length; i++) {
				if(rooms[room].users[i] === username) {
					rooms[room].users.splice(i, 1);
					if(rooms[room].users.length === 0) delete rooms[room];
					break;
				}
			};
			io.to(room).emit('msg', {
				name: "system",
				room: room,
				msg: username + " has left the room."
			});
		}
	}

	socket.on('join-room', function(msg){
		username = msg.name;
		room = msg.room;

		if(!rooms[msg.room]) rooms[msg.room] = {users: [msg.name], backlog: []};
		else rooms[msg.room].users.push(username);
		
		msg.name = "system";
		io.to(msg.room).emit('msg', msg);
		socket.join(msg.room);
	  });

	socket.on('disconnect', function(){
		leave();
	});


	socket.on('leave-room', function(msg){
		socket.leave(room);
		leave();
  	});

	socket.on('users', function() {
		socket.emit('msg', {
			name: "system",
			room: room,
			msg: "users: " + rooms[room].users.join(', ')
		});
	});

	socket.on('rooms', function() {
		var temp = []
		for(var room in rooms) {
			if (rooms.hasOwnProperty(room)) {
				temp.push(room);
			}
		}
		socket.emit('msg', {
			name: "system",
			room: "global",
			msg: "rooms: " + temp.join(', ')
		})
	})

	socket.on('history', function() {
		for (var i = 0; i < rooms[room].backlog.length; i++) {
			socket.emit('msg', rooms[room].backlog[i]);
		};
	});

  	socket.on('msg', function(msg) {
		  console.log("msges to client", msg)
		if(msg.file){
			fileuser[0] = msg.name;
			fileroom[0] = msg.room;
			filepass[0] = msg.sentby;
		}else{
  		rooms[msg.room].backlog.push(msg);
		  io.to(msg.room).emit('msg', msg); }
  	})
});
//ngrok.exe http 8080
//./ngrok authtoken FUNVz1TZrBejJ14irwnB_7sF8nVhoy4RPFWrFJ8oKW

//server.listen(port, function(){
http.listen(port, function() {
console.log('server running at %s port', port);
});

