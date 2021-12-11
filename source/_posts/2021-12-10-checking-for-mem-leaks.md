---
title: 记一次内存泄漏定位
date: 2021-12-10 22:21:44
tags:
- C/C++
categories:
- 技术积累
comments: true
---
最近测试时发现，运行相对较长一段时间后进程因内存使用超过配额上限而被杀掉，这应该是内存缓慢增长导致的，也就是说出现了内存泄漏。这个进程代码是用C++实现的，且基本没有使用`malloc/free`, `new/delete`等显式的内存申请释放，但代码中大量使用了标准库的容器类。这种因为业务逻辑导致容器没有清除导致的内存泄露，之前一直没有找到很好的定位手段，已知的工具`valgrind`貌似不能用来定位这种方式的泄露。

通过内外网搜索，找到了一些基于内存采样的分析工具，如`google-perftools`里的`tcmalloc`，及`bytehound`，本文主要记录下使用`tcmalloc`定位内存泄漏的方法。

## google-perftools

[google-perftools](https://github.com/gperftools/gperftools)是Google开源的一个高性能的多线程的`malloc`实现集，号称当前最快的`malloc`，使用它可以提高内存访问性能，在我们的测试中，有大约单核10%的CPU性能提升。同时，它还集成了`heap-checker`，`heap-profiler`，`cpu-profiler`等内存和cpu检查[分析工具](https://github.com/gperftools/gperftools/wiki)。这里主要使用`heap-profiler`来定位内存泄漏问题。

### tcmalloc库

ubuntu上可以直接通过`apt`安装
```
sudo apt install -y google-perftools

# 相关路径如下
# /usr/bin/google-pprof
# /usr/lib/x86_64-linux-gnu/libtcmalloc.so.4
```

有两种方式来使用tcmalloc库，一种是在编译时链接，然后运行时通过环境变量启用不同的工具，官方wiki看起来是推荐这种方式的。命令如下：
```
gcc [...] -o myprogram -ltcmalloc
# HEAPPROFILE设置输出分析文件的前缀
HEAPPROFILE=/tmp/myprogram ./myprogram
```

另一种方式是通过`PRELOAD`的方式优先加载该动态链接库，好处是它不用重新编译代码，且可以覆盖该程序及其他在此之后链接库里的相同函数实现，实现全局使用的目的。命令如下：
```
env LD_PRELOAD="/usr/lib/libtcmalloc.so" HEAPPROFILE=/tmp/myprogram ./myprogram
```

### 内存分析

通过上述启动程序后，每隔10s钟会在指定的输出路径输出内存采样文件，如`/tmp/myprogram.0001.heap`。通过一个简单的示例程序看下其过程。
```
# test.cpp
#include <vector>
#include <unistd.h>
#include <cstdlib>
using namespace std;

void test() {
    vector<int> testv;
    for (int i = 0; i < 10000; i++) {
        testv.push_back(i);
    }
    # 退出不释放内存
    exit(1);
}
int main(void) {
    test();
    return 0;
}
```
该示例通过`vector`申请了`10000*sizeof(int)`大小左右的内存，然后没有释放。编译并预加载`tcmalloc`执行。
```
g++ test.cpp -o test
env LD_PRELOAD="/usr/lib/x86_64-linux-gnu/libtcmalloc.so.4" HEAPPROFILE=/tmp/test ./test
# 执行完成后看到以下文件
/tmp/test.0001.heap
```
使用`google-pprof`查看可以该文件，通过不同的参数可以指定显示方式，甚至web显示也可以。比如用`--test`参数显示成文本，用`--gv`或者`--pdf`可以图形化显示，如这里存到pdf文件中。
```
$ google-pprof --pdf test /tmp/test.0001.heap > test.0001.heap.pdf
```
通过下图可以直观的看到`test`函数`alloc`了内存，没有`dealloc`过。

![](/images/test-0001-heap-pdf.png)

### 内存泄漏定位

那么，在复杂的程序中，既有申请又有释放，内存一直缓慢增长该怎么取分析定位呢？如果直接查看单个文件，并无法说明内存只有申请没有释放。这里会用到`pprof`比较两个heap文件查看差异的方法。比如运行相对较长时间程序，获得了`myprogram.0001.heap ... myprogram.0234.heap` 这些采样数据，同时通过观察进程内存在这段时间内明显增长。可以通过以下命令对比两个文件：
```
$ google-pprof --pdf --base /tmp/test.0010.heap test /tmp/test.0234.heap > test.compare.pdf
```
生成的pdf和上图类似，不同点在于该pdf中显示的相对值，就是0234申请的内存减去0010申请的值。可以直观的看到哪些函数相对申请了占比大的内存，大大缩小了排查范围，然后通过阅读这些函数就可以找到具体哪些容器存在未清除的问题，比如没有`clear`或`erase`。

这里取第0010个heap文件是因为程序前期初始化等申请一些内存，这部分先排除在外，避免大量定位。这里可以灵活运用，比如可以先看单个文件哪些申请了大量内存再做比较。

## bytehound
[bytehound](https://github.com/koute/bytehound)是一款`Linux`平台的内存分析工具，具有丰富的前端界面，可以看趋势图、火焰图、内存申请调用栈等等。与上面不同的是它通过续写的方式生成一个`.dat`文件。

它的缺点是生成的文件非常大，从笔者的测试看，该文件一分钟增加2G左右，对于缓慢增长来说，运行几个小时文件大小吃不消。再者，虽然火焰图比较直观可以看出内存热点(类似cpu性能热点分析)，但是没有内存申请比较，不太容易缩小排查范围。

因为生成文件太大的问题，没有详细使用该工具，如有兴趣，可以参考他的[详细文档](https://koute.github.io/bytehound/)

## 扩展资料

1. [google-perftools官方wiki](https://github.com/gperftools/gperftools/wiki) - 官方wiki对该工具各方面都有详尽的说明，想了解其他功能细节可以参看
2. [内存泄漏的定位与排查：Heap Profiling 原理解析](https://segmentfault.com/a/1190000040982400) - 该文章详细介绍了`heap profile`的原理，主流工具`profile`的实现细节等，该文中还提到了` gprof, Valgrind and gperftools`等工具评估链接，对于想了解原理的同学建议阅读。