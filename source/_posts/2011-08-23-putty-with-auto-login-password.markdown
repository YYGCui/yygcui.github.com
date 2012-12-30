---
comments: true
date: 2011-08-23 19:35:20
layout: post
title: 修改PuTTY实现保存密码自动登录
categories:
- C/C++
- Programming
tags:
- auto-login
- password
- putty
---

一直钟情于PuTTY的小巧精悍，是我SSH连接之必选。虽然喜欢这款软件的小巧，但亦要承受其不方便之苦。最希望PuTTY添加的两个功能是自动登录和Tab支持。这也是众多使用者的wishlist，但官方已明确的断了大家的念想。
关于自动登录(auto-login password)，当然需要保存密码的功能，官方的回应是记住密码会带来显著的安全问题：任何能使用你的设备的人都能轻而易举的得到你的密码，使用它，甚至滥用他。建议通过SSH的公钥验证来自动登录，它更加方便和安全。详细回应[参看这里](http://www.chiark.greenend.org.uk/~sgtatham/putty/faq.html#faq-password-remember)。
关于Tab支持，官方的回应是需要重构windows相关的代码，代价比较大，再者并不是所有人都喜欢tab...，详细回应[参看这里](http://www.chiark.greenend.org.uk/~sgtatham/putty/wishlist/multiple-connections.html)。
<!-- more -->
PuTTY是开源的，我们可以很容易得到它的源代码，这是能够修改PuTTY功能的前提。在PuTTY的Connection->Data选项中有Auto-login username这一项，我们可以在源代码中定位到插入点，文件为Config.c ，Auto-login password就是要插入的密码文本框项(Line5-9)。事实上，username是修改整个代码的参照系，从以下代码片段中也可以看出。
``` c    
    ctrl_editbox(s, "Auto-login username", 'u', 50,
        HELPCTX(connection_username),
		dlg_stdeditbox_handler, I(offsetof(Config,username)),
		I(sizeof(((Config *)0)-&gt;username)));
    c = ctrl_editbox(s, "Auto-login password", 'w', 50,
		HELPCTX(connection_password),
		dlg_stdeditbox_handler, I(offsetof(Config,password)),
		I(sizeof(((Config *)0)-&gt;password)));
    c-&gt;editbox.password = 1; //password type, do not display directly
```    
定位HELPCTX函数，文件为windows/<del>Winhelp.c</del>Winhelp.h，在connection_username行下插入(Line2)：
``` c 
    #define WINHELP_CTX_connection_username "connection.username:config-username"
    #define WINHELP_CTX_connection_password "connection.password:config-password"
```
定位Config变量，得知其为config_tag类型的结构体，定位到putty.h，在该结构体中加入password的声明(Line2)：
``` c    
    char username[100];
    char password[100];
```
接下来就是对password的处理了，在ssh连接的auto login时，会处理username，同理在该函数中，添加对password的处理。ssh连接有两种方式：ssh1和ssh2，所以对应的两个函数都要修改。文件为Ssh.c。对ssh1的修改如下(位于do_ssh1_login()中)(Line8-18)：
``` c 
    /*
    * Show password prompt, having first obtained it via a TIS
    * or CryptoCard exchange if we're doing TIS or CryptoCard
    * authentication.
    */
    {
        int ret; /* need not be kept over crReturn */
    	if (strlen(ssh->cfg.password) == 0) {
    	    ret = get_userpass_input(s->cur_prompt, NULL, 0);
    	    while (ret < 0) {
    		ssh->send_ok = 1;
    		crWaitUntil(!pktin);
    		ret = get_userpass_input(s->cur_prompt, in, inlen);
    		ssh->send_ok = 0;
    	    }
    	} else {
    		ret = 1;
    		strcpy(s->cur_prompt->prompts[0]->result, ssh->cfg.password);
    	}
```
对ssh2的修改如下(位于do_ssh2_authconn()中)(Line17-27)：
``` c
    /*
    * Plain old password authentication.
    */
    int ret; /* not live over crReturn */
    int changereq_first_time; /* not live over crReturn */
    
    ssh->pkt_actx = SSH2_PKTCTX_PASSWORD;
    
    s->cur_prompt = new_prompts(ssh->frontend);
    s->cur_prompt->to_server = TRUE;
    s->cur_prompt->name = dupstr("SSH password");
    add_prompt(s->cur_prompt, dupprintf("%.90s@%.90s's password: ",
        s->username,ssh->savedhost),FALSE, SSH_MAX_PASSWORD_LEN);
    
    if (strlen(ssh->cfg.password) == 0) {
        ret = get_userpass_input(s->cur_prompt, NULL, 0);
    	while (ret < 0) {
    	    ssh->send_ok = 1;
    		crWaitUntilV(!pktin);
    		ret = get_userpass_input(s->cur_prompt, in, inlen);
    		ssh->send_ok = 0;
    	}
    } else {
    	ret = 1;
        strcpy(s->cur_prompt->prompts[0]->result, ssh->cfg.password);
    }
```
至此，ssh的Auto-login password已实现。但是还需要就password的保存绑定到load和save功能上，这两个功能的实现位于在Settings.c文件中。在函数save_open_settings()中添加(Line2)：
``` c
    write_setting_s(sesskey, "UserName", cfg->username);
    write_setting_s(sesskey, "PassWord", cfg->password);
```
在函数load_open_settings()中添加(Line2)：
``` c
    gpps(sesskey, "UserName", "", cfg->username, sizeof(cfg->username));
    gpps(sesskey, "PassWord", "", cfg->password, sizeof(cfg->password));
```
至此，所有代码修改完成，根据README文件的提示，我使用MinGW编译了一下，MinGW可以在[这里](http://www.mingw.org/)得到。编译方法如下：
``` bash    
    $cd putty-src/windows
    $make -f makefile.cyg
```    
在该windows目录下生成所有的可执行文件。如果你不想修改编译，可以直接下载我编译好的，下载地址在[这里](http://www.box.net/shared/3j344ux1ssc5681m5qgd)。

**Update:** 修改后的源代码已经放在Github上：[putty-improvement](https://github.com/YYGCui/putty-improvement)。
