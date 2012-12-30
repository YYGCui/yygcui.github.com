---
comments: true
date: 2010-08-22 17:35:49
layout: post
title: debian lenny编译安装GCC 4.5.1
categories:
- Linux
tags:
- debian
- gcc
- Linux
---

在debian下编译程序出现错误，无法识别long long类型，定义的long long类型常量说超出了long型范围，long long type是在ISO C99标准中引入的，更确切地说是64bits整型数据表示是在C99中引入的，debian中默认安装的是GCC 4.3，从使用中得知，GCC 4.3默认使用<del>支持</del>C89标准，可通过-std=c99设置编译时使用的标准类型，<del>而不支持C99标准，所以需要安装新的版本</del>，GCC4.5分支默认使用标准是c99，目前最新版为4.5.1。
<!-- more -->
## 首先要做一些准备工作：

1.首先从GNU上下载GCC包，下载地址是[http://gcc.gnu.org/](http://gcc.gnu.org/)，我使用的是最新发布版本4.5.1，首次编译安装时会出现这样的错误：
`gcc configure: error: Building GCC requires GMP 4.2+, MPFR 2.3.1+ and MPC 0.8.0+`

2.从编译错误中可以看出：GCC编译需要GMP, MPFR, MPC这三个库，这三个库可以从[ftp://gcc.gnu.org/pub/gcc/infrastructure/](ftp://gcc.gnu.org/pub/gcc/infrastructure/)上下载，我使用的版本为gmp-4.3.2，mpfr-2.4.2和mpc-0.8.1。当然这三个包也可以直接从各自官网上下载：
[http://gmplib.org/](http://gmplib.org/)，[http://www.mpfr.org/](http://www.mpfr.org/)，[http://www.multiprecision.org/](http://www.multiprecision.org/)

## 编译安装：

1.MPFR和MPC都依赖于GMP包，所以首先安装GMP
``` bash
    $tar xvf gmp-4.3.2.tar.bz2
    $cd gmp-4.3.2
    $./configure (可以使用配置参数--prefix=指定安装位置，这里使用默认/usr/local/include和/usr/local/lib)
    $make
    $make check (这一步用来确保编译正确)
    $sudo make install
```
2.安装MPFR
``` bash 
    $tar xvf mpfr-2.4.2.tar.bz2
    $cd mpfr-2.4.2
    $./configure --with-gmp-include=/usr/local/include --with-gmp-lib=/usr/local/lib
    $make
    $make check
    $sudo make install
```
3.安装MPC
``` bash
    $tar xvf mpc-0.8.1.tar.gz
    $cd mpc-0.8.1
    $./configure --with-gmp-include=/usr/local/include --with-gmp-lib=/usr/local/lib
    $make
    $make check
    $sudo make install
```
至此，三个库安装完毕，都是安装在默认位置/usr/local/include和/usr/local/lib，为了防止GCC编译时找不到这三个库，需要确认库位置是否在环境变量LD_LIBRARY_PATH中，查看环境变量内容可以用命令
``` bash
    $echo $LD_LIBRARY_PATH
```
如果该环境变量中不包含/usr/local/lib库的位置，需要添加库位置，命令如下
``` bash
    $export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/lib"
```
4.安装GCC
``` bash
    $tar xvf gcc-4.5.1.tar.gz
    $cd gcc-4.5.1
    $./configure
    $make
    $make check
    $sudo make install
```
经过两三个小时的漫长等待，你可以体验GCC 4.5.1带来的快感了......
使用命令$gcc -v查看版本，你会看到
``` bash
    Using built-in specs.
    COLLECT_GCC=gcc
    COLLECT_LTO_WRAPPER=/usr/local/libexec/gcc/i686-pc-linux-gnu/4.5.1/lto-wrapper
    Target: i686-pc-linux-gnu
    Configured with: ./configure
    Thread model: posix
    gcc version 4.5.1 (GCC)
```
最后再罗嗦几句，主要说明两点configure和make check，configure的配置参数是相当的多，以至于我从来就没有认真的看过，配置项说明一般在安装文件里的README或者INSTALL文件里，最常用的应该就是`--prefix=`指定安装路径的配置项了，像上面的安装过程中，如果configure gmp时使用了`--prefix=/usr/local/gmp-4.3.2`，那么下面用到gmp的配置就变成了`--with-gmp=/usr/local/gmp-4.3.2`，当然环境变量也要做相应的变化。make check的功能是检测编译是否正确，减少不必要的麻烦，编译成功的话，会看到这样的信息
``` bash
    ====================
    All 132 tests passed
    ====================
    make[2]: Leaving directory ***************
    make[1]: Leaving directory ***************
    make[1]: Entering directory ***************
    make[1]: Nothing to be done for `check-am'.
    make[1]: Leaving directory ***************
```
\***************表示测试的路径和当前的路径，主要看上面的信息All \*** tests passed，说明没有错误，全部通过了。
