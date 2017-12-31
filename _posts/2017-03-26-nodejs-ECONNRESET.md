---
layout: post
title: Node.js抛异常ECONNRESET退出
date: 2017-03-26 14:15:53
tags:
- Node.js
categories:
- 技术积累
comments: true
---
项目中需要对接公司域账户对其他模块提供鉴权服务。为方便实现Restful接口，以及学习一门没用过的技术，于是决定使用Node.js开发实现。
## LDAP鉴权服务接口
该服务实现两个功能，一个是和LDAP服务器对接鉴权域登录，一个是对外以Restful API的方式提供服务。Node.js的库[ldapjs](http://ldapjs.org/)和[Express](https://expressjs.com/)可以很简单的完成这两个功能。实现大体框架如下
```js
var express = require('express');
var ldap = require('ldapjs');
...
var app = express();

app.post(
    'auth',
    function(req, res){
        var user = {
            username: req.body.username,
            password: req.body.password,
            dn      : ''
        }
        var adminClient = ldap.creatClient({url:url});
        adminClient.bind(admin.dn, admin.password, function(err){
            assert.ifError(err);

            adminClient.search(base, opts, function(err, search){
                search.on('searchEntry', function(entry){
                    user.dn = entry.dn; 
                    var userClient = ldap.createClient({url:url});
                    userClient.bind(user.dn, user.password, function(err){
                        if(err){
                            res.json({'status':2, 'message':'invalid password'});
                        }

                        res.json({'status':0, 'message':'auth ok'});
                    });
                });

                search.on('end', function(err){
                    if(user.dn === ''){
                        res.json({'status': 1, 'message': 'invalid user'});
                    }
                });
            });
        });
    }
);

app.listen(8080, function(){
    console.log('listening on port 8080');
});
```
完成后，使用postman测试了下，功能没有问题。但程序会在十几分钟后抛出异常，退出执行。
```js
events.js:72
        throw er; 
              ^
Error: read ECONNRESET
    at errnoException (net.js:900:11)
    at TCP.onread (net.js:555:19)
```
遂Google了一下Nodejs ECONNRESET。
## Node.js ECONNRESET
stackoverflow上有一个问答专门探讨这个[问题](http://stackoverflow.com/questions/17245881/node-js-econnreset)，简单摘录一下回答

{% blockquote e-sushi http://stackoverflow.com/a/17637900 ECONNRESET %}
"ECONNRESET" means the other side of the TCP conversation abruptly closed its end of the connection. This is most probably due to one or more application protocol errors. You could look at the API server logs to see if it complains about something.

{% endblockquote %}

ECONNRESET表示TCP会话的另一端突然断开了连接。很大可能性是由应用的协议出错造成的。这里我有两个连接，一个是Restful接口的连接，一个是ldap的连接。

{% blockquote John Williams http://stackoverflow.com/a/17798353 ECONNRESET %}

I had a similar problem where apps started erroring out after an upgrade of Node. I believe this can be traced back to Node release v0.9.10 this item:

net: don't suppress ECONNRESET (Ben Noordhuis)

Previous versions wouldn't error out on interruptions from the client. A break in the connection from the client throws the error ECONNRESET in Node. I believe this is intended functionality for Node, so the fix (at least for me) was to handle the error, which I believe you did in unCaught exceptions. Although I handle it in the net.socket handler.

{% endblockquote %}

从Node v0.9.10开始不再压制ECONNRESET，之前的版本从客户端中断时不会报错。现在从客户端中断会抛出ECONNRESET错误，这是Node的预期功能。解决方法是处理这个错误，因为这是一个未捕获的异常。

## 原因分析
综上可总结该问题的原因：
1. Node退出是因为出现未捕获的异常，异常为`read ECONNRESET`错误。
2. `ECONNRESET`是因为TCP连接的对端(通常是server)突然断开了连接。server一般都设置了`keepalive`，对于不活动的连接会超时断开。
3. 客户端请求完成后没有主动断开连接。

## 解决方法
简单的解决方法就是捕获这个异常，如果无法定位出具体出这个异常的地方，可以在进程级捕获进行分析。
```js
process.on('uncaughtException', function(err) {
    console.log(err.stack);
    console.log('NOT exit...');
});
```
而在本例中，作为客户端请求的是ldap，ldap服务器断开了不活动的连接，应该由ldap来捕获异常，但[官方文档](http://ldapjs.org/client.html)并没有相关说明。在github该库的[issue](https://github.com/mcavage/node-ldapjs/issues/318)中找到了捕获方法。client有监听error事件功能，以及可以设置client自动重连，官方文档未更新。基本用法如下：
```js
var client = ldap.creatClient({url:url, reconnect: true});
...
client.on('error', function(err){
    console.log(err);
});
```
对于小的应用请求而言，client主动断开连接是比较优雅的做法，根据该issue，client具有`destroy`方法，可以主动销毁创建的client对象。基本用法如下：
```js
client.unbind();
client.destroy();
```
但测试了一下并没有起作用。这里采用client捕获异常防止进程退出的方法。
