---
comments: true
date: 2011-11-10 16:33:28
layout: post
title: Gentoo 硬盘安装
categories:
- Linux
tags:
- gentoo
- Linux
---

之前试过Ubuntu硬盘安装和Debian硬盘安装，最近要搭建一个环境，所以又折腾了一下Gentoo的硬盘安装。各种Linux发布版本的硬盘安装方法都大同小异，不同的是每个发布版本都有自己的文件架构。硬盘安装都是依托于其他系统的，同样本文介绍的是在Windows XP 下硬盘安装 Gentoo。
<!-- more -->
### 准备工作：

1. 用于多系统引导的[GRUB4DOS](http://sourceforge.net/projects/grub4dos/)。

2. Gentoo [ISO文件](http://www.gentoo.org/main/en/where.xml)，硬盘安装使用livedvd。
Gentoo提供minimal ISO和livedvd ISO两种ISO文件，minimal需要额外下载stage3和portage (网络安装适用)，livedvd可进行无网络安装，64位的livedvd ISO又有两个版本，一个是x86/x86\_64 混合版本(livedvd-x86-amd64-32ul-11.2.iso)，一个是x86\_64 multilib 版本 (livedvd-amd64-multilib-11.2.iso)。前者根据CPU是32bit/64bit选择使用x86/x86\_64  kernel，但userland是32bit的；后者只有x86\_64的kernel，userland是64bit的，但可以运行32bit的应用。原文如下：
The LiveDVD is **available in two flavors**: a hybrid x86/x86\_64 version, and an x86\_64 multilib version. The livedvd-x86-amd64-32ul-11.2 version will work on 32-bit x86 or 64-bit x86\_64. If your CPU architecture is x86, then boot with the default gentoo kernel. If your arch is [amd64](http://www.gentoo.org/doc/en/gentoo-amd64-faq.xml#difference), boot with the gentoo64 kernel. This means you can boot a 64-bit kernel and install a customized 64-bit userland while using the provided 32-bit userland. The livedvd-amd64-multilib-11.2 version is for x86\_64 only.

3. Gentoo [安装手册](http://www.gentoo.org/doc/en/handbook/)。

### 安装过程：

1. 解压缩GRUB4DOS里的grldr和menu.lst文件到c盘，在boot.ini的[operating systems]项中(通常是文件结尾)添加c:\grldr="grub".
2. 将Gentoo ISO文件解压缩到fat/fat32分区，假如是F盘。
3. 编辑menu.lst ，将文件内容改为：
    title gentoo install
    root (hd0,6)
    kernel /boot/gentoo root=/dev/ram0 init=/linuxrc dokeymap aufs looptype=squashfs loop=/image.squashfs cdroot  vga=791 splash=silent,theme:livecd-10 console=tty1 quiet
    initrd /boot/gentoo.igz
menu.lst 的内容可以根据Gentoo ISO中isolinux目录下的isolinux.cfg填写，如下：
    label gentoo-x86_64
    MENU LABEL Gentoo ^x86_64
    kernel /boot/gentoo
    append root=/dev/ram0 init=/linuxrc dokeymap aufs looptype=squashfs loop=/image.squashfs cdroot initrd=/boot/gentoo.igz vga=791 splash=silent,theme:livecd-10 console=tty1 quiet
    TEXT HELP
    Boot the default x86_64 Gentoo kernel
    ENDTEXT
root (hd0,6)表示第一块硬盘上的第7个分区，逻辑分区编号5开始，也就是D盘。在只有一块硬盘的情况下，该硬盘表示为hd0,逗号后面的数字位分区编号减1。关于磁盘分区的表示方法，详见[此处](http://www.linuxsir.org/main/node/127)。

4. 重启系统后，选择grub进入Gentoo live，安装过程根据安装手册进行，不同的地方在于：

[handbook]5.b 默认：使用从网上下载的stage
前面提到livedvd中集成了stage和portage，所以不需要下载。相应的5.b和5.c小节的内容改为：
``` bash    
    #mount /dev/sda6 /media  //假设iso文件位于E盘
    #mount -o loop /media/livedvd-amd64-multilib-11.2.iso /mnt/cdrom
    #mount -o loop /mnt/cdrom/image.squashfs /mnt/livecd
    //将image中的文件全部复制到/mnt/gentoo中
    #cp -r /mnt/livecd/* /mnt/gentoo
```
[handbook]6.b 配置Portage
如若安装gnome，请注意make.conf中USE变量是否有gtk

[handbook]7.c 默认：手动配置
配置内核时，Intel酷睿之后的处理器可选择 (X) Core 2/newer Xeon
选择读取硬件时钟选项Device Drivers -> Character devices -> <*> Generic /dev/rtc emulation <*> Extended ETC operation
电源风扇等接口在Power management and ACPI options
无线网卡选项在Device Drivers -> Network drivers -> Wireless LAN

暂时发现的可能出问题的选项就这些，更详细的menuconfig选项介绍[在这里](http://kernel.org/doc/menuconfig/)。

在使用genkernel编译时，可通过以下命令更新config信息然后在编译：
``` bash
    #genkernel --menuconfig all
```
我在手动编译内核后，系统无法启动，遇到[grub error 15](http://www.gentoo.org/doc/en/grub-error-guide.xml#doc_chap4) 的错误，问题还没解决，还在研究中......
