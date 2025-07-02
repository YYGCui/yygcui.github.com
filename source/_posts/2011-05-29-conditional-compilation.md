---
comments: true
date: 2011-05-29 22:46:03
layout: post
title: 条件编译
categories:
- 技术积累
tags:
- C/C++
- Programming
- Precompile
---

条件编译就是在程序编译阶段，编译器根据条件编译指令的设定有选择性的编译程序代码行。条件编译的语法形式有以下三种：
<table class="table table-boardered">
<tr>
<th>#ifdef 标识符</th>
<th>#ifndef 标识符</th>
<th>#if 常量表达式</th>
</tr>
<tr>
<th>#else</th>
<th>#else</th>
<th>#else</th>
</tr>
<tr>
<th>#endif</th>
<th>#endif</th>
<th>#endif</th>
</tr>
</table>
<!-- more -->
(1)#ifdef 通常通过标识符的定义与否来控制程序的中某些代码片段是否执行。在编译时启用了相应的宏，则执行相应的代码片段。
如#ifdef DEBUG，使用宏DEBUG来控制调试信代码是否执行；#ifdef LOG，通过宏LOG来控制是否打印LOG信息。

(2)#ifndef 通常在头文件中使用，避免头文件被多次包含导致编译错误。如
``` c
    #ifndef _HEADER_
    #define _HEADER_
    ......
    #endif
```    
如果某头文件被多个代码文件包含，则该条件编译指令的作用是该头文件只被包含一次。

(3)#if ... #else 或 #if ... #elif 这个条件编译指令和C语言的条件控制语句是类似的，可以嵌套使用。不同的是对“常量表达式”做了一些限制：该常量表达式必须是整型，并且其中不包含sizeof，强制类型转换运算符或枚举变量。
``` c    
    #define MAX 100
    ......
    #if MAX>100
    代码片段1
    #else
    代码片段2
    #endif
```
该条件编译指令很容易理解，但是通常在什么环境下会用到，我还没有概念。不过倒是知道它的一个巧妙用途。
当要注释或修改一大片段程序时（特别是该程序片段中已经包含了/* ...... */注释），那么使用#if ..... #else ...... #endif 实现程序片段的注释是既美观又方便。方法如下：
``` c
    #if 0
    要注释的代码
    #endif
    
    #if 0
    修改前的代码
    #else
    修改后的代码
    #endif
    
    #if 1
    修改后的代码
    #else
    修改前的代码
    #endif
```
(4)defined是对#ifdef或者#ifndef的条件扩展，实现def条件判断的if...else...或if...elseif...else...的功能。在单一条件情况下，#if defined _MACROS_与#ifdef _MACROS_是等价的，#if !defined _MACROS_与#ifndef _MACROS_是等价的。使用如下：
``` c
    #if defined _MACROS1_ //另一种形式: #if defined(_MACROS1_)
    ...
    #elif defined _MACROS2_
    ...
    #endif
    
    或者
    
    #if defined(_MACROS1_) && defined(_MACROS2_)
    ...
    #endif
```
