---
comments: true
date: 2010-11-20 15:59:00
layout: post
title: DHCP Relay实现分析
categories:
- 技术积累
tags:
- DHCP
- relay
- Programming
---

前段时间看了一下DHCP Relay的实现代码，位于网络中使用最广泛的开源DHCP实现--[ISC's DHCP](http://www.isc.org/software/dhcp)中，本以为不到一千行的代码可以很快搞定，看了才知道加上调用的函数何止一千行，何况在没有任何基础的情况下，理解起来相当费力，虽然网络中可以找到实现原理介绍，但是很难和代码结合起来。只好看了一下DHCP标准文档RFC 2131，以及relay agent的标准文档RFC 1542。为了便于下面的分析，先简单介绍一下DHCP。
<!-- more -->
DHCP(Dynamic Host Configuration Protocol)中文称为动态主机配置协议，用来为网络主机提供配置参数。它包括两个组件：一个是用来从服务器向客户端传送具体配置参数的协议，一个是给主机分配网络地址的机制。DHCP是以C/S模式设计的，DHCP服务器分配网络地址并传送配置参数给动态配置的主机。它是基于UDP协议传输数据的，主要有两个用途：一是给主机分配网络地址(IP地址)，一是给网络管理员对所有主机中央管理的手段。
DHCP支持三种IP地址分配机制。
自动分配：DHCP Server分配一个永久固定的IP地址给Client。
动态分配：DHCP Server分配一个一定租约期限的IP地址给Client。
手动分配：网络管理员指定一个IP地址给Client，DHCP Server只简单的负责传送。
动态分配是这三种机制中唯一可以重用已申请的不再使用的IP地址的一种机制，考虑到IP地址的有限性以及管理配置的复杂性，这种机制在使用中也是最广泛的。

DHCP是一个局域网协议，只能管理同一个网络或子网(network/subnet)中的Clients，那么多个子网(subnet)存在时，可以在每个子网中设立一个DHCP Server，这显然是一种浪费，也不利于对所有子网主机的管理，于是relay agent就被引入来打破这种物理格局。值得注意的是，DHCP实际上是对BOOTP(Bootstrap Protocol)协议的加强与改进，DHCP的消息格式和BOOTP的消息格式是一样的，只是术语有所改变，所以在DHCP中relay agent就是BOOTP relay agent，这就不难理解消息类型是BOOTREQUST/BOOTREPLY了。

DHCP中Client和Server交互的一般流程可分为4步：
1.DHCPDISCOVER(客户机请求IP)，Client在所在子网广播DHCPDISCOVER消息，这个消息可以包含预申请的IP地址和租约选项，若Server不在同一子网中时，则通过BOOTP relay agents传递消息。
2.DHCPOFFER(服务器响应)，Server单一传播/广播(unicast/broadcast)DHCPOFFER消息回应Client请求，消息的’yiaddr‘域中包含分配的ip地址，该地址可以是Client请求的也可以是Server另外分配的，如果需要的话，使用BOOTP relay agents传送给Client。
3.DHCPREQUEST(客户机选择IP)，Client从一个或多个Server(s)收到一个或多个DHCPOFFER消息，根据消息中的配置参数选择一个Server，并广播DHCPREQUEST消息给Server，为了保证BOOTP relay agents正确转发给相应的Server，需要在消息的’secs‘域设置和DHCPDISCOVER消息中相同的值。
4.DHCPACK/DHCPNAK(服务器)，未被选择的Server根据DHCPREQUEST消息知道Client拒绝了offer，被选择的Server把绑定信息存储在数据库，然后单一传播/广播(unicast/broadcast)给请求的Client发送一个包含配置参数(mac in 'chaddr', ip in 'yiaddr')的DHCPACK消息。

这里Server的响应消息DHCPOFFER，DHCPACK等，有单一传播/广播(unicast/broadcast)两种方式，那么什么时候单一传播/广播(unicast/broadcast)呢？
一般情况下，这些响应消息都是通过单一传播(unicast)直接发送给Client的，但是有些Client在未配置IP地址前是不能接受这些单一传播(unicast)的IP数据包的，这些Client在发送的消息中会设置’flags‘域中的BROADCAST位为1，用来告知Server和BOOTP relay agent广播任何发送到Client的消息。
按消息类型划分，Client接收的消息是BOOTREPLY类型的，包括DHCPOFFER、DHCPACK等；Server接收的消息是BOOTREQUEST类型的，包括DHCPDISCOVER、DHCPREQUEST等。

下面结合dhcrelay.c中的代码分析一下BOOTP relay agent具体做了什么
(为了便于分析和显示，都代码进行了精简，只保留了主要的代码段，源码下载：[http://www.isc.org/software/dhcp](http://www.isc.org/software/dhcp))
``` c
	int main (argc, argv, envp)
		int argc;
		char **argv, **envp;
	{
		/* parameters definition */
		/* Make sure we have stdin, stdout and stderr. */
		/* Set up the OMAPI. */
		status = omapi_init ();
	
		/* Set up the OMAPI wrappers for the interface object. */
		interface_setup ();
		/* usage like shell */
	
		/* Default to the DHCP/BOOTP port. */
	
		/* Set up the server sockaddrs. */
		for (sp = servers; sp; sp = sp -> next) {
			sp -> to.sin_port = local_port;
			sp -> to.sin_family = AF_INET;
	#ifdef HAVE_SA_LEN
			sp -> to.sin_len = sizeof sp -> to;
	#endif
		}
	
		/* Get the current time... */
		GET_TIME (&cur_time);
	
		/* Discover all the network interfaces. */
		discover_interfaces (DISCOVER_RELAY);
	
		/* Set up the bootp packet handler... */
		bootp_packet_handler = relay;
	
		/* Become a daemon... */
		
		/* Start dispatching packets and timeouts... */
		dispatch ();
	
		/*NOTREACHED*/
		return 0;
	}
	
	void relay (ip, packet, length, from_port, from, hfrom)
		struct interface_info *ip;
		struct dhcp_packet *packet;
		unsigned length;
		unsigned int from_port;
		struct iaddr from;
		struct hardware *hfrom;
	{
		struct server_list *sp;
		struct sockaddr_in to;
		struct interface_info *out;
		struct hardware hto, *htop;
	
		if (packet -> hlen > sizeof packet -> chaddr) {
			log_info ("Discarding packet with invalid hlen.");
			return;
		}
	
		/* Find the interface that corresponds to the giaddr
		   in the packet. */
		if (packet -> giaddr.s_addr) {
			for (out = interfaces; out; out = out -> next) {
				if (!memcmp (&out -> primary_address,
					     &packet -> giaddr,
					     sizeof packet -> giaddr))
					break;
			}
		} else {
			out = (struct interface_info *)0;
		}
	
		/* If it's a bootreply, forward it to the client. */
		if (packet -> op == BOOTREPLY) {
			if (!(packet -> flags & htons (BOOTP_BROADCAST)) &&
				can_unicast_without_arp (out)) {
				to.sin_addr = packet -> yiaddr;
				to.sin_port = remote_port;
	
				/* and hardware address is not broadcast */
				htop = &hto;
			} else {
				to.sin_addr.s_addr = htonl (INADDR_BROADCAST);
				to.sin_port = remote_port;
	
				/* hardware address is broadcast */
				htop = NULL;
			}
			to.sin_family = AF_INET;
	#ifdef HAVE_SA_LEN
			to.sin_len = sizeof to;
	#endif
	
			memcpy (&hto.hbuf [1], packet -> chaddr, packet -> hlen);
			hto.hbuf [0] = packet -> htype;
			hto.hlen = packet -> hlen + 1;
	
			/* Wipe out the agent relay options and, if possible, figure
			   out which interface to use based on the contents of the
			   option that we put on the request to which the server is
			   replying. */
			if (!(length =
			      strip_relay_agent_options (ip, &out, packet, length)))
				return;
	
			if (!out) {
				log_error ("packet to bogus giaddr %s.n",
				      inet_ntoa (packet -> giaddr));
				++bogus_giaddr_drops;
				return;
			}
	
			if (send_packet (out,
					 (struct packet *)0,
					 packet, length, out -> primary_address,
					 &to, htop) < 0) {
				++server_packet_errors;
			} else {
				log_debug ("forwarded BOOTREPLY for %s to %s",
				       print_hw_addr (packet -> htype, packet -> hlen,
						      packet -> chaddr),
				       inet_ntoa (to.sin_addr));
	
				++server_packets_relayed;
			}
			return;
		}
	
		/* If giaddr matches one of our addresses, ignore the packet -
		   we just sent it. */
		if (out)
			return;
	
		/* Add relay agent options if indicated.   If something goes wrong,
		   drop the packet. */
		if (!(length = add_relay_agent_options (ip, packet, length,
							ip -> primary_address)))
			return;
	
		/* If giaddr is not already set, Set it so the server can
		   figure out what net it's from and so that we can later
		   forward the response to the correct net.    If it's already
		   set, the response will be sent directly to the relay agent
		   that set giaddr, so we won't see it. */
		if (!packet -> giaddr.s_addr)
			packet -> giaddr = ip -> primary_address;
		if (packet -> hops < max_hop_count)
			packet -> hops = packet -> hops + 1;
		else
			return;
	
		/* Otherwise, it's a BOOTREQUEST, so forward it to all the
		   servers. */
		for (sp = servers; sp; sp = sp -> next) {
			if (send_packet ((fallback_interface
					  ? fallback_interface : interfaces),
					 (struct packet *)0,
					 packet, length, ip -> primary_address,
					 &sp -> to, (struct hardware *)0) < 0) {
				++client_packet_errors;
			} else {
				log_debug ("forwarded BOOTREQUEST for %s to %s",
				       print_hw_addr (packet -> htype, packet -> hlen,
						      packet -> chaddr),
				       inet_ntoa (sp -> to.sin_addr));
				++client_packets_relayed;
			}
		}
					 
	}
```
main函数的主流程是这样的：OMPI初始化->设置Server的port->Server的socket address->discover_interfaces()找到该子网中所有的Client端口->实现relay()功能->包的分派。
其中relay()函数实现了BOOTP relay agent的主要功能，relay()功能分为两部分：1)对BOOTREPLY类型消息的操作；2)对BOOTREQUEST消息的操作。
主流程是：如果是BOOTREPLY消息->单一传播/广播->去掉relay agent option选项->send给Client，如果不是BOOTREPLY消息，那么就是BOOTREQUEST消息->添加relay agent option选项->若未设置giaddr，则将relay agent IP赋给giaddr->广播消息给所有Server。
代码流程就是这样的，下面概述一下BOOTP relay agent是如何工作的：
1.relay agent根据命令行参数，得到Server地址，并设置Server端口，以及socket接口。
2.relay agent查询子网内所有Client，并加入到列表中，函数discover_interfaces()。
3.当接收到Client消息(BOOTREQUEST类型)，在消息的option域添加relay agent的选项，检查消息的giaddr域是否设置，若未设置则将relay agent的IP赋给它，然后将消息广播给所有Server；
当接收到Server消息(BOOTREPLY类型)，根据flags域BROADCAST位是否设置，选择单一传播/广播，然后去掉消息中option域关于relay agent的选项，并将消息传递给Client。
