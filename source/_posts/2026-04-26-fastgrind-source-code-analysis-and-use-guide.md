---
title: fastgrind源码分析和使用的坑
date: 2026-04-26 18:24:53
tags:
- 性能优化
- 内存
categories:
- 技术积累
comments: true
---
[fastgrind](https://github.com/adny-code/fastgrind) 是 一个仅头文件、轻量级、快速、线程安全、类似valgrind的内存监视器，可输出类似perf的报告。专为C++应用程序的运行时内存分配跟踪和调用栈分析而设计。Fastgrind通过自动和手动插桩两种方式提供全面的内存使用洞察。

## 工程应用
fastgrind 只有一个头文件，对存量代码相对比较友好，微量入侵源码 和 编译工程。以自动插桩为例，代码修改如下：
```
// 某个cpp里 include 该头文件
#include "fastgrind.h"
```
工程修改稍微多一些，可以直接参考fastgrind的demo
```
# 开启自动插桩
-DFASTGRIND_INSTRUMENT
# 开启 gcc 插桩
 -finstrument-functions
# wrapper 现有内存分配释放函数
-Wl,--wrap=...
```

## 源码分析
那么，它是怎么做到的呢，下面从源码分析一下实现原理：

### 关键数据结构
```
struct memFrame // 用于存储采样信息，以time为key
class memStack // 用于存储调用栈，为避免锁竞争，定义为 thread_local 变量
class memLocalInfo // 用于存放线程的内存相关信息，为避免锁竞争，定义为 thread_local 变量
class memGlobalInfo // 用于汇聚个线程的memLocalInfo，生成全局内存信息
```

### 函数插桩流程
函数插桩有两种方式，一种是通过使用GCC的编译选项-finstrument-functions 实现的自动插桩功能；一种是通过人工在函数中插入桩代码实现的按需插桩。

自动插桩当指定该选项编译程序时，GCC会在程序的每个函数中增加两个插桩函数_cyg_profile_func_enter和__cyg_profile_func_exit。其中_cyg_profile_func_enter在函数入口处被调用，_cyg_profile_func_exit在函数出口处被调用。

流程如下，简单说入口插桩时把当前函数指针 push 到 memStack 中， 出口插桩时把当前函数指针 从 memStack 中 pop 掉。这个操作主要是给函数体提供调用栈信息的。

<img width="100%" height="100%" alt="auto instrument" src="/images/fastgrind/auto-instrument.png" />

人工插桩需要自行在函数开始处加上桩代码`__FASTGRIND__::FAST_GRIND`, 该宏定义是采用RAII技术的fastgrind类，其流程如下

<img width="100%" height="100%" alt="manual instrument" src="/images/fastgrind/manual-instrument.png" />

### wrap流程
结合上面的插桩流程，在调用wrap后的 malloc/free 时，memLocalInfo 从 memStack获取调用 malloc/free 的函数，并计算内存的增减，并按采样周期来设置memFrame。

<img width="100%" height="100%" alt="manual instrument" src="/images/fastgrind/wrap-malloc.png" />

在调用free时，从该线程的memStack中，找到对应的调用函数，并计算释放内存。这里也可以看出，它操作的是thread_local变量，无法处理跨线程释放的情况。

<img width="100%" height="100%" alt="manual instrument" src="/images/fastgrind/wrap-free.png" />

### main插桩流程
main插桩是通过使用GCC的关键字__attribute__来实现的，__attribute__((weak, constructor)) 属性的函数函数在进入main函数前调用，__attribute__((weak, destructor)) 属性的函数在main函数返回后调用。

流程如下，在main调用前创建memGlobalInfo；在线程结束时，线程变量memLocalInfo析构，这时memLocalInfo的信息merge到memGlobalInfo中，这一步是有锁操作，放在退出时减少业务运行的性能消耗；在main之后执行memGlobalInfo的析构，并生成日志， txt调用栈日志，json可解析html日志。 

<img width="100%" height="100%" alt="manual instrument" src="/images/fastgrind/main-thread-exit.png" />

## 使用约束

从源码分析看，日志生成依赖 after_main() 函数被调用，该函数在 main() 函数返回或者 exit()被调用时，才会执行。那么这就要求进程能够正常退出，比如运行完自己退出、ctrl-c 结束掉、或者kill -15 结束：
- 没有 coredump
- 没有 abort
- 没有 kill -9
- 没有调用系统函数_exit()

从处理机制看，它使用TLS技术提升了性能，同时也牺牲了准确性。当内存在线程间转移时，它无法准确统计这一情况，如A线程申请，转移给B线程
- A线程申请和释放不匹配，释放少了转移的部分
- B线程申请和释放也不匹配，释放多了转移过来的部分

从工程上看，它依赖GCC的wrap机制，wrap是在链接期绑定到对应的 __wrap_*** 函数的，在交叉编译时，可能走了libc的malloc，没有使用PLT的；再者，该机制无法作用于现有的动态库，推荐：
- 在目标环境编译
- 使用LD_PRELOAD的方式强制覆盖

另外，从宏定义可以看出，fastgrind也支持使用主流内存分配器tcmalloc和jemalloc的场景。
- FASTGRIND_TC_MALLOC
- FASTGRIND_JE_MALLOC


## 结果输出

在程序正常退出时，在运行目录生成内存采集信息，fastgrind.json 和 fastgrind.text

在tools下，提供解析工具，生成 fastgrind.html，可以看到线程、函数、内存使用
python fastgrind.py fastgrind.json


