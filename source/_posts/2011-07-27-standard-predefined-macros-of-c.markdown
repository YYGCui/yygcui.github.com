---
comments: true
date: 2011-07-27 19:41:11
layout: post
title: C标准预定义宏
categories:
- C/C++
- Programming
tags:
- C
- Macros
---

C语言标准([ANSI/ISO Standard C](http://c-faq.com/ansi/index.html))中定义一些了宏命令，称为标准预定义宏(Standard Predefined Macros)。以GCC 4.6.1的文档[The C  Preprocess](http://gcc.gnu.org/onlinedocs/gcc-4.6.1/cpp/Standard-Predefined-Macros.html)中介绍为例。因为这些宏是在C标准中定义的，所以基本上所有的编译器都支持（特别老的编译器除外），可以肯定的是，C99标准支持所有的这些标准预定义宏。这些宏都是以双下划线\_\_开始的。
<!-- more -->
\_\_FILE\_\_
这个宏表示当前文件的文件名，其类型是字符串。它表示预处理器打开这个文件的路径，并不是像#include指令包含的short name，或者文件名参数。这个路径是以该程序所在目录为基点的相对路径，比如当前目录下，该宏的值可能是myheader.h；引用标准头文件时，该宏的值可能是/usr/local/include/myheader.h 。

\_\_LINE\_\_
该宏表示当前输入的行的行号，其类型是整型。严格来说，它不算是一个预定义宏，因为它的值是随着源文件的变化而变化的。

\_\_func\_\_
该宏是在C99标准中引入的，它表示当前的正在执行的函数名 ，其类型是字符串。严格来说，它不算是宏，因为预处理器无法知道当前正在执行的函数名。

以上这三个宏对于debug程序是非常有用的，可以轻松定位到哪个源文件、哪个函数、哪一行附近出现了问题。例如一下示例程序的showtrace()函数。除了这三个常用的宏之外，还有一些预定义宏。

\_\_DATE\_\_
该宏表示预处理器开始执行的日期，其类型是字符串。它有十一个字符组成，形如"Jul 27 2011" ，若天数少于10，则在左侧补一空格，如"Jul  7 2011"。

\_\_TIME\_\_
该宏表示预处理器开始执行的时间，其类型是字符串。它有八个字符组成，形如“18:53:09"。

\_\_STDC\_\_
该宏表示使用的编译器是否支持C标准。在GCC中，该宏的值为1，表示使用的编译器支持ISO Standard C。 如果-traditional-cpp选项被使用的话，该宏将不被定义。在非GCC环境下，其具体数值可能不一样，即可能值为0表示支持ISO Standard C。

\_\_STDC\_VERSION\_\_
该宏表示使用的编译器所支持的C标准的版本号， 其类型是长整型，格式为yyyymmL，其中yyyy表示年份，mm表示月份。199409L表示1989标准修订于1994，199901L表示1999标准，对1999标准的支持还没有完成。如果-traditional-cpp选项被使用，或者编译C++或者Objective-C时，该宏将不被定义。
**注**：我在使用时，发现c89标准不支持该宏，反而是c99标准支持。

\_\_STDC\_HOSTED\_\_
该宏被定义时，其值为1，表示编译环境为宿主环境(hosted envir0nment)。宿主环境下可以使用所有的标准库，程序是借助于操作系统运行的。与之相对的是独立环境(freestanding environment)，像操作系统，嵌入式系统或者一些固件就是这种环境，它不使用标准库，不依赖于OS。

\_\_cplusplus
该宏在使用C++编译器时被定义，可以用来区分是由C编译器编译的还是有C++编译器编译的。GCC还没有完全支持该宏，使用1表示其值而不是标准C++版本号。

\_\_OBJC\_\_
该宏在使用Objective-C编译器时被定义，其值为1 。

\_\_ASSEMBLER\_\_
当预处理汇编语言时该宏被定义，其值为1。

以下示例程序用来查看这些宏定义的值。编译时，请使用c99标准，命令如下：
``` bash
    $gcc -o spMacros spMacros.c -std=c99
```
特别指出的是，showtrace()函数简单的模拟了出错输出，其形式类似于编译错误输出。
``` c
    /* standard predefined Macros */
    
    #include &lt;stdio.h&gt;
    #include &lt;stdlib.h&gt;
    
    void showtrace(char *file, long line, const char *func);
    
    int main()
    {
        printf("The source file name is %s.\n",__FILE__);
        printf("The current line number is %d.\n",__LINE__);
        printf("The compile date is %s.\n",__DATE__);
        printf("The compile time is %s.\n",__TIME__);
        printf("The current function name is %s.\n",__func__);
    #ifdef __STDC__
        printf("The used compiler conforms to ISO Standard C.\n");
        printf("The C Standard's version is %ld.\n",__STDC_VERSION__);
    #endif
    #ifdef __STDC_HOSTED__
        printf("The compiler's target is a hosted environment.\n");
    #endif
        
    #if defined __cplusplus
        printf("the C++ compiler is in use.\n");
    #elif defined __OBJC__
        printf("the Object-C compiler is in use.\n");
    #elif defined __ASSEMBLER__
        printf("assembly language is preprocessing.\n");
    #else
        printf("the C compiler is in use.\n");
    #endif
        
        printf("\n\n");

        showtrace(__FILE__, __LINE__, __func__);
        return 0;
    }

    void showtrace(char *file, long line, const char* func)
    {
        fprintf(stderr,"%s: In function '%s':\n", file, func);
        fprintf(stderr,"%s:%d: simulate the compiler standard error output.\n", file, line);
    }
```    
