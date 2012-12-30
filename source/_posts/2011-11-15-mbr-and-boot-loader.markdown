---
comments: true
date: 2011-11-15 19:23:25
layout: post
title: MBR与系统引导
categories:
- 扫盲随记
tags:
- Linux
- MBR
- winxp
---

周末不小心把Linux的boot分区由主分区改成了逻辑分区，导致用GRUB引导程序无法正常加载，后果是直接无法进入Windows和Linux系统，GRUB出现的错误如下图所示。虽然我知道进入DOS用命令fdisk /mbr重写一下MBR可以修复引导分区进入Windows，或者用Linux livecd启动重装一下GRUB修复GRUB引导程序，但有几个问题没有想明白：我将GRUB安装到MBR了，为啥更改boot分区会导致GRUB无法引导？进而想MBR是怎样引导系统的，难道要找到boot分区运行GRUB程序？我在Wiki找到了答案：[MBR](http://en.wikipedia.org/wiki/Master_boot_record) ([中文](http://zh.wikipedia.org/zh-cn/MBR))，[boot loader](http://en.wikipedia.org/wiki/Boot_loader#Boot_loader)，[GRUB](http://en.wikipedia.org/wiki/GNU_GRUB) ([中文](http://zh.wikipedia.org/wiki/GNU_GRUB))。
<!-- more -->
![Grub Load Error](http://farm9.staticflickr.com/8361/8325122410_0202a5b1b1_o.jpg)

**什么是MBR？**

MBR (Master Boot Record, 主引导记录) 是指存储设备的第一个扇区的前512个字节。对硬盘而言，一个扇区的可能字节数为128×2n  (n=0,1,2,3) ，大多数情况下，n=2，即一个扇区的大小为512个字节，所以MBR又被称为主引导扇区。MBR的基本结构为：

<table class="aligncenter" style="margin-left: auto; margin-right: auto;" border="1">
<tr>
<th colspan="3">Address</th>
<th style="vertical-align: middle;" rowspan="2" colspan="2">Description</th>
<th style="vertical-align: middle;" rowspan="2">Size in <a title="Byte" href="http://en.wikipedia.org/wiki/Byte" target="_blank">bytes</a></th>
</tr>
<tr>
<th style="width: 3em;"><a title="Hexadecimal" href="http://en.wikipedia.org/wiki/Hexadecimal" target="_blank">Hex</a></th>
<th style="width: 3em;"><a title="Octal" href="http://en.wikipedia.org/wiki/Octal" target="_blank">Oct</a></th>
<th style="width: 3em;"><a title="Decimal" href="http://en.wikipedia.org/wiki/Decimal" target="_blank">Dec</a></th>
</tr>
<tr>
<td style="text-align: center;"><code>0000</code></td>
<td style="text-align: center;"><code>0000</code></td>
<td style="text-align: center;">0</td>
<td colspan="2">code area (代码区)</td>
<td style="text-align: center;"><strong>440</strong></br>(max.446)</td>
</tr>
<tr>
<td style="text-align: center;"><code>01B8</code></td>
<td style="text-align: center;"><code>0670</code></td>
<td style="text-align: center;">440</td>
<td colspan="2">disk signature (optional) (磁盘标记，可选)</td>
<td style="text-align: center;"><strong>4</strong></td>
</tr>
<tr>
<td style="text-align: center;"><code>01BC</code></td>
<td style="text-align: center;"><code>0674</code></td>
<td style="text-align: center;">444</td>
<td colspan="2">Usually nulls; 0&#215;0000(一般为空)</td>
<td style="text-align: center;"><strong>2</strong></td>
</tr>
<tr>
<td style="text-align: center;"><code>01BE</code></td>
<td style="text-align: center;"><code>0676</code></td>
<td style="text-align: center;">446</td>
<td colspan="2"><strong>Table of primary partitions (主分区表)</strong></br>(Four 16-byte entries, IBM partition table scheme)</td>
<td style="text-align: center;"><strong>64</strong></td>
</tr>
<tr>
<td style="text-align: center;"><code>01FE</code></td>
<td style="text-align: center;"><code>0776</code></td>
<td style="text-align: center;">510</td>
<td style="text-align: center;">55h</td>
<td style="vertical-align: middle; text-align: center;" rowspan="2">MBR signature (MBR标记)</td>
<td style="text-align: center;" rowspan="2"><strong>2</strong></td>
</tr>
<tr>
<td style="text-align: center;"><code>01FF</code></td>
<td style="text-align: center;"><code>0777</code></td>
<td style="text-align: center;">511</td>
<td style="text-align: center;">AAh</td>
</tr>
<tr>
<th style="text-align: right;" colspan="5">MBR, total size: 446 + 64 + 2 =</th>
<th style="text-align: center;">512</th>
</tr>
</table>

从MBR的结构可以看出，硬盘分区表仅占64个字节，根据IBM分区表方案，用16个字节表示一个分区，所以采用MBR分区结构的系统最多能识别4个主分区，如windows。为了能够使用更多的分区，引入了扩展分区的概念，扩展分区也是主分区的一种，但它与主分区的不同之处在于理论上扩展分区可以划分出无数个逻辑分区。扩展分区中逻辑驱动器的引导记录是链式的。每一个逻辑分区都有一个和MBR结构类似的**扩展引导记录**(**[EBR](http://en.wikipedia.org/wiki/Extended_boot_record)**)，其分区表的第一项指向该逻辑分区本身的引导扇区，第二项指向下一个逻辑驱动器的EBR，分区表第三、第四项没有用到。

在windows中，我们可以使用的分区方案：最多4主分区，或者最多3主分区+1扩展分区 (包含任意数量的逻辑分区)。

在Linux中，同样采用MBR分区方案：最多4主分区(sda1~sda4或者hda1~hda4)，或者最多3主分区+1扩展分区 (逻辑分区编号从sda5/hda5开始)。

**系统是如何被引导启动的？**

系统启动时，CPU执行位于BIOS的存储单元CS:IP F000:FFF0 (线性地址0xFFFF0处)处的指令，跳转到ROM中的BOIS引导程序，引导程序运行加电自检(Power-On Self Test, POST) 检查和初始化需要的硬件设备。

BIOS按照预配置的非易失存储设备 (引导设备序列) 查找可引导的设备。引导设备定义为能够从中读取数据，并且第一扇区的最后两个字节是0xAA55 (也即引导标记)。

一旦BIOS找到一个可引导设备，它将该设备的引导扇区 (第一扇区) 加载到内存线性地址0x7C00处，然后跳转到该地址执行引导程序。

以windows的引导为例：

BIOS加电自检后，MBR引导代码从MBR的主分区表中查找可引导的分区 (即活动分区)，然后MBR引导代码加载活动分区的引导扇区代码 (系统引导程序) 并执行，该引导程序将系统内核加载到内存中并将控制权移交给内核。

**GRUB是如何启动的？**

以上的内容还不足以解释GRUB为何加载失败了。再来看MBR的结构，MBR引导代码最多能占用446个字节，对于只引导Windows这样的单一功能已经足够了；但对于像GRUB、LILO等复杂的多引导支持的引导程序来说，446个字节难以实现如此复杂的功能，这时就用到了多级引导的概念。以GRUB为例：

将GRUB安装到MBR时，实际上只是将GRUB的stage 1安装到了MBR的代码区，stage 1的功能是通过加载磁盘起始处附近从一固定处开始的一些扇区来加载GRUB的下一个stage。

stage 1可以直接加载stage 2，但通常被设置为加载stage 1.5，然后stage 1.5直接加载stage 2。stage 1.5是指紧接着MBR之后的在第一个磁盘分区前的30千字节。它包含了具体的文件系统驱动。该驱动允许stage 1.5直接加载位于文件系统/boot/grub下的stage 2。

stage 2加载配置文件并呈现一个界面让用户选择要启动的操作系统内核，然后将选择载入的内核加载到内存并把控制权转交给内核。GRUB也可以通过链式启动([chain loading](http://en.wikipedia.org/wiki/Chain_loading))把启动控制权转交给其他引导程序，如通过GRUB引导Windows时的chainload (hdX,Y)+1，通常是(hd0,0)+1，即第一个主分区的引导扇区。

那么现在就很好解释了，由于把/boot分区由主分区改成了逻辑分区，stage 1.5找不到该分区，也就找不到stage 2，所以GRUB引导程序加载失败了。
