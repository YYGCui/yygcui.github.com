---
layout: post
title: "tips for octopress"
date: 2013-12-01 14:52
comments: true
categories: 
- 扫盲随记
tags:
- Octopress
---
周末，把之前建立的Octopress blog在新机器上重新配置了下，顺便整理一下配置过程，以备查询。从头配置一个Octopress blog，可以直接参照[官方文档](http://octopress.org/docs/setup/)，步骤很清晰，没有什么难度。这篇文档主要整理如何在windows上重新部署Octopress。
<!--more-->
环境配置
----------
1. 安装[Git for windows](DefaultConfig.bin)。
2. 安装[Ruby for windows](http://rubyinstaller.org/downloads/)，建议使用1.9.3版本。安装完成后讲个人环境变量中`Path`的值添加到系统环境变量`Path`中。
3. 安装[Ruby Develop Kit](http://rubyinstaller.org/downloads/)，该安装包是一压缩文件，安装就是解压到某一目录，如`D:/RubyDevKit`。然后打开`Git Bash`运行如下命令：

		cd D:/RubyDevKit
		ruby dk.rb init
		ruby dk.rb install

4. 安装[Python for windows](http://www.activestate.com/activepython/downloads)，安装`x86`版本，即使在`x64`系统上。然后安装octopress使用的代码高亮系统`pygments`。

		easy_install pygments

5. 配置`Bash`环境变量，由于`Windows`使用的`GBK`字符编码，`Octopress`使用的`UTF-8`字符编码，所以要把`Bash`的环境设置成`UTF-8`，设置完成后重启`Git Bash`生效。

		echo "export LC_ALL=zh_CN.UTF-8" >> ~/.bash_profile
		echo "export LANG=zh_CN.UTF-8" >> ~/.bash_profile

安装Octopress
-------------
1. 以部署在`Github`上的blog为例，因为之前部署过，所以需要`clone`自己的Octopress。

		git clone -b source https://github.com/username/username.github.com.git username.github.com
		cd username.github.com 
		git clone -b master https://github.com/username/username.github.com.git _deploy #下载之前的发布版本到_deploy

2. 在本地安装Octopress，一下所有操作都在`source`分支上进行。在`username.github.com`目录中执行：

		gem install bundler
		bundle install

3. 测试安装是否成功，在运行下面命令之后，打开`http://127.0.0.1:4000`预览

		rake generate
		rake preview

预览的页面和你的github page`username.github.com`一致就部署成功了，Enjoy it！

更新Octopress
--------------
1. 查看是否添加了Octopress的remote源，在Git Bash中执行`git remote`，如果有`source`和`octopress`，则说明已添加。
2. 在clone自己的remote repository之后，需要先添加一下：

		git remote add octopress git://github.com/imathis/octopress.git

3. 更新方法同[官方文档](http://octopress.org/docs/updating/)，命令如下：

		git pull octopress master     # Get the latest Octopress
		bundle install                # Keep gems updated
		rake update_source            # update the template's source
		rake update_style             # update the template's style


**本文方法都引自`google windows octopress`*