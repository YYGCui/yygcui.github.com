---
comments: true
date: 2011-06-11 22:36:34
layout: post
title: 主机字节序和网路字节序
categories:
- 技术积累
tags:
- C/C++
- Programming
- endian
---

字节序(endian)是指存放多个字节的顺序，典型的字节序分类为主机字节序和网络字节序。主机字节序(host endian)是指整数在内存中存放的顺序，有大端字节序(big-endian)和小端字节序(little-endian)两种。网络字节序(net endian)是指TCP/IP中规定的数据表示格式，与CPU、OS无关，采用大端字节序(big-endian)存放方式。
<!-- more -->
**大端字节序(big-endian)**

大端字节序是指将高位字节存储在低地址空间中，也就是地址低位存储值的高位，地址高位存储值的低位。这种存储方式比较直观，阅读方便。以四字节16进制0x01020304在内存中的存储顺序为例，假设起始地址为1000:
1000     1001     1002     1003
------------------------------------------------
01      |    02    |    03     |    04
------------------------------------------------

**小端字节序(little-endian)**

小端字节序是指将低位字节存储在低地址空间中，也就是地址低位存储值的低位，地址高位存储值的高位。这种存储方式符合我们的思维方式，比如珠算。同样以0x01020304为例:
1000     1001     1002     1003
------------------------------------------------
04      |    03    |    02     |    01
------------------------------------------------

PC中的CPU大多数是以小端字节序处理多字节数据的，而网络传输时TCP/IP中是以大端字节序存储数据的。所以在使用socket处理主机到网络或网络到主机的数据时需要大小端字节序转换。转换函数[htons(), htonl(), ntohs(), ntohl()](http://pubs.opengroup.org/onlinepubs/009695399/functions/htonl.html).

**检测CPU大小端的方法**

检测CPU的字节序的基本思路是以整型存储一个数值，以字符型读取该数值的低地址位，根据大小端字节序的格式判断是否符合。以C语言编写的检测程序如下：
``` c
    #include <stdio.h>  
    #include <stdlib.h>
    
    void check1()
    {
        union w
        {
            int a;
            char b;
        }c;
        c.a=1;
        if(c.b==1)
            printf("check1:this is little-endian\n");
        else
            printf("check1:this is big-endian\n");
            
    }
    void check2()
    {
        short int x;
        char x0,x1;
        x=0x1122;
        x0=((char*)&x)[0];
        x1=((char*)&x)[1];
        
        if (x0==0x11)
            printf("check2:this is big-endian\n");
        if (x1==0x11)
            printf("check2:this is little-endian\n");
    }

    int main()
    {
        check1();
        check2();
        return 0;
    }
```
