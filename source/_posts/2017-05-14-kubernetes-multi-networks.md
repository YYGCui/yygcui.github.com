---
title: kubernetes之多网络支持
date: 2017-05-14 11:30:55
tags:
- kubernetes
- flannel
- multi-networks
categories:
- 技术积累
comments: true
---
某些场景下，我们需要多网络的支持，如`eth0`用于业务功能，`eth1`用于配置管理功能，那么`kubernetes`下该如何实现呢？

{% post_link kubernetes-network 上一篇 %} 我们着重分析了各层级之间网络通信的方式，以及内外网之间的网络通信，这些通信方式的探讨都是基于单一网络的。
`kubernetes`网络默认只支持单一网络，使用`noop`网络插件。`kubernetes`网络是以`Plugin`的方式实现的，它支持符合`CNI`规范的插件，通过`--network-plugin=`来指定，这就意味着我们可以定制网络方案。

关于`kubernets`网络插件，[官方文档](https://kubernetes.io/docs/concepts/cluster-administration/network-plugins/)有详细的描述，这里简单介绍一下:

网络插件还处于`alpha`阶段，其内容会经常发生变化。目前支持两种网络插件

- CNI plugin: 符合`CNI`规范的插件，其规范请参看[官方文档](https://github.com/containernetworking/cni/blob/master/SPEC.md)。
- kubenet plugin：这个可看作是`kubernentes`官方提供的符合CNI规范的插件，基于`cbr0`，使用`CNI`的`bridge`和`local-host`插件。

那么，要实现定制化的网络，只需按`CNI`规范实现`Add`和`Remove`接口即可。`kubernetes`多网络方案就是以`CNI`插件的方式实现的。以下操作基于`Ubuntu 14.04`，除`etcd`操作外，其他操作所有节点都要执行。

## 准备工作

- 已部署多节点`kubernetes`集群，`overlay`网络使用`flannel`
- 已安装`golang`编译环境
- 部署节点上已安装`bridge-utils`, `conntrack`和`nsenter`
- 从`github`上下载[multus-cni](https://github.com/Intel-Corp/multus-cni)，该插件实现多网络功能，具体网络功能由以下插件实现
- [可选]从`github`上下载[sriov-cni](https://github.com/Intel-Corp/sriov-cni)，该插件实现SR-IOV功能
- 从`github`上下载[cni](https://github.com/containernetworking/cni)，基础插件库，包含`bridge`, `flannel`, `ipam`等

## CNI插件

将`multus-cni`, `sriov-cni`, `cni`放在`go`编译目录下，如`~/go/src/`下，分别编译三个插件，在各自目录下执行`./build.sh`。编译成功后，生成的二进制文件位于`./bin`下。

创建目录`/opt/cni/bin`，将编译好的二进制文件拷贝到该目录下。

```bash
mkdir -p /opt/cni/bin
cd ~/go/src/multus-cni/ && ./build.sh
cp ./bin/* /opt/cni/bin/
cd ~/go/src/sriov-cni/ && ./build.sh
cp ./bin/* /opt/cni/bin/
cd ~/go/src/cni/ && ./build.sh
cp ./bin/* /opt/cni/bin/
```

## 配置flannel网络

以下操作除步骤4只需要在`master`节点操作外，其他步骤各节点都需要执行。

1. 创建该`flannel`网络使用的网桥，如`kbr1`
```bash
brctl addbr kbr1
```
2. 创建存放flannel网络配置的目录
```bash
mkdir -p /run/flannel/networks
```
3. 仿照`/run/flannel/subnets.env`文件，在`/run/flannel/networks`下创建配置文件，如`subnets2.env`，使用不同的网络段，如
```bash
cp /run/flannel/subnets.env /run/flannel/networks/subnets2.env
vim /run/flannel/networks/subnets2.env
#modify as follows
FLANNEL_NETWORK=173.17.0.0/16
FLANNEL_SUBNET=173.17.76.1/24
FLANNEL_MTU=1400
FLANNEL_IPMASQ=true
```
4. 将该网络段注册到`etcd`，注意使用不同的前缀，如原网络使用的是`/coreos.com/network/`，这里使用`/k8s/network2/`。再者默认的`vlan index`是1，所以这里`VNI`为2
```bash
/opt/bin/etcdctl set /k8s/network2/config '{ "Network": "173.17.0.0/16", "Backend": { "Type": "vxlan", "VNI": 2 } }'
```
5. 使用上述配置启动新的`flannel daemon`，[参考文档](https://github.com/coreos/flannel/blob/master/Documentation/running.md#multiple-networks)，其中`--etcd-endpoints=http://127.0.0.1:4001 --ip-masq --iface=172.16.1.171`来自于`/etc/default/flannel`文件
```
/opt/bin/flanneld -subnet-file /run/flannel/networks/subnets2.env -etcd-prefix=/k8s/network2 --etcd-endpoints=http://127.0.0.1:4001 --ip-masq --iface=172.16.1.171 &
```
6. 创建`flannel`数据存储目录，存储`subnets2.env`网络相关的数据
```bash
mkdir -p /var/lib/cni/flannel/2
```

## 配置multus-cni

在`cni-conf-dir`(默认为`/etc/cni/net.d/`)下创建配置文件`test.conf`，其内容如下
```bash
{
    "name": "multus-demo-network",
    "type": "multus",
    "delegates": [
        {
                "type": "flannel",
                "name": "flannel.2",
                "subnetFile": "/run/flannel/networks/subnets2.env",
                "dataDir": "/var/lib/cni/flannel/2",
                "delegate": {
                        "bridge": "kbr1"
                }
        },
        {
                "type": "flannel",
                "name": "flannel.1",
                "subnetFile": "/run/flannel/subnet.env",
                "dataDir": "/var/lib/cni/flannel",
                "masterplugin": true,
                "delegate": {
                        "bridge": "docker0",
                        "isDefaultGateway": true
                }
        }
    ]
}
```
该文件的作用是，配置两个`flannel`网络，指定了各自的`subnet`配置文件，数据存储位置`dataDir`，使用的网桥。其中`flannel.1`有`masterplugin`属性，其意为该网络会上报给`kubelet`。

## 配置kubelet

`kubelet`的配置文件为`/etc/default/kubelet`, 在其行尾加上`--network-plugin=cni`。 如果上述的`cni bin`和`cni conf`不想放在默认目录下，这里可以使用`--cni-bin-dir`和`--cni-conf-dir`指定目录。

然后重启`kubelet`进程
```bash
service kubelet restart
service kubelet status
```

## Enjoy it

现在，启动的`pod`都具有两个网络`eth0`和`net0`(`multus-cni`多网络是以`net0`, `net1` ... `netn`命名的)。每个网络使用不同的`flannel`网络，网络间是隔离的，`vlan index`不同。如果需要更多的网络，只需增加配置即可。

该方案的缺点是配置是固定的，不能动态增删，需要重启`kubelet`。对每个`pod`而言，网络个数不能动态配置，依赖于整体方案。