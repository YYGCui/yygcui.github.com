---
comments: true
date: 2011-07-09 23:23:51
layout: post
title: '远程会话管理: ssh, nohup, screen'
categories:
- Linux
tags:
- nohup
- screen
- SSH
---

使用ssh连接远程主机时，最常遇到的两个情况：一是当一段时间没有交互时ssh会自动断开连接，这时你通过ssh登录终端运行的程序也将会随之被终止。另一个是当你想通过ssh登录终端提交一个程序，并想让它在断开ssh连接后依然运行；或者让它在后台运行，但依然可以随时调入前台进行交互操作。如果你也遇到了这样的情况，我想下面的方法可以帮助你。
<!-- more -->
## 情况一: 没有交互时ssh自动断开连接，通过ssh运行的程序终止

### 1.ssh idle time out，也就是一段时间没有交互时ssh自动断开连接

对于这个问题，[OpenSSH FAQ](http://www.openssh.org/faq.html#2.12)给出了很好的回答：

    "2.12 - My ssh connection freezes or drops out after N minutes of inactivity.
    This is usually the result of a packet filter or NAT device timing out your TCP connection due to inactivity. You can enable **ClientAliveInterval** in the server's _[sshd_config](http://www.openbsd.org/cgi-bin/man.cgi?query=sshd_config&sektion=5)_, or enable **ServerAliveInterval** in the client's_[ssh_config](http://www.openbsd.org/cgi-bin/man.cgi?query=ssh_config&sektion=5)_ (the latter is available in OpenSSH 3.8 and newer).
    Enabling either option and setting the interval for less than the time it takes to time out your session will ensure that the connection is kept "fresh" in the device's connection table."

简单翻译一下：

    2.12 - 几分钟没有交互活动后我的ssh连接断开了
    这通常是包过滤造成的，或者是由于没有交互活动，NAT(Network Address Translation, 网络地址转换)设备使你的TCP连接超时造成的。你可以在server的配置文件sshd_config里启用参数ClientAliveInterval来解决这个问题，或者在client的配置文件ssh_config里启用ServerAliveInterval参数（OpenSSH 3.8及以后的版本中才可用这个参数）。

上面两种方式可以选择任一种，并且设置该参数的值（也就是间隔时间）为比会话超时时间小的时间值即可，这样可以保证在不时的刷新设备的连接表。

从FAQ中可以得到两种解决方法，这里再补充一下：

1) Server端配置，适用于只有一个server的情况，在多个server的情况下，配置client端相对容易些。配置文件为`/etc/ssh/sshd_config`。有两个关键的参数：
    _ClientAliveInterval     value(默认值是0，单位秒)_
    _ClientAliveCountMax     value(默认值是3)_
参数ClientAliveInterval的作用是如果在interval时间内没有收到来自client的数据，server将向client发送alive request，如果收到应答，则说明连接是alive的，否则，则说明连接超时，ssh连接都断开。该参数的默认值是0，也就是server不会向client发送alive request。该参数的取值取决于会话超时的时间，而这个时间和网络状态以及设备有关。一般设置为540或者600，当然也有设置成15才其作用的......
参数ClientAliveCountMax的作用是设置server向client发送alive request却没有收到应答的最多次数，该参数的默认值是3，比如ClientAliveInterval的值是60秒，那么在默认值情况下允许最大的连接超时时间是60×3=180秒，也就是在180秒还没有收到应答的话，ssh连接将断开。

2) Client端配置，OpenSSH 3.8及其以后版本才能配置client。配置文件为/etc/ssh/ssh\_config。当你没有权限编辑该文件时，也可以建立自己的client配置文件~/.ssh/config。同样也有两个参数：
    _ServerAliveInterval     value(默认值是0，单位秒)_
    _ServerAliveCountMax     value(默认值是3)_
参数ServerAliveInterval的作用是如果在interval时间内没有收到来自server的数据，client将向server发送alive request，如果收到应答，则说明连接是alive的，否则，则说明连接超时，ssh连接都断开。该参数的默认值是0，也就是client不会向server发送alive request。该参数的取值ClientAliveInterval。
参数ServerAliveCountMax的作用是设置client向server发送alive request却没有收到应答的最多次数，该参数的默认值是3，其含义同ClientAliveCountMax一致。

### 2. ssh断开后，通过ssh运行的程序终止

更确切的问题描述是通过ssh运行的后台程序依然会随着ssh连接断开而终止。这要从linux的进程和信号说起，以下摘自[IBM developWorks](http://www.ibm.com/developerworks/cn/linux/l-cn-screen/)：

在Linux/Unix中，有这样几个概念：
	
  * 进程组（process group）：一个或多个进程的集合，每一个进程组有唯一一个进程组ID，即进程组长进程的ID。
  * 会话期（session）：一个或多个进程组的集合，有唯一一个会话期首进程（session leader）。会话期ID为首进程的ID。
  * 会话期可以有一个单独的控制终端（controlling terminal）。与控制终端连接的会话期首进程叫做控制进程（controlling process）。当前与终端交互的进程称为前台进程组。其余进程组称为后台进程组。

根据POSIX.1定义：
	
  * 挂断信号（SIGHUP）默认的动作是终止程序。
  * 当终端接口检测到网络连接断开，将挂断信号发送给控制进程（会话期首进程）。
  * 如果会话期首进程终止，则该信号发送到该会话期前台进程组。
  * 一个进程退出导致一个孤儿进程组中产生时，如果任意一个孤儿进程组进程处于STOP状态，发送SIGHUP和SIGCONT信号到该进程组中所有进程。

因此当网络断开或终端窗口关闭后，控制进程收到SIGHUP信号退出，会导致该会话期内其他进程退出。

## 情况二: ssh连接断开后，通过ssh提交的程序依然在运行

当运行的程序需要很长时间时，在情况一下，或者想在运行该程序的同时做其他事情，或者关机下班，我们需要该程序的运行不受任何影响。这就是情况二要解决的问题。

常规情况下，通过后台运行程序的方法是program&，&的作用是让程序在后台运行。我们可以通过命令bg查看在后台运行的进程，通过命令fg NO. 将第NO.个后台进程转到前台来运行。但是该种方法运行的程序在ssh断开后依然会因SIGHUP信号被终止。

## 1.nohup
``` bash
    nohup - run a command immune to hangups, with output to a non-tty
```
nohup的作用是忽略SIGHUP信号。我们可以用这个命令避免ssh连接断开后运行的程序被终止的情况。nohup的作用只是忽略SIGHUP信号，要想在关闭ssh的情况下使程序依旧运行，还是要使用后台运行命令&。nohup会将程序的标准输出会自动重定向到nohup.out，该文件和运行的程序在同一目录下。
``` bash
    $nohup &lt;command&gt; [arg]... &amp;
```
nohup的功能单一，使用比较简单，对于不需要交互的程序比较有效，直接放在后台运行即可。但是在需要人机交互的时候，nohup就无能为力了，下面将介绍更加强大的screen命令。

## 2.screen

Screen is a full-screen window manager that multiplexes a physical terminal between several processes, typically interactive shells. Each virtual terminal provides the functions of the DEC VT100 terminal and, in addition, several control functions from the ANSI X3.64 (ISO 6429) and ISO 2022 standards (e.g., insert/delete line and support for multiple character sets). There is a scrollback history buffer for each virtual terminal and a copy-and-paste mechanism that allows the user to move text regions between windows. When screen is called, it creates a single window with a shell in it (or the specified command) and then gets out of your way so that you can use the program as you normally would. Then, at any time, you can create new (full-screen) windows with other programs in them (including more shells), kill the current window, view a list of the active windows, turn output logging on and off, copy text between windows, view the scrollback history, switch between windows, etc. All windows run their programs completely independent of each other. Programs continue to run when their window is currently not visible and even when the whole screen session is detached from the users terminal.

上面是来自GNU的介绍。screen是一个能在几个进程(如交互式shell)间复用同一个物理终端(如ssh登录)的全屏窗口管理程序。简单地说，screen创建的虚拟终端都相当于通过ssh登录的终端一样。

可以直接运行screen命令创建一个虚拟终端：
``` bash    
    $screen
```    
也可以创建一个虚拟终端并在其中运行一个命令：
``` bash    
    $screen command arg
```
上面两种方式的不同点在于：第一种正常情况下只能通过exit退出终端，可在该虚拟终端中使用大多数命令；而第二种当命令退出时，该虚拟终端也随之退出，也就是说该虚拟终端是为command而创建的。这只是screen只基本的功能，你还可以在不终止screen中的程序的同时切换到其他窗口，甚至是断开ssh连接。screen程序定义了一些快捷键，这些快捷键都是以C-a (Ctrl + a)开始再加上一个字符表示一定的动作。例如：
``` bash    
    $screen vim a.c
```
如上命令所示，例如我创建了一个虚拟终端并用vim打开了一个文件a.c，这时我想切换到其他窗口却又不想关闭这个文件。可以使用C-a d这个快捷键来detach (分离) screen from 当前的虚拟终端。这时即使断开ssh连接，该文件依然在该虚拟终端中处于离开时的状态。
``` bash    
    $screen -ls
```
顾名思义，该命令的功能是list出所有的screen终端。如下：
``` bash    
    [yygc@freebsd ~]$ screen -ls
    There is a screen on:
            49454.ttyp2.freebsd     (Detached)
    1 Socket in /tmp/screens/S-yygc.
```
如果想重新attach到这个虚拟终端，可以使用如下命令：
``` bash    
    $screen -r 49454
```
当用另一个ssh登录到主机后，list出screen终端会看到：
``` bash    
    [yygc@freebsd ~]$ screen -ls
    There is a screen on:
            49454.ttyp2.freebsd     (Attached)
    1 Socket in /tmp/screens/S-yygc.
```
如果想进入到一个Attached的虚拟终端，命令如下：
``` bash    
    $screen -x 49454
```
注意，C-a快捷键只能在screen创建的虚拟终端中使用，更过的快捷键请参看[Screen User's Manual](http://www.gnu.org/software/screen/manual/screen.html#Commands)。关于screen的更多参数介绍以及使用方法，请大胆的输入命令
``` bash    
    $man screen
```
小结一下，想通过ssh后台运行程序时，一般都是耗时较长、不需要交互的程序，这时使用nohup比较方便，所有的标准输出可以在nohup.out文件中看到。如果该程序耗时长、又需要交互，或者不想关闭打开的文件又要切换窗口，这时可以通过screen来运行，这样可以随时切换到其他窗口又不影响程序的运行、不需要关闭文件。
