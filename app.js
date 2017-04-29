var express = require('express'),
    app = express(),
    url = require('url'),
    rooms = require('roomsjs'),
    roomdb = require('rooms.db'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    mongoose = require('mongoose'),
    users = {},
    path = require('path'),
    fs = require('fs');
var request = require("request");


server.listen(3000);


var html;
fs.readFile(__dirname + '/room.html', 'utf8', function(err, data) {
    if (err) {
        return console.log(err);
    }
    html = data.toString();
});



//app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/img', express.static(__dirname + '/public/img'));
app.use('/public/js', express.static(__dirname + '/public/js'));

app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'rooms/room')));
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/paint', function(err) {
    if (err) {
        console.log(err)
    } else {
        console.log('connected to mongodb!');
    }
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    room: String,
    created: { type: Date, default: Date.now }
});

var roomSchema = mongoose.Schema({
    name: String,
	date:String,
	connected:{type:String,default:'true'},
    count: { type: Number, default: 1 }
});

var peopleSchema = mongoose.Schema({
	index: { type: Number, default: 0 },
    name: String,
	date:String,
	connected:{type:String,default:'true'},
    socket: String,
    room: String
});

var signUpSchema = mongoose.Schema({
    FullName: String,
	email:String,
    password: String
});

var drawSchema = mongoose.Schema({
    color: String,
    width: Number,
    room: String,
    pointx:  Number,
	pointy:Number ,
	start:String,
	end:String,
	user:String
});

var Chat = mongoose.model('Message', chatSchema);
var people = mongoose.model('People', peopleSchema);
var room = mongoose.model('room', roomSchema);
var draw = mongoose.model('draw', drawSchema);
var signup= mongoose.model('signUp',signUpSchema);
app.get('/', function(req, res) {
res.sendFile(__dirname + '/index.html');
//res.end();

	});

app.get('/user.html', function(req, res) {
res.sendFile(__dirname + '/user.html');
	});


app.get('/public/:id', function(req, res) {
   var roomname=req.path.split('/');
   roomname=roomname[2].split('.');
   console.log(roomname[0]);
   var filepath=__dirname + '/' + req.path;
   room.findOne({ name: roomname[0]}, function(err, user) {
                    if (err) throw err;
					if(user!=null)
					{
						console.log('I am here');
   fs.readFile(filepath, 'utf8', function(err, data) {
    if (err) {
        res.writeHead(404);
            res.end("These room has been deleted since there is no user on it you can create it as a new session");
        }
		else{
			 res.sendFile(filepath);
			// console.log(req.headers.referer[0])
		}
   });
					}
					else{
						if(roomname[1]=='css')
							res.sendFile(__dirname + '/public/index.css');
						else res.sendFile(__dirname + '/index.html');
					}
   });
		//res.end();

});
   


var historydraw=[];

var isAReload=false;
var session = require('client-sessions');

io.sockets.on('connection', function(socket) {	
	socket.on('signup', function(data,callback){
		console.log("signup");
		signup.findOne({ email: data.email }, function(err, su) {
            if (err) throw err;
			if(su!=null)
			{
				console.log("yas");
				callback(false);
			}
			else{
				
				var newuser = new signup({ FullName: data.name, email:data.email, password: data.password });
				newuser.save(function(err) {
				if (err) throw err;
        });
				callback(true);
			}
		});
		
	});
	
	
	socket.on('login', function(data,callback){
		console.log("login");
		signup.findOne({ email: data.email }, function(err, su) {
            if (err) throw err;
			if(su!=null)
			{
				console.log("yas");
				if(su.password==data.password)
				{
				callback(true);
				io.emit('loginuser',su.FullName);
				}
				else{
					callback(false);
				}
			
			}
			else{
				
				var newuser = new signup({ FullName: data.name, email:data.email, password: data.password });
				newuser.save(function(err) {
				if (err) throw err;
        });
				callback(true);
			}
		
	});
	});
	
	socket.on('newpage', function(data){
		room.findOne({ name: data.roomname }, function(err, roomex) {
            if (err) throw err;
			if(roomex!=null)
			{
				io.sockets.in(data.roomname).emit('usercount', {roomname: data.roomname,count:roomex.count});
			}
			});
				 socket.join(data.roomname);
			draw.find({room:data.roomname},function(err,mydraws){
				 if (err) {
					console.log(err);
						return;
						}
						if(mydraws!=null)
						{
						
			mydraws.forEach(function(mydraw, index) { 
			io.sockets.in(data.roomname).emit('draw', { color: mydraw.color,width: mydraw.width, x: mydraw.pointx,y: mydraw.pointy,room:mydraw.room ,start:mydraw.start,end:mydraw.end,user:mydraw.user} );
			});
						}	
			});
		
	});
	
    
socket.on('draw',function(data){
var drawpath=new draw({color:data.color,
width: data.width,
pointx:data.x,
pointy:data.y,
room:data.room,
start:data.start,
end:data.end,
user:data.user});
drawpath.save(function(err) {
            if (err) console.log('error');
        });
		if(data.start==="t")
		{
			console.log('start');
			io.sockets.in(data.room).emit('draw1');
		}
		else if(data.end==="t")
		{
			console.log('end');
			io.sockets.in(data.room).emit('draw1');
		}
		else{
			console.log('between');
			console.log(data.start);
			console.log(data.end);
		}
//historydraw.push({color:data.color ,width: data.width, point:data.point,room:data.room,start:data.start,end:data.end});
io.sockets.in(data.room).emit('draw', { color: data.color,width: data.width,x:data.x,y:data.y,room:data.room,start:data.start,end:data.end,user:data.user });
  }); 



   socket.on('new user', function(data) {
        username = data.name;
        roomname = data.room;
       // console.log(username + '      ' + roomname + '           ' + data.index);
        var newpeople = new people({ name: username, socket: socket.id, room: roomname, index: data.index });
        newpeople.save(function(err) {
            if (err) throw err;
        });
    });

    socket.on('changesocket', function(data) {
        people.findOneAndUpdate({ socket: data.name, room: data.room }, { $set: { socket: socket.id,index: data.index } }, function(err, newsock) {
            if (err) throw err;
            if (newsock != null) {
                socket.nickname = newsock.name;
                socket.join(newsock.room);
               
                Chat.find({ room: data.room }, function(err, docs) {
                    if (err) throw err;
                  
                    socket.emit('load old msg', docs);
                });
            } else {
               
            }

        });
    });

    socket.on('Create room', function(roomname, callback) {
        room.findOne({ name: roomname }, function(err, roomex) {
            if (err) throw err;
            if (roomex == null) {
                var newroom = new room({ name: roomname, count: 1 });
                newroom.save(function(err) {
                    if (err) throw err;
                     
                    fs.writeFile(__dirname + "/public/" + roomname + ".html", html);
                    io.emit('usercount', {roomname: roomname,count:1});
					callback(true);
                });
            
			}
			else {
                callback(false);
            }
        });

    });
	
	 socket.on('checkuser', function(data, callback) {
        roomname = data.room;
        people.findOne({ name: data.name,room:data.room }, function(err, roomex) {
            if (err) throw err;
            if (roomex == null) {
				callback(true);
			}
			else{
			
					callback(false);
			}
			});	
			});
			
    socket.on('Join room', function(data, callback, msg) {
        roomname = data.room;
        room.findOne({ name: roomname }, function(err, roomex) {
            if (err) throw err;
            if (roomex != null) {
               
                room.findOneAndUpdate({ name: roomname }, { $inc: { count: 1 } }, function(err, user) {
                    if (err) throw err;
					 socket.join(roomname);
					io.emit('usercount', {roomname: roomname,count:user.count});
                });
             
                 
                callback(true);


            } else {
               // console.log('room false');
                callback(false);
            }
        });

    });
   
    socket.on('room.leave', function() {
        var roomn;
        people.find({ socket: socket.id }, function(err, user) {
            if (err) throw err;
            roomn = user.room;
        });
        room.findOneAndUpdate({ name: romn }, { $dec: { count: 1 } }, function(err, user) {
            if (err) throw err;
            if (user.count == 0)
                user.remove(function(err) {
                    if (err) throw err;
                });
        });
        people.findOneAndUpdate({ socket: socket.id }, { $set: { room: "NULL" } }, function(err, user) {
            if (err) throw err;
        });
        io.to(roomname).emit('room.leaved', socket.id + ' leaved the ' + roomname);
        socket.leave(roomname);
      //  console.log(socket.id + 'leaved the ' + roomname);
    });
	
	
 socket.on('send message', function(data) {
        people.findOne({ socket: socket.id }, function(err, roomex) {
            if (err) throw err;
            var msg = data.msg.trim();
            if (msg.substr(0, 3) === '/w ') {
                msg = msg.substr(3);
                var ind = msg.indexOf(' ');
                if (ind != -1) {
                    var name = msg.substr(0, ind);
                    var msg = msg.substr(ind + 1);
                    if (name in users) {
                        users[name].emit('new message', { msg: msg, nick: socket.nickname });
                        console.log('whisper!');
                    }
                }
            } else {
                var newMsg = new Chat({ msg: msg, nick: socket.nickname, room: roomex.room });
                newMsg.save(function(err) {
                    if (err) throw err;
                    console.log(roomex.room);
                    io.in(roomex.room).emit('new message', { msg: msg, nick: socket.nickname });
                });
            }
        });
    });
    function updateNicknames() {
        //io.sockets.emit('usernames', Object.keys(users));
    }
	


    socket.on('disconnect', function(data) {
		var roomn;
        people.findOne({ socket: socket.id, index: 0 }, function(err, user) {
            if (err) throw err;
            if (user != null) {
                roomn = user.room;
                if (roomn != null)
                    room.findOneAndUpdate({ name: roomn }, { $inc: { count: -1 } }, function(err, roomdata) {
                        console.log(roomn + roomdata.count);
                        if (err) throw err;
                  io.emit('usercount', {roomname: roomn,count:roomdata.count});
                        //console.log(roomdata.count);
                        if (roomdata.count == 1) {   
                             console.log('before delete ' );
							 draw.remove({ room: roomn }, function (err) {
                                   if (err) return handleError(err);
                                       
                                       });
                             Chat.remove({ room: roomn }, function (err) {
                                   if (err) return handleError(err);
                                       // removed!
                                       console.log('deleted ');
                                       });
                            roomdata.remove(function(err) {
                                console.log('delete ' + roomn);
                              //  Files.delete('C:/Program Files/nodejs/Server1/public/b.html');
                                var fs = require('fs');
								var filePath = __dirname+'/public/'+roomn+'.html'; 
									fs.unlinkSync(filePath);
                               if (err) throw err;
                            });
                        }
                    });
                people.findOneAndRemove({ socket: socket.id }, function(err) {
                    if (err) throw err;
                });
            }
        });
        delete users[socket.nickname];
        updateNicknames();
});

	  
});


