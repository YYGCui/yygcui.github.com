---
title: 线程级内存监控调查与分析
date: 2026-06-03 21:54:14
tags:
- 性能优化
- 内存
categories:
- 技术积累
comments: true
---
继上篇 fastgrind 的分析，fastgrind 的核心功能在于内存泄漏检测、调用栈分析，虽然能够获取到每个线程及该线程函数的申请释放信息，但应用场景不是监控线程的内存情况，也无法做精确的统计。

那么，有什么办法可以做到线程级的内存监控，并且消耗尽可能少的资源？类似系统本身获取获取到线程的CPU占用信息。这里主要的难点在于效率，监控本身消耗的资源要少，同时不会对业务线程造成效率影响。这里以fastgrind的demo代码作为测试示例，分别讲解下面的几个方式。

## 测试代码

这里以 fastgrind/demo/auto_instrument/compile_with_cmake demo用例为例
```
PackageA::PackageA()
{
    buffer_ = (int *) malloc(sizeof(int) * 256); // 申请 1024

    char *tmp = (char *) malloc(256); // 申请 256
    free(tmp); // 释放 256
}

PackageA::~PackageA()
{
    free(buffer_); // 释放 1024
}

void PackageA::allocTest() const
{
    long long *tmp = new long long[128]; // 申请 1024
    delete[] tmp; // 释放 1024

    long long *tmp2 = (long long *) malloc(sizeof(long long) * 128); // 申请 1024
    free(tmp2); // 释放 1024
}

```
代码加了内存申请、释放的注释，注意，这里是代码角度的虚拟内存，编译可能对未使用的代码片段做优化，延迟向OS申请。

## 使用jemalloc

[jemalloc](https://github.com/jemalloc/jemalloc) 是一个通用的 malloc(3) 实现，重点关注减少内存碎片以及支持可扩展的并发性能。它是一个高性能的内存分配器，同时也具备面向开发者的支持特性，如堆内存分析（heap profiling）以及丰富的监控与调优接口（hooks），这里正是利用这一点来实现。

示例代码如下，通过 jemalloc 的 mallctl 接口，获取 thread 的 allocated 或 deallocated 字节数，注意这里的字节数是累计的，如果要获取增量需要做一下做一下两次统计的差值。

```
#include <jemalloc/jemalloc.h>
#include <sys/syscall.h>   // SYS_gettid
#include <unistd.h>       // syscall(), pid_t


void print_thread_stats(pid_t tid)
{
    size_t allocated = 0;
    size_t sz = sizeof(allocated);

    if (mallctl("thread.allocated", &allocated, &sz, NULL, 0) == 0) {
        printf("Thread[%d] allocated: %zu bytes\n", tid, allocated);
    }

    size_t deallocated = 0;
    sz = sizeof(deallocated);
    if (mallctl("thread.deallocated", &deallocated, &sz, NULL, 0) == 0) {
        printf("Thread[%d] deallocated: %zu bytes\n", tid, deallocated);
    }
    printf("Thread[%d] memory: %zu bytes\n", tid, allocated - deallocated);
}


void thread1()
{
    pid_t tid = syscall(SYS_gettid);
    for (unsigned i = 0; i < 5; ++i)
    {
        PackageA a;
        a.allocTest();
        sleep(1);
	    print_thread_stats(tid);
    }
}

```

执行输出结果:
```
$LD_PRELOAD=../libjemalloc.so ./app                                                             
Thread[726648] allocated: 1024 bytes                                                                                                     
Thread[726648] deallocated: 0 bytes                                                                                                     
Thread[726648] memory: 1024 bytes                                                                                                       
Thread[726648] allocated: 3072 bytes                                                                                                     
Thread[726648] deallocated: 1024 bytes                                                                                                   
Thread[726648] memory: 2048 bytes                                                                                                       
Thread[726648] allocated: 4096 bytes                                                                                                     
Thread[726648] deallocated: 2048 bytes                                                                                                   
Thread[726648] memory: 2048 bytes                                                                                                       
Thread[726648] allocated: 5120 bytes                                                                                                     
Thread[726648] deallocated: 3072 bytes                                                                                                   
Thread[726648] memory: 2048 bytes                                                                                                       
Thread[726648] allocated: 6144 bytes                                                                                                     
Thread[726648] deallocated: 4096 bytes                                                                                                   
Thread[726648] memory: 2048 bytes
```
从日志可以看到，第一轮申请 1024 ，第二轮申请了 2048 ，从代码分析看，每一轮的申请量应该都是 1024 。这里多出来的 1024 从哪里来呢？搜索得到的结论是jemalloc 向 OS 申请时才会被记录，这里存在一个疑问，为什么不能复用第一轮的缓存，要分析源码才能证实。 从这个结果数据可以看出，它并不能精确表达用户实际的申请释放，这里只能看内存趋势。

```
buffer_(malloc)   → 1024
tmp(malloc)   → 256
tmp(free)
tmp(new[])   → 1024
tmp(delete[])
tmp2(malloc) → 1024
tmp2(free)
# 统计
buffer_(free)
```
### 优势
- 线程级统计
- 性能比较好，O(1)的复杂度
### 劣势
- 代码侵入性，需要在每个线程增加统计接口
- 统计准确性不加，适合看趋势

## 使用mimalloc
[mimalloc](https://github.com/microsoft/mimalloc)（发音为“me-malloc”）是一种具有出色性能特点的通用内存分配器。它具有小巧且一致、空闲列表分片、空闲列表多分片、急切页面清理、安全、一流堆、有界性、快速等显著特性。在mimalloc的基准测试中，mimalloc的性能优于其他领先的内存分配器（jemalloc、tcmalloc、Hoard等），并且通常使用更少的内存。

示例代码如下，通过 mimalloc 的 mi_heap_visit_blocks 接口，遍历 block 获取 thread 当前持有的 total_bytes，注意这里 stat 的字节数是累计的，如果要获取增量需要把 stat 做成每次统计的局部量。

```
#include <sys/syscall.h>   // SYS_gettid
#include <unistd.h>       // syscall(), pid_t
#include <mimalloc.h>

typedef struct {
    size_t total_bytes;
    size_t block_count;
} heap_stat_t;

bool visitor(
    const mi_heap_t* heap,
    const mi_heap_area_t* area,
    void* block,
    size_t block_size,
    void* arg)
{
    (void)heap;
    (void)area;
    (void)block;

    heap_stat_t* stat = (heap_stat_t*)arg;
    stat->total_bytes += block_size;
    stat->block_count += 1;

    return true; // 继续遍历
}

mi_heap_t* heap_init()
{
    // 1. 创建线程私有 heap
    mi_heap_t* heap = mi_heap_new();

    // 2. 绑定为当前线程的 default heap
    mi_heap_set_default(heap);

    return heap;
}

void heap_deinit(mi_heap_t* heap)
{
    // 3. 恢复原 heap（可选但推荐）
    mi_heap_set_default(mi_heap_get_backing());

    // 4. 删除私有 heap（非常重要）
    mi_heap_delete(heap);
}

void print_thread_stats(pid_t tid, mi_heap_t* heap, heap_stat_t &stat)
{
    mi_heap_visit_blocks(
        heap,           // 当前线程 heap
        false,          // 只统计 live block
        visitor,
        &stat
    );
    printf("Thread[%d] total: %zu bytes, count: %zu\n", tid, stat.total_bytes, stat.block_count);
}


void thread1()
{
    pid_t tid = syscall(SYS_gettid);
    mi_heap_t* heap = heap_init();
    heap_stat_t stat{0,0};
    for (unsigned i = 0; i < 5; ++i)
    {
	    PackageA a;
        a.allocTest();
        sleep(1);
	    print_thread_stats(tid, heap, stat);
    }
    heap_deinit(heap);
}

```
输出结果为：
```
$ ./app
Thread[758926] total: 1024 bytes, count: 1
Thread[758926] total: 2048 bytes, count: 2
Thread[758926] total: 3072 bytes, count: 3
Thread[758926] total: 4096 bytes, count: 4
Thread[758926] total: 5120 bytes, count: 5
```

```
# 如把 stat 作为 print_thread_stats 的函数内局部变量，获取的就是本轮的内存占用
$ LD_PRELOAD=../../mimalloc_3.0.11/lib/libmimalloc.so ./app                                                                                           
Thread[242478] total: 1024 bytes, count: 1                                                                              
Thread[242478] total: 1024 bytes, count: 1                                                                              
Thread[242478] total: 1024 bytes, count: 1                                                                              
Thread[242478] total: 1024 bytes, count: 1                                                                              
Thread[242478] total: 1024 bytes, count: 1                    
```
mimalloc 的累计统计结果更难以理解，看起来每轮都申请了一份内存，而没有复用。 

### 优势
- 线程级统计
- 每轮统计live数据准确
### 劣势
- 代码侵入性，需要在每个线程增加统计接口
- 遍历 block 是 O(N) 复杂度，在高频使用时，性能无法接受。

## 总结
主流的内存工具分两类：一类是valgrind、fastgrind、perf等类似的内存分析、泄露定位工具。基本都能抓取详细的调用栈，内存的使用量，按进程的统计量等等。 另一类是tcmalloc、jemalloc、mimalloc等类似的高效内存分配器。主要功能是高效的分配回收内存，附带了一些profiling工具。

从我们的查找结果来看，没有找到开源实现来做线程级的内存监控。主要原因在于 Linux 是按进程维度管理内存的，进程中的不同线程共享该进程的虚拟内存；另一方面虚拟内存不一定会向 OS 申请物理内存，虚拟内存并不代表该进程实际使用的内存。

那么，除了上述的各种开源工具外，是否还有更好的方式，来做到线程级内存监控？

这里有两个思路：

一个思路是从功能安全吸取经验，不使用动态内存。在初始化阶段把所有内存申请好，运行时复用，这也可以变相达成线程内存监控的功能。这种方式不只是在运行时可监控，甚至也可以做到静态可监控。每个线程的内存使用量都是设计时已知的。

另一个思路是统计线程的虚拟内存申请释放，重载 malloc/free、new/delete 等接口，使用 TLS 方法记录每个线程的内存情况。使用 PRELOAD 的方式可以做到代码无侵入，但重载增加的记录功能会带来一定的性能损耗，这在低成本硬件上是否可接受需要评估一下。 这里还有一个难点是对于跨线程释放的内存，正确的统计到申请线程上，避免因统计带来的账面内存泄露现象。

下述两个方法，根据情况取舍：
- 强行注入 16 字节的 memory header，跟踪内存来自哪个线程，性能上损耗不大，但对于小内存不友好，每次申请增加 16 个字节。
- 增加一个全局数组，记录 tid 和 内存的关系，数组需要限制大小，频繁申请可能会记录不全，线程间需要加锁访问，性能上有损耗。
