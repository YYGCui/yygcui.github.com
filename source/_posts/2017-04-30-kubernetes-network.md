---
title: kubernetes之网络分析
date: 2017-04-30 20:50:45
tags:
- kubernetes
- docker
categories:
- 技术积累
comments: true
---
`Kubernetes`是一个开源的容器集群管理平台，可用来自动化部署、扩展和运维应用容器。关于这个平台本身的各组件及具体功能不在本文讨论范围，本文主要关注`kubernetes`的网络方案。在讨论网络之前有必要先了解下相关概念，这些概念和网络息息相关。

## 基本概念

`Containers`是最小的资源单位，用于轻松地打包应用程序及相关配置。但在`kubernetes`中，容器不是操作的最小单位，甚至容器本身对`kubernetes`是不可见的，而是通过包装在外面的`Pod`进行资源的管理。

`Pods`是最小的部署单位，是部署在`kubernetes`中的应用的一个实例。可包含一组相关容器，`Pod`内共享的存储资源，一个唯一的网络IP以及一些选项配置容器该怎样运行。`Pod`中的所有容器共享一个网络IP，容器间可直接用`localhost`访问。

`Replica sets`是`ReplicationController`的下一代实现，它和后者基本上是一样的，除了对选择器`Selector`的支持不一样。该控制器用来保证始终都有一定数量的`Pod`副本在运行，它会自动替换故障/被删除/被终止的副本。也就是说，少于设定的固定数量时，会自动创建到达该数量；多于该数量时，会自动删除到该数量。官方不建议直接使用该控制器，可用更高层的`Deployment`来管理。

`Deployment`为`Pods`和`Replica sets`提供了声明更新，也就是说该控制器用来保证达到你描述的期望状态。使用该控制器可以方便的更新`Pods`(滚动升级)，如更新了容器镜像；可以方面的回滚到之前的部署版本；可以随时暂停和启动部署。

`Service`有时也被称为微服务，是一个抽象的概念，它定义了一组`Pods`以及访问它们的策略。`Pods`是通过标签选择器`Label Selector`被集合在一起的。该抽象层屏蔽了后端的`Pods`副本，对外呈现一个访问入口。这样即使后端被替换，对外也是不感知的。所以，不管是对内还是对外提供的功能，都以`Service`作为服务入口是合理的做法。

`Service`和`Deployment`可以看作是同一级的概念，`Service`用于`Pods`对外提供服务的管理，`Deployment`用于`Pods`本身的管理。以上各个概念之间的关系如下图：

{% img /images/k8s/k8s-concepts.png Kubernetes概念关系图 %}

`Nodes`是指`kubernetes`集群的节点，提供能力的机器，如虚拟机等，这里列举一下便于下面的网络讨论。

## 网络方案

基于以上的概念，可以看到涉及到的网络通信有容器间的通信，`Pod`间的通信，服务间的通信，跨节点的通信，以及延伸一下跨集群的通信。那么这些网络通信在`kubernetes`里都是如何实施的呢？`kubernetes`官方给出了一个使用`OpenVSwitch`的[网络方案](https://kubernetes.io/docs/admin/ovs-networking/)。这里基于这个网络方案图扩展一下，试图涵盖所有的网络连接类型。如下图所示，针对每种网络连接类型，后面会详细讨论。

{% img /images/k8s/k8s-network.png Kubernetes网络方案图 %}

### Container-to-Container

上面我们已经提到，`kubernetes`不会直接操作容器本身，对外呈现的最小操作单位是`Pod`，这里容器之间的通信是指一个`Pod`内的容器之间如何通信。我们观察一个`Pod`里的资源时，会发现有一个自己启动的`pause`容器，这个容器的作用是为`Pod`提供网络，所有其他的容器(也就是我们通过模板启动的容器)，都是共享`pause`容器网络的。在实现上，如`Docker`提供了`--net=container:ID`这样的选项。

每个`pod`对外呈现一个唯一的IP，`Pod`内的各容器共享这个IP，也就是说各容器处于同一网络空间中，可直接使用`localhost`互相访问，需要注意的是各容器使用的端口不能冲突，可以认为`IP:Port`能够唯一确定一个容器。类比一个系统内的多个网络进程。

### Pod-to-Pod

`kubernetes`网络实现基于以下三个原则：

- 所有容器和其他容器的通信不需要NAT
- 所有`node`和容器间的通信不需要NAT
- 容器自己看到的IP就是对外呈现的IP

那么，这是如何做到的呢？在同一`node`时，是通过容器网桥实现的，如`Docker`默认使用的网桥`Docker0`；在跨`node`通信时，是通过`node`间的`overlay network`实现互联的，如`flannel`, `OpenVSwitch`提供的`VxLAN tunnel`。官方列举了更多的`overlay network`实现，[参考链接](https://kubernetes.io/docs/concepts/cluster-administration/networking/)。

### Pod-to-Service

作为前端的`Service`与作为后端的`Pods`之间是通过`kubernetes`的组件`kube-proxy`实现通信的。`kube-proxy`为`Service`实现了虚拟IP的形式，即`ClusterIP`。有两种代理模式，`userspace`和`iptables`。

- `userspace`模式下，需要在本`node`上分配`proxy port`，该port被代理到后端的`Pods`，这样来自`ClusterIP:Port`的信息被重定向到`proxy port`，然后代理到后端的`Pods`。
- `iptables`模式下，`kube-proxy`通过直接增删`iptables`规则实现重定向转发。它比`userspace`模式更快更可靠，缺点是当前`Pod`无响应时，它无法自动重试其他`Pod`，需要借助`readiness probes`实现。

关于两种模式更详细的描述参考[官网文档](https://kubernetes.io/docs/concepts/services-networking/service/)

### Service-to-External

`Service`是以`ClusterIP`的形式对外提供服务的，但`ClusterIP`是集群内的虚拟IP网络。那么和集群外是如何通信的呢？可以通过以下方式实现：

- `NodePort`: `kubernetes`从配置的端口范围(默认配置30000-32767)内分配一个端口，每个节点都会把该端口上的信息转发到`Service`中。这种方式可以通过集群内的任一节点`NodeIP:NodePort`访问到`Service`。这意味着整个集群最多只支持6万多个这种类型的服务。该类型的服务同样会分配一个内部的`ClusterIP`。

- `LoadBalancer`: 依赖于外部云提供商提供的服务均衡器，这同样需要`kubernetes`有相应的插件支持，具体的服务均衡策略由外部均衡器负责，信息将被定向到后端的`Pods`。这种类型的服务下，某些云提供商支持配置`LoadBalancerIP`，除此之外，上述的`ClusterIP`和`NodePort`也同样会分配以便正确的路由到`Service`。

- `ExternalName`: 该类型和上述几种不一样，它不需要代理或转发，它是通过`kube-dns`解析`CNAME`记录的方式重定向url实现的。

从上面可以看出，`ClusterIP`, `NodePort`, `LoadBalancer`这三种类型是层层嵌套实现的。但对云提供商没有严格要求这样做，只是目前的API是这样的。

除了这几种服务类型之外，还可以使用`ExternalIPs`实现集群内外的互通，所谓的`ExternalIP`是指能够被路由到`kubernetes`节点的IP的，在公有云上，也就是我们所说的公网IP。`ExternelIPs`可以和任一类型的`Service`一起使用。

具体配置模板可参考[官网文档](https://kubernetes.io/docs/concepts/services-networking/service/)

## 总结

至此，已涵盖网络方案图里的所有通信类型。在使用上做几点总结：

- `Pod`(应用)的各`Container`(进程)通信可以看作是`VM`上各进程间的通信，`Pod`类似`VM`。

- `Pod`作为功能提供方时，以`Service`方式提供，屏蔽后端的具体实现，不直接对外暴露`Pod`。

- 集群`node`间的`overlay`网络不要和大网互通，保持集群的私密性。需要和外部交互时，通过`Service`。

- 集群内外通信，大网IP充足时，使用`ExternalIPs`，不拘泥于`Service`类型，否则使用`NodePort`，私有集群下基本够用。

