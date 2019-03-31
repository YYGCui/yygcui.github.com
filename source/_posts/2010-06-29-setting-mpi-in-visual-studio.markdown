---
comments: true
date: 2010-06-29 09:53:41
layout: post
title: Visual Studio下配置MPI
categories:
- 技术积累
tags:
- MPI
- Visual Studio
---

之前一直用VC 6.0，其项目属性一目了然，配置起来很省事，后来与时俱进，先后用了Visual Studio 2003，2005一直到现在的2008，从2003开始，VS的界面发生了很大的变化，以下的配置过程是在VS 2008下配置的，理论上适用于所有VS版本。在进行以下配置时，确保已经在IDE中设置了mpi头文件和库的引用。菜单栏[Tools]-->[Options]中，选择Projects and Solutions项目下的VC++ Directories，设置如下图所示
<!-- more -->
![MPI](http://farm5.static.flickr.com/4097/4748892560_ce609332b2_b.jpg)

环境介绍：
OS: WIN7 32位
IDE: Visual Studio 2008 Pro
MPI: MPICH2 1.2

新建项目或打开项目之后，选择菜单栏[Project]-->[Properties]或者直接使用快捷键Alt+F7打开项目属性。

1.首先设置Debugging属性，设置直接使用VS 调试MPI程序，这是琢磨已久的设置，也是使我彻底放弃VC 6.0的根本所在(在VC 6.0中很容易设置使用IDE直接debug基于MPI的并行程序)。具体设置过程如图所示：
(1)选择Debugger to launch下拉列表中的MPI Cluster Debugger，如图中标号②所示。
(2)MPIRun Command中输入`mpiexec`，如图中标号③所示。另外：在WinXP下可以直接使用MPICH2自带的wmpiexec来运行编译好的程序，但在Win7下找不到工作目录。
(3)MPIRun Arguments中输入要使用的进程数、程序的绝对路径以及程序的参数。如图中标号④所示。具体示例如：`-n 4 $(TargetPath) 4`。`$(TargetPath)`表示欲debug的程序完整路径，如`f:\hellohello.exe`，该示例表示使用4个进程(结点)运行hello.exe，hello.exe接受参数4。
(4)MPIRun Working Directory设置mpi的工作目录，也就是程序所在的目录，如图中标号⑤所示。这个必须要设置，特别是在程序要读取文件时，如果不设置的话，程序找不到所要读取的文件。`$(TargetDir)`表示欲debug程序的目录，如同(3)中示例，这时`$(TargetDir)`表示工作目录为`f:\hello`

![](http://farm5.static.flickr.com/4102/4748892204_3434610c0d_b.jpg)

2.在使用C++编程时，需要设置这一项，[C/C++]栏下的[Preprocessor]在Preprocessor Definitions中添加宏定义`MPICH_SKIP_MPICXX`，当然该宏定义也可以直接在程序中#define. 如下图所示

![](http://farm5.static.flickr.com/4096/4748251025_494bbf2c95_b.jpg)

3.[C/C++]栏下的[Code Genneration]设置，在Runtime Library中选择Multi-threaded Debug(/MTd)，该项表示用多进程环境调试程序，也就是用单机上的多进程模拟集群环境下的多结点(多处理器核)。

![](http://farm5.static.flickr.com/4118/4748892310_68f68ab30f_b.jpg)

4.[linker]属性设置，选择其下的[input]项，在Additional Dependencies中添加mpi.lib库。

![](http://farm5.static.flickr.com/4116/4748250923_14e05aeea1_b.jpg)

经过以上四个步骤的设置，现在可以体验一下并行编程了～～～
