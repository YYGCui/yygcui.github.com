---
layout: post
title: "容器化编译和部署"
date: 2015-09-20 16:12:48 +0800
comments: true
categories: 
- docker
tags:
- docker
---
容器不是一个新技术，lxc已经存在了很长时间，但Docker却使它更加方便易用。Docker火了之后，我一直没有明白它为啥这么火，除了它宣称的轻量化之外，还有什么。它能做的事情，虚拟机都可以做，并且虚拟机有更好的隔离性。

在使用场景上，貌似布道的更多的是环境一致性，即开发、测试、部署环境都能很好的保持一致。而至于在生产环境中使用它有什么好处，除了DevOps所倡导的自动化，简化运维，我就没有其他概念了。

最近在研究微服务的东西，那么微服务必然需要DevOps，必然也就需要高度自动化。Docker，或者说容器，很好的迎合了这一契机。可以说Docker极大的简化了自动化部署的难度。本文就从最近的实践看一看以前没发现的好处。

<!-- more -->

## 用源码直接编译部署

这种方式直接从VCS仓库下载源码，安装相关依赖库，然后编译安装，生成Docker镜像。其Dockerfile可能是这样的，以构建运行ubuntu的镜像为例。关于Dockerfile语法等可以参考[Dockerfile reference](https://docs.docker.com/reference/builder/)

{% codeblock Dockerfile %}
# A Dockerfile example
FROM ubuntu:14.04
MAINTAINER YYGCui<yygcui@cuicc.com>

# set proxy if needed
# set ubuntu to noninteractive 
ENV DEBIAN_FRONTEND noninteractive

# copy apt-get sources list to image
COPY sources.list /etc/apt/

# keep ubuntu up-to-date
RUN apt-get update && apt-get -qqy upgrade

# install tools for compile
RUN apt-get update && apt-get install -y \
    build-essential \
    automake \
    libtool \
    git \
   # and the libraries needed by your app
   && rm -rf /var/lib/apt/lists/*

# download your app source code to /home/myapp
RUN cd /home/ && git clone http://github.com/yygcui/myapp.git

# compile and install
RUN cd /home/myapp \
    && ./configure \
    && make \
    && make install \

# clean source code and some tools 
RUN rm -rf /home/myapp \
    && apt-get remove --purge -y git build-essential automake libtool

# set run cmd
ENTRYPOINT ["myapp.bin"]
CMD ["param1", "param2"]
{% endcodeblock %}

从Dockerfile流程可以看出，这种方法比较简单直接，省去了软件打包的过程，省去了管理安装包的麻烦，直接安装在构建镜像中。但是也带来了一些缺点，比如为防止源码泄露需要清理，在闭源的情况下，只能发布构建好的镜像；深入一点分析，各种测试结果无法复用，比如集成测试有其他部件出现bug，这可能要重新从头执行整个流程。

## 用源码编译成可执行包构建部署 

这种思路相当于在上面的基础上进行了编译和部署的分离。分别用不同的镜像来构建。比如编译阶段，我可以预先构建好编译基础镜像，包含基本的编译工具，节省安装时间。而在构建部署阶段，直接用纯净的基础镜像，避免安装不必要的软件包，更利于环境一致性。

### 容器化编译
容器化编译可以参考docker本身的编译过程，这里简化一下，该过程需要额外构建以下文件：Makefile(用来自动化容器编译的Makefile，非app的Makefile)，编译脚本，编译镜像(Dockerfile)。

Makefile主要做了三件事：创建映射目录，构建编译镜像，启动编译容器进行编译。Makefile简单示例如下。

{% codeblock Makefile %}
.PHONY: all

BIND_DIR := package
DOCKER_MOUNT := $(if $(BIND_DIR),-v "$(CURDIR)/$(BIND_DIR):/home/$(BIND_DIR)")
DOCKER_IMAGE := myapp-compile
DOCKER_RUN := docker run --rm -it --privileged $(DOCKER_MOUNT) "$(DOCKER_IMAGE)"

default: all
all: build
    $(DOCKER_RUN) /home/build.sh

build: package
    docker build -t "$(DOCKER_IMAGE)" .

package:
    mkdir -p ./package
{% endcodeblock %}

编译脚本封装了源码的编译，以及编译后的打包等工作。可执行文件与编译出来的依赖库以及打包文件都放在package目录下，这样在host上也可以访问。

{% codeblock build.sh %}
#!/bin/bash
# make it like a atom operate
cd /home/myapp \
&& ./configure --prefix=/home/package \
&& make \
&& make install

#build rpm/deb/tar package if needed
#cd /home/package \
#&& tar -czvf myapp.tar.gz ./bin ./lib ./doc install.sh
{% endcodeblock %}

编译镜像的Dockerfile和上面的源码直接编译的差不多，只不过不包括编译部分。同时基础镜像也可以用已经构建好的编译基础镜像。这里只需要安装myapp依赖的库以及相应的下载工具即可。

{% codeblock Dockerfile %}
# A Dockerfile example for compile
FROM ubuntu-compile:14.04
MAINTAINER YYGCui<yygcui@cuicc.com>

# set proxy if needed
# set ubuntu to noninteractive 
ENV DEBIAN_FRONTEND noninteractive

# copy apt-get sources list to image
COPY sources.list /etc/apt/

# keep ubuntu up-to-date
RUN apt-get update && apt-get -qqy upgrade

# install tools for compile
RUN apt-get update && apt-get install -y \
    git \
   # and the libraries needed by your app
   && rm -rf /var/lib/apt/lists/*

# download your app source code to /home/myapp
RUN cd /home/ && git clone http://github.com/yygcui/myapp.git

COPY build.sh /home/build.sh
{% endcodeblock %}

这样，你的下一步流程可以对该软件包进行各种测试，通过后可以上传到二进制包管理库。后续用到该软件时，都直接从二进制库下载。

### 容器化部署

这里部署的概念只是紧接着编译测试后如何构建部署镜像。部署镜像依赖于上一步的二进制包。其Dockerfile可能是这样的。

{% codeblock Dockerfile %}
# A Dockerfile example for deploy
FROM ubuntu:14.04
MAINTAINER YYGCui<yygcui@cuicc.com>

# set proxy if needed
# set ubuntu to noninteractive 
ENV DEBIAN_FRONTEND noninteractive

# copy apt-get sources list to image
COPY sources.list /etc/apt/

# keep ubuntu up-to-date
RUN apt-get update && apt-get -qqy upgrade

# install tools for compile
RUN apt-get update && apt-get install -y \
    wget \
   # and the libraries needed by your app
   && rm -rf /var/lib/apt/lists/*

# download your app source code to /home/myapp
RUN cd /home \
    && wget http://artifactory.com/yygcui/0.0.1/myapp.tar.gz \
    && tar -xzvf myapp.tar.gz \
    && cd myapp \
    && ./install.sh

# set run cmd
ENTRYPOINT ["myapp.bin"]
CMD ["param1", "param2"]
{% endcodeblock %}

## 总结一下

从源码直接构建部署镜像，流程简单易行，自动化比较容易；但高度依赖于测试自动化，在构建的过程中需要完成基本的测试。而且每次都从源码构建，不利于前一步结果的复用(如进程测试、系统测试)。

容器化编译和容器化部署分成独立的两个过程，更像传统的流程。各种测试结果基本可以复用，但是增加了自动化的难度，管理二进制包的麻烦。

两种方法最终产生的部署镜像是一样的，具体用哪一种取决于你的构建流程。