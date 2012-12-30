---
comments: true
date: 2010-05-05 22:03:12
layout: post
title: 升级Ubuntu到10.04 LTS
categories:
- Linux
tags:
- Linux
- ubuntu
- upgrade
---

Ubuntu 10.04 LTS发布已经有一段时间了，五一期间没事升级了一下我的桌面系统和远程服务器。

大家都知道可以使用$uname命令获取电脑和操作系统的相关信息，但是如何查看ubuntu的版本呢？桌面系统下我们可以直接通过system-ubuntu查看，但是无图形界面下我们只能使用命令
``` bash
    $cat /etc/issue
```
或
``` bash
    $sudo lsb_release -a
```
同样版本升级在图形界面下可以直接通过update manager升级，也可以通过命令
``` bash
    $sudo do-release-upgrade 
```
<!-- more -->
升级过程没有什么好说的，一路确定即可，需要特别注意的是安装grub升级包时会询问安装位置，如果只有一个系统，一定要安装在MBR下，否则无法进入系统。如果是双系统或者多系统，可以选择安装在分区(boot单独分区时要安装在boot分区），然后通过其他系统引导，如在winxp下可以通过[grub4dos](http://download.gna.org/grub4dos/)，grub4dos的最新版本是2009年6月份发布的，而ubuntu从9.10版开始使用grub2，也就是说grub4dos还没有良好的支持grub2，无法像之前只使用grldr文件就可以引导。从Google搜索到两种方法。

1. [编辑menu.lst](http://www.uuland.cn/index.php/course/use-grub4dos-to-load-grub2/)

2.[使用修改的grldr](http://forum.ubuntu.org.cn/viewtopic.php?f=139&t=229387)

如果你想用grub2来引导系统，而又没有安装在MBR里，可以使用LiveCD来修复，具体步骤如下：

1.使用LiveCD进入ubuntu系统，打开终端。

2.执行以下命令（注：/dev/sda1 是指你的ubuntu的根分区，）
``` bash 
    $sudo mount /dev/sda1 /mnt
    $sudo mount --bind /dev /mnt/dev
    $sudo mount --bind /proc /mnt/proc
    $sudo chroot /mnt 
```
3.执行grub2安装命令
``` bash
    $grub-install /dev/sda
```
如果出现错误信息，执行
``` bash
    $grub-install --recheck/dev/sda
```
4.退出root权限`$exit`

然后卸载第二步挂载的分区
``` bash
    $sudo umount /mnt
    $sudo umount /mnt/dev
    $sudo umount /mnt/proc 
```
5.重启系统，久违的grub出现了......

如果很不幸的你把grub安装到winxp的系统分区了，修复了grub选择winxp后，又返回到grub，无法进入windows系统。这说明grub把winxp系统分区的分区表给破坏了，我们需要修复一下分区表。具体步骤如下：

1.使用带有故障恢复控制台的windows光盘，在安装windows界面按下“R”键选择第二项“要使用故障控制台修复Windows XP安装，请按R”，系统自动进入恢复控制台

2.执行命令，重写系统分区表（c:为系统分区）
``` bash
    fixboot c:
```
然后重启就可以进入windows，由于windows的蛮横（重写MBR），冲刷掉了我们安装的grub，所以要重新安装一下grub。

至此，打完收工~~~
