---
comments: true
date: 2011-01-13 22:55:48
layout: post
title: Linux下打包解包
categories:
- 技术积累
tags:
- Linux
- pack
- unpack
---

题记: 包文件格式以及压缩技术的发展造就了今日多种的压缩包格式，如rar, zip, tar, tar.gz, tar.bz2等等，不同的是在windows下我们可以用一个软件搞定，如WinRAR，或者WinMount等等。而在Linux命令行下却很难一个命令搞定，所以整理一下了Linux下的打包解包命令。
<!-- more -->
1) .tar
.tar格式的文件只是一个包文件，未经过任何压缩。 换句话说，tar是一种文件格式，而不是一种压缩技术。
打包命令：`tar cvf filename.tar dirname`
解包命令：`tar xvf filename.tar`
注：简单解释一下参数的意义，-c是--create，即创建一个文件；-v是--verbose，即显示处理过程；-f是--file，即指定处理的文件；-x是--extract，即解开文件。在我们日常使用中，-f参数可谓是必不可少的，一般我们总是要指定要处理的文件的。另外，还有一些其他常用的操作，如-A(合并存档到一新的存档中)，-d(比较tar文件与当前文件的不同)，--delete(从存档中删除文件)，-r(添加文件到存档结尾)，-t(显示存档内容列表)等。更加详细的解释以及更多的参数介绍，请查看manual帮助，命令man tar。

2) .gz / .tar.gz (.tgz)
.gz压缩文件格式是使用gzip (GNU zip) 压缩工具压缩的文件格式。只能单文件压缩，不能压缩目录。
压缩命令1：`gzip filename` 直接将filename文件压缩成filename.gz，不保留原文件。
压缩命令2：`gzip -c  filename > name.gz` 将filename文件压缩到name.gz，若name与filename不同名，则同时将filename文件名改为name。
解压命令1：`gunzip filename.gz`
解压命令2：`gzip -d filename.gz`
.tar.gz是对tar格式包进行压缩，也即通常所说的压缩包。其缩略写法为.tgz。
压缩命令：`tar zcvf filename.tar.gz dirname` 或 `tar zcvf filename.tgz dirname`
解压命令：`tar zxvf filename.tar.gz` 或 `tar zxvf filename.tgz`
注：-z是--gzip, --gunzip，也即用gzip工具对tar包进行压缩。

3) .bz2 / .bz / tar.bz2 (tbz2) / tar.bz (tbz)
.bz2/.bz压缩文件格式是使用bzip2压缩工具压缩的文件格式，bzip2具有比 [LZW](http://en.wikipedia.org/wiki/LZW) (.Z) 和 zip，gzip 更有效的压缩性能，但是相当地慢。不能压缩目录。
压缩命令1：`bzip2 -z filename` 直接生成filename.bz2，不保留原文件。
压缩命令2：`bzip2 -cz filename > name.bz2 (name.bz)` 生成name.bz2，保留原文件。
解压命令1：`bunzip2 filename.bz2 (filenam.bz)`
解压命令2：`bzip2 -d filename.bz2 (filename.bz)`
注：没有找到如何压缩成bz格式，但可以通过压缩命令2实现。在 [http://bzip.org/](http://bzip.org/)的官方网站的介绍中并未提及bzip (或者根本就不存在这个东西)，另一方面，在Linux下后缀名只是一个提示作用，所以我猜测bz格式只是对bz2的简写，仅仅猜测而已。
.tar.bz2 等同tar.gz一样，调用bzip2对tar文件包进行压缩。
压缩命令：`tar jcvf filename.tar.bz2 dirname` 或 `tar jcvf filename.tbz2 dirname`
解压命令：`tar jxvf filename.tar.bz` 或 `tar jxvf filename.tbz`

4) .Z / .tar.Z (.taz)
.Z压缩文件格式是用compress压缩工具压缩的文件格式， 应该是这几种压缩中最古老的，也是压缩性能最差的。不能压缩目录。
压缩命令：`compress filename`
解压命令：`uncompress filename.Z`
.tar.Z是用compress压缩tar包的文件格式，其简写形式是.taz
压缩命令：`tar Zcvf filename.tar.Z dirname`
解压命令：`tar Zxvf filename.tar.Z`

5) .zip
.zip压缩文件格式是由zip压缩工具压缩而成的，并且是商业的，这也是gzip出现的原因吧。
压缩命令：`zip filename.zip dirname`
解压命令：`unzip filename.zip`

6) .rar
.rar压缩文件格式算是在windows环境下用的最多的格式之一吧。很明显其也是商业的。
压缩命令：`rar e filename.rar dirname`
解压命令：`rar a filename.rar`

其他还有一些不常见的格式，如.lz, .xz, .lha等，这里就不一一介绍了。收工。
