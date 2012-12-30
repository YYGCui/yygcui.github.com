---
comments: true
date: 2011-07-20 22:05:34
layout: post
title: Linux下的二进制工具(反编译工具)
categories:
- Linux
- 扫盲随记
tags:
- binutils
- decompile
- Linux
---

The [GNU Binutils](http://www.gnu.org/s/binutils/) are a collection of binary tools. The main ones are:
	
  * **ld** - the GNU linker.
  * **as** - the GNU assembler.

But they also include:
	
  * **addr2line** - Converts addresses into filenames and line numbers.
  * **ar** - A utility for creating, modifying and extracting from archives.
  * **c++filt** - Filter to demangle encoded C++ symbols.
  * **dlltool** - Creates files for building and using DLLs.
  * **gold** - A new, faster, ELF only linker, still in beta test.
  * **gprof** - Displays profiling information.
  * **nlmconv** - Converts object code into an NLM.
  * **nm** - Lists symbols from object files.
  * **objcopy** - Copys and translates object files.
  * **objdump** - Displays information from object files.
  * **ranlib** - Generates an index to the contents of an archive.
  * **readelf** - Displays information from any ELF format object file.
  * **size** - Lists the section sizes of an object or archive file.
  * **strings** - Lists printable strings from files.
  * **strip** - Discards symbols.
  * **windmc** - A Windows compatible message compiler.
  * **windres** - A compiler for Windows resource files.
<!-- more -->
Most of these programs use **BFD**, the Binary File Descriptor library, to do low-level manipulation. Many of them also use the **opcodes** library to assemble and disassemble machine instructions.

The binutils have been ported to most major Unix variants as well as Wintel systems, and their main reason for existence is to give the [GNU system](http://www.gnu.org/gnu/gnu-history.html) (and [GNU/Linux](http://www.gnu.org/gnu/linux-and-gnu.html)) the facility to compile and link programs.

The detail introduction and use guide is [documentation for binutils 2.21](http://sourceware.org/binutils/docs-2.21).

在Linux下，可执行文件即是目标文件，一般情况下可通过以下三个命令查看反汇编信息：

nm命令列出目标文件的所有符号，如：
``` bash
    $nm a.out | more
```
objdump命令列出目标文件的详细汇编信息
``` bash 
    $objdump -S a.out | more 
```
readelf 是列出文件的ELF格式的内容
``` bash
    $readelf --debug-dump a.out | more 
```
关于这三个命令的详细参数，以及其他命令的使用可以参看上面的文档binutils 2.21。反汇编文件这里没有列出，主要是个人觉得分析起来有点难。反汇编的信息对于了解程序的架构很有帮助，但是很难得到具体的程序信息，我本想查看程序返回值，看了半天没有结论。。。
