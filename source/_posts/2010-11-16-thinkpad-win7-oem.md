---
comments: true
date: 2010-11-16 20:20:20
layout: post
title: Thinkpad Win7之OEM
categories:
- 技术积累
tags:
- OEM
- win7
---

以万恶的毕业论文为名，入手一thinkpad港行，话说港行就没有国内的这些服务了，没有预装系统，没有系统修复盘...好在学校提供了正版系统，从windows xp、vista到win7 professional中英文版都有，恩，对于一个强烈想享受正版却没有钱的学生来说，这无疑是最好的选择，使用了好长一段时间win7 pro了，可以这么说，win7的确是继xp之后最好用的windows，可惜这是建立在vista的失败之上的，也可以这么说，没有vista的失败，就不会有win7的成功，废话不多说了，转入正题，前段时间从网上下载了据说是MSDN放出的win7 ultimate版，由于没有序列号不能激活，所以没有尝试，在搜索Thinkpad 官方修复盘时发现了一个更好的方案，自己制作OEM版，不知道这算不算是盗版哈。
<!-- more -->
需要的文件：
1.win7 ultimate ISO文件，[VeryCD下载源](http://www.verycd.com/groups/0202/731660.topic)
2.OEM证书：[x86版](http://www.box.net/shared/j1d00o686c)，[x64版](http://www.box.net/shared/uz2zxaaud3)
要求：
BIOS中的SLIC为2.1版，即SLIC2.1

制作OEM版的步骤如下：
1.用UltraISO等能编辑ISO文件的软甲打开win7 iso文件。
2.用OEM证书中的sources文件夹中的文件替换win7 iso文件中的同名文件夹里的文件，然后保存即可。

其实是替换了一个文件ei.cfg，并增加了一个文件夹$OEM$，ei.cfg是一个强大的文件，打开它可以看到有三项：
[EditionID]是指定自动选择安装的版本，只有第一个有效，当EditionID无内容时会弹出系统版本选择菜单。
[Channel] 直译是渠道 ， 指定许可协议 OEM 或者 Retail 两种许可协议 不过 Starter 不论[Channel]为何，许可协议都是 OEM的
[VL] 当 VL 里的数值为 0 或 1 时，自动选择安装 EditionID 里指定的第一个版本，当 VL 里的数值大于 1 时，安装时弹出系统版本选择菜单。

从上面的解释可以知道，可以通过修改ei.cfg文件得到win7的任何版本，前提是你有该版本的序列号可以用来激活。

什么是SLIC呢，以及MS是如何通过SLIC控制OEM版的版权的呢？(来源：[维基百科](http://zh.wikipedia.org/zh/%E8%BD%AF%E4%BB%B6%E8%AE%B8%E5%8F%AF%E5%86%85%E9%83%A8%E7%A0%81))

### 1.概述

微软公司用SLIC来控制用户对OEM版本的非法使用。OEM（Original Equipment Manufacture）的基本含义是定牌生产合作，俗称“代工”。微软为特定的合作伙伴发放操作系统的OEM版本，以满足合作双赢的需求。这些OEM版本的操作系统随机器预安装，并采用批量许可的授权模式。这样的批量许可难以有效识别合法用户和非法用户，可能被滥用而导致版权问题。为了控制这个问题，微软规定在安装每一个操作系统时将其激活。OEM可在安装过程中根据OEM和批量许可的媒体安装映像。OEM销售的大部分系统包括由制造商预激活的Windows Vista标准版。
一般认为主板是硬件升级中最不可能更换的部件，甚至有观点认为，主板的更换约等于整台机器的更换。要有效识别一台机器是否为OEM合法用户，可以在每台预装操作系统的机器主板上，在BIOS里写入特定的信息，来标示这是一台OEM合法用户的机器。这样的信息就是SLIC。不同的OEM厂商的SLIC不同，所以他们的OEM操作系统不能混用。在没有预装系统的机器，即便是品牌机，也不会含有SLIC信息。这样，OEM版的操作系统就可以限定在OEM机器上使用。
SLIC一般是写在SLDT（Software Licensing Description Table，软件许可描述表）中的，SLDT长374字节。而SLDT写在ACPI（Advanced Configuration and Power Management Interface，高级配置和电源管理接口）。

### 2.运作模式

Windows XP OEM版激活，使用的是微软SLP 1.0。SLP（Software Licensing and Protection，软件许可和保护）服务是一项软件激活服务，使独立软件开发商为他们的用户采取灵活的软件许可条款。该1.0版本的激活技术并未使用数字签名技术，而是一段明文标识，比较容易被破解。
Windows Vista和Windows 7，取消了其他大客户版本，仅保留OEM版激活。其并使用的是微软SLP 2.x，公钥取代了明文，给破解造成一定的困难。SLP 2.x技术的验证具体过程如下：
1)当安装的时候，零售版本用户需要输入光盘盒上的序列号（CD-KEY）。对于随机购买了OEM版本Vista的用户，可以在主机上找到一个相应版本的标签，作为购买OEM版的凭证。标签上面有一个带有象征意义的序列号，因为OEM版本的用户并不需要输入序列号。系统根据序列号识别Vista的不同版本，如基本家庭版、高级家庭版、商业版、旗舰版等。安装完毕后，序列号会被转换为四组字母或数字，即在“系统属性”里看到的“产品ID”。其中第二组是“OEM”的，即为OEM版本的序列号（CD-KEY）。从这里开始，产品ID代替了CD-KEY。同时，安装程序为OEM版本的安装生成一个OEM证书。
2)当每次系统启动时，BIOS里的信息就会被加载到内存中。
3)当登录系统之后，系统调用SLP服务，验证操作系统的许可权，尤其是激活状态。开始根据产品ID来识别系统的授权状态。如果没有检测到产品ID或者没有检测到合法的零售版产品ID，则视为未激活。如果检测到合法的零售版产品ID，则视为成功激活。如果检测到OEM版的产品ID，则继续验证。
4)如果检测到OEM版产品ID，验证过程启动，并检查已安装的OEM证书是否正确。主要是用先前从BIOS加载到内存里的SLIC的公钥验证产品证书的数字签名。如果验证失败，则视为未激活。
5)验证ACPI里SLIC与RSDT（Root System Description Table，根系统描述表）的OEM ID字段比较，以及用ACPI里SLIC标志和XSDT（Extended System Description Table，扩展系统描述表）中的OEM ID和OEM Table ID字段比较，如果不一致，则视为未激活。
6)经过以上重重关卡之后，方视为正确的OEM授权，否则视为未激活并按照相关流程处理，例如要求激活。

SLIC有三部分组成：表头、SLP pubkey、SLP Maker，在大多数BIOS中是以明文存放的，可以用简单替换升级SLIC (未验证，从论坛中得到的信息)。

既然知道了SLIC是微软用来控制OEM版版权的，那么可以通过破解SLIC解除这种控制，可以通过刷BIOS实现硬件破解，也可以通过修改SLIC内存副本来实现软件上的破解，具体实现请Google
