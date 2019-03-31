---
title: kubernetes之多网络策略
date: 2017-09-10 12:28:33
tags:
- kubernetes
categories:
- 技术积累
comments: true
---
网络策略(`Network Policy`)是`Kubernetes`提供的一种规范，它描述了一组`Pod`是如何被允许相互通信的，以及和其他端点是如何通信的。`Kubernetes`只提供了这样的机制，具体功能由网络插件(`Network Plugins`)实现，流行的网络插件有很多，但并不是所有的网络插件都提供了网络策略功能，如`flannel`就没有提供这样的功能，目前已知的支持网络策略的有`Calico`, `Cilium`, `Kube-router`, `Romana`, `Weave Net`, `Canal`。

网络策略的应用和`Kubernetes`中很多操作类似，是通过`labels`来选取一组`Pods`的，然后再配置具体的规则(目前的实现都是通过配置`iptables rule`)来控制什么流量被允许发送到这组选取的`Pods`。

*注:* 笔者使用的**Kubernetes 1.6**版本中网络策略还处于`beta`状态，其配置和**Kubernetes 1.7**中网络策略正式版略有差异。这里略作批注。

## 网络策略

使用网络策略的一般步骤如下(以`Calico`为例):

### 配置网络策略

1. 修改`kube-apiserver`的配置文件，添加配置项`--runtime-config=extensions/v1beta1/networkpolicies=true`，表示启用网络策略(**Kubernetes 1.6**版本中)
2. 修改`kubelet`的配置文件，添加配置项`--network-plugin=cni`，表示使用CNI网络插件
3. 根据`calico`相应版本的[安装文档](https://docs.projectcalico.org/v2.5/getting-started/kubernetes/installation/)，安装`calico`插件，**Calico Kubernetes Hosted Install**方式比较简单。

### 使用网络策略

`kubernetes`官方文档有[详细的说明](https://kubernetes.io/docs/concepts/services-networking/network-policies/)，这里简要列一下几个关键配置。

1. 默认配置下，`Pods`是不做隔离的，即集群内所有`Pod`之间都是互通的。
    a. **Kubernetes 1.6**版本中在使用网络策略之前，需要先配置`namespace`为默认隔离，配置如下：

    ```
    {
        "metadata": {
            "name": "mynamespace",
            "labels": {
                "name": "mynamespace"
            },
            "annotations": {
                "net.beta.kubernetes.io/network-policy": "{\"ingress\": {\"isolation\": \"DefaultDeny\"}}"
            }
        }
    }
    ```

    此时，该`namespace`下的所有`Pod`都是隔离状态的，不接收任何来源的流量。

    b. **Kubernetes 1.7**版本中直接通过网络策略配置，即配置网络策略的应用网络策略规则，未配置网络策略的还是未隔离状态。

2. 使用标签选择器配置一组`Pod`的网路策略，即接收哪些来源的流量， 示例如下(**Kubernetes 1.6**版本`apiVersion`不同)，该配置表示：
    - 在名为`default`的命名空间中隔离所有标签为`role=db`的`Pod`， 如果没有隔离的话(**Kubernetes 1.7**版本)。
    - 允许标签为`project=myproject`的命名空间中的所有`Pod`通过`TCP`连接该`default`命令空间里的标签为`role=db`的`Pod`的`6379`端口。
    - 允许标签为`role=frontend`的`defult`命名空间中的所有`Pod`通过`TCP`连接该`default`命令空间里的标签为`role=db`的`Pod`的`6379`端口。

    ```
    {
    "apiVersion": "networking.k8s.io/v1",
    "kind": "NetworkPolicy",
    "metadata": {
        "name": "test-network-policy",
        "namespace": "default"
    },
    "spec": {
        "podSelector": {
        "matchLabels": {
            "role": "db"
        }
        },
        "ingress": [
        {
            "from": [
            {
                "namespaceSelector": {
                "matchLabels": {
                    "project": "myproject"
                }
                }
            },
            {
                "podSelector": {
                "matchLabels": {
                    "role": "frontend"
                }
                }
            }
            ],
            "ports": [
            {
                "protocol": "TCP",
                "port": 6379
            }
            ]
        }
        ]
    }
    }
    ```

3. 同样的，**Kubernetes 1.7**版本中，也提供了默认策略
    a. 默认全隔离策略，类似于**Kubernetes 1.6**版本对`namespace`的配置，作用的命名空间下所有`Pod`在未应用其他网络策略的情况下是隔离状态。

    ```
    {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "NetworkPolicy",
        "metadata": {
            "name": "default-deny"
        },
        "spec": {
            "podSelector": null
        }
    }
    ```

    b. 全通策略，作用的命名空间下所有`Pod`可接收任何流量，无视其上配置的其他网络策略。

    ```
    {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "NetworkPolicy",
        "metadata": {
            "name": "allow-all"
        },
        "spec": {
            "podSelector": null,
            "ingress": [
                {
                }
            ]
        }
    }
    ```

## 多网络策略

在文章[kubernetes之多网络支持]中，以`flannel`为例讲述了多网络的配置方法。由于`flannel`不支持网络策略，这里使用[Huawei-PaaS/CNI-Genie](https://github.com/Huawei-PaaS/CNI-Genie)插件为例，`CNI-Genie`也是集成引导插件，本身不做具体功能，由引用的插件完成网络功能，其支持`Calico`, `Weave Net`, `Canal`, `Romana`等。

### 配置多插件

在前述配置网络策略的基础上，再安装`CNI-Genie`, `Weave Net`, `Canal`, `Romana`等插件，以上插件官方都有`Kubernetes Hosted Install`的安装脚本，直接下载应用即可。这里`CNI-Genie`的配置文件是`00-**.conf`，而其他插件的配置文件是`10-**.conf`，所以按优先级默认加载的插件是`CNI-Genie`。

### 使用多网络

`CNI-Genie`使用动态选择插件的策略，即每次部署都可以指定不同的插件，通过`Kubernetes`的`annotations`实现，示例如下：

```
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: mytest
  namespace: mynamespace
  labels:
    name: mytest
spec:
  replicas: 2
  template:
    metadata:
      name: mytest
      namespace: mynamespace
      labels:
        name: mytest
      annotations:
        cni: "calico,weave"
        multi-ip-preferences: |
          {
            "multi_entry": 0,
            "ips": {
              "": {
                "ip": "",
                "interface": ""
              }
            }
          }
    spec:
      containers:
        - name: mytest
          image: mytest:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 21234
```

这里`annotations`添加了两个字段，`cni`表示该部署使用的网络插件，如这里使用的是`Calico`和`Weave Net`。`multi-ip-preferences`字段用于反填网络插件配置的ip地址和网络编号，以`ip1`, `ip2`, ... 命名。

*注*: `Calico`由于本身实现的问题，笔者在验证时不能作为非第一网络使用，具体参看[github issue](https://github.com/projectcalico/cni-plugin/issues/352)

### 多网络策略

网络策略的实现都是以`Kubernetes`里的`PodIP`为入参施加网络规则的，但在多网络配置下只有第一网络的ip被上报给`Kubernetes`，作为`PodIP`。也就是说我们无法通过`Kubernetes`存储的数据获取到多网络地址。这里我们可以利用`multi-ip-preferences`字段的值来满足定制化需求。

以`Weave Net`为例，需要定制其`npc`实现，所有获取`PodIP`的地方替换成如下方式获取的ip(获取第二网络地址，这里示例不具有灵活性，可考虑在`multi-ip-preferences`添加一个字段表示该ip属于哪个插件)。

```
func getIPFromAnnotation(pod *coreapi.Pod) string {
	var podIP2 string = ""
	var mip MultiIPPreferences
	
	mipJSON, found := pod.ObjectMeta.Annotations["multi-ip-preferences"]
	if found {
		if err := json.Unmarshal([]byte(mipJSON), &mip); err == nil {
			if value, ok := mip.Ips["ip2"]; ok {
				podIP2 = value
			}
		}
	}

	return podIP2
}
```

至此，我们的多网络配置下，可以使网络策略作用于所有配置网络。