(function () {
	var d = document,
	w = window,
	p = parseInt,
	dd = d.documentElement,
	db = d.body,
	dc = d.compatMode == 'CSS1Compat',
	dx = dc ? dd: db,
	ec = encodeURIComponent;
	
	
	w.CHAT = {
		msgObj:d.getElementById("message"),
		screenheight:w.innerHeight ? w.innerHeight : dx.clientHeight,
		username:null,
		userid:null,
		socket:null,
		oFlag:true,
		//让浏览器滚动条保持在最低部
		scrollToBottom:function(){
			w.scrollTo(0, this.msgObj.clientHeight);
		},
		//滑出表情框
		doMove:function(){
			var oThis=this;
			var inputBox=d.getElementById('inputBox');
			clearInterval(this.timer);
			var targetHeight=null;
			var emojiBox=d.getElementById('emojiWrapper'); 
			this.oFlag?(targetHeight=200,emojiBox.style.display='block'):(targetHeight=100,emojiBox.style.display='none');
			this.timer=setInterval(function(){
				var speed=(targetHeight-inputBox.offsetHeight)/5;
				speed=speed>0?Math.ceil(speed):Math.floor(speed);
                inputBox.offsetHeight==targetHeight?(clearInterval(oThis.timer),oThis.msgObj.style.paddingBottom=targetHeight+'px',oThis.scrollToBottom()) 
                :(inputBox.style.height=inputBox.offsetHeight+speed+'px');
			},30);
			
		},
		//退出，本例只是一个简单的刷新
		logout:function(){
			//this.socket.disconnect();
			location.reload();
		},
		//提交聊天消息内容
		submit:function(){
			var content = d.getElementById("content").value;
			if(content != ''){
                content=this.sendEmoji(content);
				var obj = {
					userid: this.userid,
					username: this.username,
					content: content
				};
				this.socket.emit('message', obj);
				d.getElementById("content").value = '';
				this.oFlag=false;
				this.doMove();
			}
			return false;
		},
		submitImg:function(){
			 var oThis=this;
			//检查是否有文件被选中
		     if (this.files.length != 0) {
		        //获取文件并用FileReader进行读取
		         var file = this.files[0],
		             reader = new FileReader();
		         if (!reader) {
		         
		             this.value = '';
		             return;
		         };
		        
		         reader.onload = function(e) {
		            //读取成功，显示到页面并发送到服务器
		            
		             var obj = {
						userid: oThis.userid,
						username: oThis.username,
						content: e.target.result
					};
		             oThis.socket.emit('img', obj);
		             //that._displayImage('me', e.target.result);
		         };
		         reader.readAsDataURL(file);
		     };

		},
		genUid:function(){
			return new Date().getTime()+""+Math.floor(Math.random()*899+100);
		},
		//更新系统消息，本例中在用户加入、退出的时候调用
		updateSysMsg:function(o, action){
			//当前在线用户列表
			var onlineUsers = o.onlineUsers;
			//当前在线人数
			var onlineCount = o.onlineCount;
			//新加入用户的信息
			var user = o.user;
				
			//更新在线人数
			var userhtml = '';
			var separator = '';
			for(key in onlineUsers) {
		        if(onlineUsers.hasOwnProperty(key)){
					userhtml += separator+onlineUsers[key];
					separator = '、';
				}
		    };
			d.getElementById("onlinecount").innerHTML = '当前共有 '+onlineCount+' 人在线，在线列表：'+userhtml;
			
			//添加系统消息
			var html = '';
			html += '<div class="msg-system">';
			html += user.username;
			html += (action == 'login') ? ' 加入了聊天室' : ' 退出了聊天室';
			html += '</div>';
			var section = d.createElement('section');
			section.className = 'system J-mjrlinkWrap J-cutMsg';
			section.innerHTML = html;
			this.msgObj.appendChild(section);	
			this.scrollToBottom();
		},
		//第一个界面用户提交用户名
		usernameSubmit:function(){
			var username = d.getElementById("username").value;
			if(username != ""){
				// d.getElementById("username").value = '';
				// d.getElementById("loginbox").style.display = 'none';
				// d.getElementById("chatbox").style.display = 'block';
				this.init(username);

			}
			return false;
		},
		initEmoji:function(){
			var emojiBox=d.getElementById('emojiWrapper');
			var oFrag=document.createDocumentFragment();
			for(var i=20;i>0;i--){
				var oImg=d.createElement('img');
				oImg.src='content/emoji/'+i+'.gif';
				oImg.title=i;
				oFrag.appendChild(oImg);
			};
			emojiBox.appendChild(oFrag);
			this.checkEmoji();
		},
		checkEmoji:function(){
			var emojiBox=d.getElementById('emojiWrapper');
			emojiBox.addEventListener('click',function(event){
				var event=event||window.event;
				var target=event.target;
				var content = d.getElementById("content");
				if(target.nodeName.toLowerCase()=='img'){
					content.focus();
					content.value=content.value+'[emoji:'+target.title+']';
				}
			});
		},
		sendEmoji:function(msg){
			var reg=/\[emoji:\d+\]/g;
			var match=null;
			var emojiIndex=null;
			var maxIndex=d.getElementById('emojiWrapper').children.length;
			while(match=reg.exec(msg)){
				emojiIndex=match[0].slice(7,-1);
				if(emojiIndex>maxIndex){
					msg=msg.replace(match[0],'[x]')
				}else{
					msg=msg.replace(match[0],'<div><img src="content/emoji/'+emojiIndex+'.gif"/></div>')
				}
			}
            return msg;
		},
		init:function(username){
			/*
			客户端根据时间和随机数生成uid,这样使得聊天室用户名称可以重复。
			实际项目中，如果是需要用户登录，那么直接采用用户的uid来做标识就可以
			*/
			this.userid = this.genUid();
			this.username = username;
			
			// d.getElementById("showusername").innerHTML = this.username;
			// //this.msgObj.style.minHeight = (this.screenheight - db.clientHeight + this.msgObj.clientHeight) + "px";
			// this.scrollToBottom();
			
			//连接websocket后端服务器
			this.socket = io.connect();
			
			//告诉服务器端有用户登录
			this.socket.emit('login', {userid:this.userid, username:this.username});
			var oThis=this;
			//监听新用户登录
			this.socket.on('login', function(o){
				d.getElementById("username").value = '';
				d.getElementById("loginbox").style.display = 'none';
				d.getElementById("chatbox").style.display = 'block';
				d.getElementById("showusername").innerHTML = oThis.username;
				//this.msgObj.style.minHeight = (this.screenheight - db.clientHeight + this.msgObj.clientHeight) + "px";
				oThis.scrollToBottom();
				CHAT.updateSysMsg(o, 'login');	
			});
			//监听是否重名
			this.socket.on('nickExisted',function(){
                alert('用户名已存在');
                location.reload();
                d.getElementById("username").focus();
			})
			//监听用户退出
			this.socket.on('logout', function(o){
				CHAT.updateSysMsg(o, 'logout');
			});
            
            //监听图片发送
			this.socket.on('newImg', function(obj) {
			    var isme = (obj.userid == CHAT.userid) ? true : false;
				var contentDiv = '<div>'+'<a href="' + obj.content + '" target="_blank"><img src="' + obj.content + '"/></a>'+'</div>';
				var usernameDiv = '<span>'+obj.username+'</span>';
				
				var section = d.createElement('section');
				if(isme){
					section.className = 'user';
					section.innerHTML = contentDiv + usernameDiv;
				} else {
					section.className = 'service';
					section.innerHTML = usernameDiv + contentDiv;
				}
				CHAT.msgObj.appendChild(section);
				CHAT.scrollToBottom();	
			});
			
			//监听消息发送
			this.socket.on('message', function(obj){
				var isme = (obj.userid == CHAT.userid) ? true : false;
				var contentDiv = '<div>'+obj.content+'</div>';
				var usernameDiv = '<span>'+obj.username+'</span>';
				
				var section = d.createElement('section');
				if(isme){
					section.className = 'user';
					section.innerHTML = contentDiv + usernameDiv;
				} else {
					section.className = 'service';
					section.innerHTML = usernameDiv + contentDiv;
				}
				CHAT.msgObj.appendChild(section);
				CHAT.scrollToBottom();	
			});
            
            this.initEmoji();

            var emojiImg=d.getElementById('emoji_img');
            emojiImg.addEventListener('click',function(){
            	CHAT.oFlag=true;
            	CHAT.doMove();
            })
		}
	};
	//通过“回车”提交用户名
	d.getElementById("username").onkeydown = function(e) {
		e = e || event;
		if (e.keyCode === 13) {
			CHAT.usernameSubmit();
		}
	};
	//通过“回车”提交信息
	d.getElementById("content").onkeydown = function(e) {
		e = e || event;
		if (e.keyCode === 13) {
			CHAT.submit();
		}
	};
	d.getElementById('img_box').addEventListener('change', function() {
		 var oThis=this;
			//检查是否有文件被选中
		     if (this.files.length != 0) {
		        //获取文件并用FileReader进行读取
		         var file = this.files[0],
		             reader = new FileReader();
		         if (!reader) {
		         
		             this.value = '';
		             return;
		         };
		        
		         reader.onload = function(e) {
		            //读取成功，显示到页面并发送到服务器
		             var obj = {
						userid: CHAT.userid,
						username: CHAT.username,
						content: e.target.result
					};
		             CHAT.socket.emit('img', obj);
		             //that._displayImage('me', e.target.result);
		         };
		         reader.readAsDataURL(file);
		     };
	},false);
})();
