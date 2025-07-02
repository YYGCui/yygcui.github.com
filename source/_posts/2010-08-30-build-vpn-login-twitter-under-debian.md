---
comments: false
date: 2010-08-30 21:16:42
layout: post
title: Debian下建立VPN及登录twitter的方法
categories:
- 技术积累
tags:
- debian
- Linux
- twitter
- vpn
---

前言：自从twitter面世，迅速风靡全球，也许在我们刚刚知道twitter是什么的时候，它已被GFW拒之墙外，这挡不住广大人民的热情，于是......，再于是就有了下面的故事......

如何登录到twitter？

1.如果你在墙外，那么恭喜你，精神与肉体都穿越了，你可以直接登录到twitter。
2.如果你在墙内，那么同样恭喜你，伟大的GFW保护你免受外界的侵害，同时也加强了你的网络知识，科研能力，动手能力...于是各种登录到twitter方法出现了......
<!-- more -->
如果你想直接登录，VPN, SSH等proxy给你强力保障，哦，还有一个tor。SSH Tunneling proxy没有用过，可以参考[《Ubuntu 下如何使用 SSH Tunneling Proxy ?》](http://wiki.wowubuntu.com/blog/ubuntu_ssh_tunneling)，如果你觉得还是不给力的，可以Google一下ssh proxy，网上资料很多；其实之前在windows下也不用VPN的，一般用freedoor (需穿越下载)，因为当开启VPN时，原来登录的IM像fetion, QQ等都会掉线，而这些在日常交流中使用还是满多的，极不方便～～～

debian下如何建立一个VPN连接呢，其实也很简单，有两种软件程序可以使用吧，一是openVPN，这个貌似使用配置没那么人性化，没有研究过；一是pptp-linux，pptp是VPN的一种连接方式，pptp-linux是客户端程序，安装方法如下：

1)直接在Synaptic Package Manager中Search pptp，选择network-manager-pptp, network-manager-pptp-gnome, pptp-linux这三个软件包安装。

![VPN](http://farm5.static.flickr.com/4121/4937917136_ceb6c16aee.jpg)

当然，如果你是command line控，也可以用命令：
[bash]$sudo apt-get install network-manager-pptp network-manager-pptp-gnome pptp-linux[/bash]
接下来的配置就比较简单了，点击右上角的网络图标，里面有个VPN Connections选项，然后里面有个子选项Configure VPN...，第一次建立的话，直接弹出create向导，根据向导很简单的就可以建立了，如下图

![VPN](http://farm5.static.flickr.com/4114/4941444276_fb438ba419.jpg)

VPN帐号你可以买一个，也可以使用免费的，花钱的有速度保障，一般流量较大，免费的流量比较少，速度还可以吧。我使用的是[Macrovpn](http://macrovpn.com/)的免费版，每月2GB的流量。
建立好VPN连接，就可以直接访问twitter了。

**免费VPN列表** (来自[这里](http://www.avinashtech.com/internet/15-best-free-vpn-for-secure-anonymous-surfing/)和[这里](http://techpp.com/2009/07/09/top-5-free-vpn-clients/))

1.客户端 (使用专用客户端登录，大多数仅支持windows)

(1)[LOGMEIN HAMACHI](https://secure.logmein.com/US/products/hamachi2/default.aspx): 对于非商业用户和个人用户完全免费，提供SSL链接
(2)[ULTRAVPN](https://www.ultravpn.fr/): 基于OpenVPN的C/S架构的SSL VPN，悲剧的是访问网站需穿越
(3)[ALONWEB](http://alonweb.com/): 提供荷兰和巴拿马的VPN服务器，1GB/月，最快2Mb/s，悲剧同上
(4)[PACKETIX.NET](http://www.packetix.net/en/): 日本提供的VPN服务，其online test服务也就是免费VPN
(5)[CYBERGHOST](http://www.cyberghostvpn.com/files/download.php): 德国提供的VPN，免费版10GB/月，可惜只有window客户端。
(6)[GPASS](http://gpass1.com/gpass/): offers Internet solutions for information freedom in China and other regions.悲剧网站被墙(也许服务可用，没有测试)
(7)[ANCHORFREE HOTSPOT SHIELD](http://www.hotspotshield.com/): 悲剧同上(也许服务可用，没有测试)
(8)[LOKI NETWORK PROJECT FREE VPN SERVICE](http://www.projectloki.com/): 悲剧同上(也许服务可用，没有测试)
(9)[FREEVPN BY WSC](http://thefreevpn.com/): 无限制，支持windows2000--7以及iphone&ipad
(10)[ACEVPN](http://www.acevpn.com/): 免费服务采用邀请制，具体见官网，客户端涵盖Windows, Mac, Linux, iphone/ipad, routers等几乎所有系统

2. 无客户端 (可使用系统自建客户端)

(1)[MacroVPN](http://www.macrovpn.com): 免费版2G/月，提供美国，法国，意大利等地VPN。亲测可用
(2)[ITSHIDDEN](http://itshidden.com/): 无流量限制，但是我测试连接不上
(3)[VPNREACTOR](https://www.vpnreactor.com/): 30分钟断线限制，也就是30分钟要重连一次，但是我测试连不上。

当然也有很多优秀的客户端可以使用，如

firefox下的Echofon (前身是twitterfox), Yoono(这个是Twitter, Facebook, Linkedin, Youtube等等的整合软件)。
chrome下的Chromed Bird, Chrowety, Metrist, Yoono。

还有一些优秀的web应用，如Dabr, Netputer，可直接架设web客户端。

移动客户端，如BlackBerry上的Ubertwitter，S60上的Gravity，还有大多数手机通用的可直接穿越的神器－－Snaptu。

**9月1号**，twitter彻底关闭了basic auth验证，全面启用Oauth验证，现给出一些可Oauth验证的api proxy搭建方法/客户端：

(1)[GTAP](http://code.google.com/p/gtap/)+GAE: 只是搭建了一个Oauth验证proxy，需要配合客户端使用，如[Mixero](http://www.mixero.com/)，不支持自带Oauth验证的客户端，如chromed bird。一些问题讨论见[这里](http://code.google.com/p/gtap/issues/list)。
(2)[Twip](http://code.google.com/p/twip/)+PHP: Twip是可搭建于PHP空间上的oauth代理，具体搭建方法Google之。
(3)[twitter-oauth-login-proxy](http://code.google.com/p/twitter-oauth-login-proxy/): GAE+JAVA或者PHP两个版本，[web客户端](http://twitterlab.info/t/login.php)。
(4)[Dabr](http://code.google.com/p/dabr/)+PHP: 可直接搭建客户端，[Dabr主页](http://dabr.co.uk/)，可使用[@showfom](http://twitter.com/showfom)搭建的[手机web客户端](http://dabr.in/)
(5)[奶瓶腿](http://code.google.com/p/netputweets/)+PHP: 类Dabr支持Oauth验证，可自架设客户端，作者[博客](http://orzdream.com/)，[web客户端](https://t.orzdream.com/)，手机客户端：一键奶瓶腿的[黑莓版](http://www.berryon.com/blackberry/972.htm)和[S60 V3版](http://dang.yo2.cn/archives/639808)，详细参看[这里](http://orzdream.com/2009/08/netputweets-source/)。
(6)[itweet](http://itweet.net/):"the best interface for using Twitter on the iPhone or the Web! "
(7)[敏感词](https://tuite.im/): 一个很流行的web客户端。

以上5种搭建方法，可以自架设 (安全性考虑)，也可以使用别人已架设好的，尤其是Dabr和奶瓶腿，如果信得过的话，完全可以使用已架设好的客户端。关于如何架设，如何使用以及如何找到已架设好的，请使用伟大的Google之。
