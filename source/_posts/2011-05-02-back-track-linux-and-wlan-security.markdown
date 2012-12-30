---
comments: true
date: 2011-05-02 23:39:06
layout: post
title: Back Track Linux与无线安全
categories:
- Linux
tags:
- BT
- Linux
- Wlan
---

[Back Track Linux](http://www.backtrack-linux.org/)是什么？知道这个全称的人可能不是很多，但说起BT3或者BT4，crack无线的都知道，若说起卡王卡皇，那可谓家喻户晓......所谓的蹭网卡(卡王卡皇之类)就是一个大功率的无线网卡，加上一个BT Linux；而BT3或BT4则是指Back Track与版本号的简写。

Back Track是基于Whoppix, IWHAX 以及 Auditor这三个live Linux发布开发的，这几个Linux发布版的共同点就是都聚焦于penetration test (渗透测试)与信息安全领域。从Back Track 4开始，Back Track开始基于Ubuntu开发，同时集成了从端口扫描到密码破解的一系列安全工具。由于其强大的工具集，Back Track已成为破解无线网络密码的专用工具。关于Back Track的更详细介绍以及工具集介绍可以从[官方网站](http://www.backtrack-linux.org/)或[wiki](http://en.wikipedia.org/wiki/BackTrack)查看。
<!-- more -->
说到破解无线网络密码，不得不提到一个举足轻重的工具[aircrack-ng](http://www.aircrack-ng.org/) (其官方网站已被墙)，以下是摘自官方的介绍：

Aircrack-ng is an 802.11 WEP and WPA-PSK keys cracking program that can recover keys once enough data packets have been captured. It implements the standard FMS attack along with some optimizations like KoreK attacks, as well as the all-new PTW attack, thus making the attack much faster compared to other WEP cracking tools.

In fact, Aircrack-ng is a set of tools for auditing wireless networks.

可以看出，只要抓取到了足够的数据，Aircrack-ng 可以得到 WEP 和 WPA-PSK 加密的密码，这也是目前大多数无线网卡使用的加密方式，当然还有更加安全的WPA2，貌似现在也可以recover keys，只是比较难而已。关于这几种加密算法，稍后会详细介绍一下。aircrack-ng是一个工具集，从改变网卡模式、注入入侵到抓取数据包、破解密码：
	
  * [airbase-ng](http://www.aircrack-ng.org/doku.php?id=airbase-ng) -- Multi-purpose tool aimed at attacking clients as opposed to the Access Point (AP) itself.
	
  * [aircrack-ng](http://www.aircrack-ng.org/doku.php?id=aircrack-ng) -- 802.11 WEP and WPA/WPA2-PSK key cracking program.
	
  * [airdecap-ng](http://www.aircrack-ng.org/doku.php?id=airdecap-ng) -- Decrypt WEP/WPA/WPA2 capture files.
	
  * [airdecloak-ng](http://www.aircrack-ng.org/doku.php?id=airdecloak-ng) -- Remove WEP Cloaking™ from a packet capture file.
	
  * [airdriver-ng](http://www.aircrack-ng.org/doku.php?id=airdriver-ng) -- Script providing information and allowing installation of wireless drivers.
	
  * [airdrop-ng](http://www.aircrack-ng.org/doku.php?id=airdrop-ng) -- A rule based wireless deauthication tool.
	
  * [aireplay-ng](http://www.aircrack-ng.org/doku.php?id=aireplay-ng) -- Inject and replay wireless frames.
	
  * [airgraph-ng](http://www.aircrack-ng.org/doku.php?id=airgraph-ng) -- Graph wireless networks.
	
  * [airmon-ng](http://www.aircrack-ng.org/doku.php?id=airmon-ng) -- Enable and disable monitor mode on wireless interfaces.
	
  * [airodump-ng](http://www.aircrack-ng.org/doku.php?id=airodump-ng) -- Capture raw 802.11 frames.
	
  * [airolib-ng](http://www.aircrack-ng.org/doku.php?id=airolib-ng) -- Precompute WPA/WPA2 passphrases in a database to use it later with aircrack-ng.
	
  * [airserv-ng](http://www.aircrack-ng.org/doku.php?id=airserv-ng) -- Wireless card TCP/IP server which allows multiple application to use a wireless card.
	
  * [airtun-ng](http://www.aircrack-ng.org/doku.php?id=airtun-ng) -- Virtual tunnel interface creator.
	
  * [easside-ng](http://www.aircrack-ng.org/doku.php?id=easside-ng) -- Auto-magic tool which allows you to communicate to an WEP-encrypted Access Point without knowing the key.
	
  * [packetforge-ng](http://www.aircrack-ng.org/doku.php?id=packetforge-ng) -- Create various type of encrypted packets that can be used for injection.
	
  * [tkiptun-ng](http://www.aircrack-ng.org/doku.php?id=tkiptun-ng) -- Proof-of-concept implementation the WPA/TKIP attack: inject a few frames into a WPA TKIP network with QoS
	
  * [wesside-ng](http://www.aircrack-ng.org/doku.php?id=wesside-ng) -- Auto-magic tool which incorporates a number of techniques to seamlessly obtain a WEP key in minutes.

一个crack的基本流程是：airmon-ng --> airodump-ng --> aireplay-ng --> aircrack-ng. 安全工具是一把双刃剑，有些人用它来安全检测，防患于未然，而有些人则用它来谋取私利。这关乎一个道德问题......关于Back Track Linux以及无线安全工具的介绍就到这里，下面介绍一下无线安全的几种方法以及其优劣。

Wi-Fi是一个国际通用的无线标准，应该说几乎所有的有无线功能的产品都支持这个标准，但是它同时也因为存在着一些不安全因素而被大家所诟病，这也是我朝开发WAPI无线标准的一方面原因，当然，最重要的原因不是这个，你懂的...

关于Wi-Fi的简单介绍可以参看[Wiki:Wi-Fi](http://zh.wikipedia.org/zh-cn/Wi-Fi)，其基本工作原理是(摘自wiki)：

Wi-Fi的设置至少需要一个Access Point（ap）和一个或一个以上的client（hi）。AP每100ms将SSID（Service  Set Identifier）经由beacons（信号台）分组广播一次，beacons分组的传输速率是1  Mbit/s，并且长度相当的短，所以这个广播动作对网络效能的影响不大。因为Wi-Fi规定的最低传输速率是1  Mbit/s，所以确保所有的Wi-Fi  client端都能收到这个SSID广播分组，client可以借此决定是否要和这一个SSID的AP连接。用户可以设置要连接到哪一个SSID。Wi- Fi系统总是对客户端开放其连接标准，并支持漫游，这就是Wi-Fi的好处。但亦意味着，一个无线适配器有可能在性能上优于其他的适配器。

作为无线使用者，在设置无线路由时，可以从这几个方面考虑安全性：

1.隐藏SSID，隐藏SSID的作用是其他无线client搜寻不到你的AP，或者说是看不到你的AP的存在。但是在无线扫描器的淫威下，隐藏了也无处遁形，如大名鼎鼎的[NetStumbler](http://www.stumbler.net/)。

2.设置mac过滤，mac过滤是一个很好的安全措施，通过设置mac黑名单，让只能允许的mac才能通过验证，但是如若知道了client的mac，通过伪装mac可以轻易的逃过mac过滤。

3.WEP 是最先被破解的无线加密算法，全称Wired Equivalent Privacy。WEP使用RC4 (Rivest Cipher)串流加密技术达到机密性，并使用CRC-32验和正确性。 标准的64比特WEP使用40比特的钥匙接上24比特的初向量（initialization vector，IV）成为 RC4 用的钥匙。24比特的IV很难保证在繁忙的网络上不重复，所以很容易受到攻击。

4.为解决WEP的不安全性，Wi-Fi联盟开发了WPA，全称Wi-Fi Protected Access。WPA使用128比特的钥匙和一个 48比特的初向量 (IV) 的RC4 stream cipher来加密。WPA 超越 WEP 的主要改进就是在使用中可以动态改变钥匙的“临时钥匙完整性协定”（Temporal Key Integrity Protocol, TKIP），加上更长的初向量，这可以击败针对 WEP 的攻击。其Michael加密算法有效的避免了WEP中的replay-attack攻击。但是由于固件的原因，并不是所有的无线路由都支持WPA，很大一部分无线路由仅仅支持WEP。

5.在WPA的基础上，Wi-Fi联盟开发了WPA2，WPA2最大的改进是CCMP讯息认证码取代了Michael算法，AES取代了RC4。WPA和WPA2的设计是使用一个802.1X认证服务器分配不同的钥匙给各个用户，但是也可以使用较不保险的PSK (Pre-Shared Key)模式，让每个用户都使用相同的密钥。WPA-PSK/WPA2-PSK也称为WPA/WPA2个人版，由于使用相同的密钥，使得攻击者有机可乘，降低了其安全性。

由于本身对无线网络不是很深入，在研究Back Track时暂时想到这些，如果想到其他的好方法再补充一下。可以认为WPA和WPA2是目前比较安全的加密方式，不易受到攻击，但是需要相应的固件支持。
