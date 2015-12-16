var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

// app.get('/', function(req, res){
// 	res.send('<h1>Welcome Realtime Server</h1>');
// });
app.use('/', express.static(__dirname + '/client'));

server.listen(process.env.PORT || 3000);
//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;

io.on('connection', function(socket){
	console.log('a user connected');
	
	//监听新用户加入
	socket.on('login', function(obj){
		//将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
		socket.name = obj.userid;
		
		//检查在线列表，如果不在里面就加入
		if(!onlineUsers.hasOwnProperty(obj.userid)) {
			var userList=JSON.stringify(onlineUsers);
			//userList=userList.split(',');
			
			if(userList=='{}'){
				onlineUsers[obj.userid] = obj.username;
				//在线人数+1
				onlineCount++;
				//向所有客户端广播用户加入
				io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
				console.log(obj.username+'加入了聊天室');
			}else{
				
				if(userList.indexOf(obj.username)>-1){
					socket.emit('nickExisted');
				}else{
					onlineUsers[obj.userid] = obj.username;
					//在线人数+1
					onlineCount++;
					//向所有客户端广播用户加入
					io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
					console.log(obj.username+'加入了聊天室');
				}
			}		
		}		
		
	});
	
	//监听用户退出
	socket.on('disconnect', function(){
		//将退出的用户从在线列表中删除
		if(onlineUsers.hasOwnProperty(socket.name)) {
			//退出用户的信息
			var obj = {userid:socket.name, username:onlineUsers[socket.name]};
			
			//删除
			delete onlineUsers[socket.name];
			//在线人数-1
			onlineCount--;
			
			//向所有客户端广播用户退出
			io.emit('logout', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
			console.log(obj.username+'退出了聊天室');
		}
	});
	
	//监听用户发布聊天内容
	socket.on('message', function(obj){
		//向所有客户端广播发布的消息
		io.emit('message', obj);
		console.log(obj.username+'说：'+obj.content);
	});

	//接收用户发来的图片
	 socket.on('img', function(obj) {
	    //通过一个newImg事件分发到除自己外的每个用户
	     io.emit('newImg', obj);
	 });
  
});


