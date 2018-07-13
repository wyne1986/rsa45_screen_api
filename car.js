/*
* create by wyne
* 366659539@qq.com
*/
var net = require("net");
var http = require('http');
var dgram = require('dgram');
var iconv = require('iconv-lite');

var device;
/*ascii转字符串*/
function code2str(arr){
	var str = '';
	for(var i=0;i<arr.length;i++){
		str += String.fromCharCode(arr[i]);
	}
	return str;
}

/*局域网搜索设备,异步回调方法获得设备列表数组*/
function searchDevice(cb){
	var devices = [];
	var address = [];

	var socket = dgram.createSocket("udp4");
	socket.bind(function () {
		socket.setBroadcast(true);
	});
	socket.on('message',function(msg,rinfo){
		var list = [];
		for(var i=0;i<msg.length;i++){
			if(i>=17)list.push(msg[i]);
		}
		var result = new Buffer(list,'GBK');
		var str = iconv.decode(result, 'GBK');
		var strs = str.replace(/(\.)\s{2}/g,'$1').replace(/(:)\s{1}/g,'$1').replace(/：/g,':').trim();
		var finarr = strs.split('  ');
		var fin = {
			"MAC":finarr[0].substr(4),
			"IP":finarr[1].substr(5),
			"GW":finarr[2].substr(5),
			"NETMASK":finarr[3].substr(5),
			"PORT":parseInt(finarr[4].substr(5)),
			"SDAY":finarr[5].substr(10),
			"LDAY":finarr[6].substr(10),
			"INFO":finarr[7].substr(5),
			"STYPE":finarr[8].substr(6)
		};
		if(address.indexOf(rinfo.address)==-1){
			address.push(rinfo.address);
			devices.push(fin);
		}
	});
		
	var message = code2str([104,101,97,100,80,0,0]);
	socket.send(message, 0, message.length, 4000, '255.255.255.255');
	
	setTimeout(function(){
		cb(devices);
		socket.close();
	},300);
}

/*初始化连接设备*/
function clientInit(device,cb){
	var client = new net.Socket();
	client.connect(device.PORT, device.IP, function () {
		device.write = function(head,msg,end){
			var end = end || [0,0];
			var msg = msg || '';
			client.write(iconv.encode(code2str(head)+msg+code2str(end),'GB2312'));
		}
		/*请求获取设备信息*/
		device.write(iconv.encode(code2str([104,101,97,100,15,0,0]),'GB2312'));
	});

	client.on("data", function (data) {
		/*获取设备信息并调用回调方法*/
		if(parseInt(data[4])==15){
			cb(data);
		}
	});
	
	client.on("close",function(){
		device.client = null;
	});
	
	/*心跳包*/
	setInterval(function(){
		device.write(iconv.encode(code2str([104,101,97,100,255,0,0]),'GB2312'));
	},2000);
	
	return device;
}


/*测试,初始化方法调用查找设备并连接*/
searchDevice(function(devices){
	device = clientInit(devices[0],function(data){
		console.log(data);/*在这里解析data数据并保存设备信息*/
	});
});

/*测试发送*/
setTimeout(function(){
	device.write([104,101,97,100,1,0,0],'阿弥陀佛');
},2000);
