---
layout: post
title: "Root Galaxy Nexus"
date: 2013-10-11 14:52
comments: true
categories: 
- 技术积累
tags:
- Android
- Root
---
为了用一些应用，必须要取得root权限，Google了一下，发现了这个神奇[GNEX TOOLKIT](http://forum.xda-developers.com/showthread.php?t=1614827)，简单易用，功能强大。它不仅可以root，还可以刷入google官方的image，刷入recovery，解锁bootloader。但是，有一点比较不爽的是，它更新的没有那么及时，或许donate版比较及时吧，这个就不知道了。

这个工具相当于把以下步骤和工具封装了一下，简单选几个选项就ok了。同样只要有相应的工具，手动做也不是什么难事。
<!--more-->
准备工作：
----------
1. 在开发者选项里打开“USB调试”模式。
2. 确保手机已经解锁bootloader
3. 安装android SDK，其中包含了fastboot
4. 下载[superSU最新版](http://www.chainfire.eu/)，并将该zip文件放在手机存储的根目录下
5. 下载与手机相适应的[recovery CWM img](http://www.clockworkmod.com/rommanager)，请根据手机型号及系统版本下载。

root步骤：
----------
1. 关机状态下同时按住开机键和音量上下键启动手机进入fastboot模式
2. 使用fastboot刷入recovery, 命令行如下：

		fastboot flash recovery recovery-clockwork-....img
		#注意：由于android的保护机制，在重启之后该recovery将被重置掉，对root没有影响
		#该recovery主要用来从SD加载superSU zip文件来实现root。
3. 刷入recovery之后，就可以找到从SD载入zip文件，选定该选项，然后在SD目录下找到superSU zip文件载入。
4. superSU 载入后，++++Go Back 回到上一层，选定reboot重启。第一次启动的时间可能有点长，启动后可以打开superSU app来更新二进制文件。