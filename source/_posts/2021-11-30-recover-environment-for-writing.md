---
title: 恢复Hexo博客环境
date: 2021-11-30 20:31:47
tags:
- hexo
categories:
- 技术积累
comments: true
---

博客荒废了好些年了，这段时间觉得没有大的、好的主题可以写，就一直处于断更状态。最近发现就当笔记记录一些东西备查也是挺好，如果再次过程中还能对他人有一点帮助，那就更好了。是时候捡起来继续了，首先要恢复出本地的写作及部署环境，这里记录一下以备下次使用...

## WSL环境

如果直接使用Windows或Mac等原生系统，可以跳过此步。从Windows支持Linux环境后，个人习惯用`WSL`，即保留Windows桌面的便捷性，又能兼顾Linux高效的命令操作。
安装步骤如下：
1. 打开“启用或关闭Windows功能”，勾选“适用于Linux的Windows子系统”。
2. 从Microsoft Store中搜索你喜欢的Linux版本，比如Ubuntu，然后安装。

安装完成后，安装powerline字体，参考[官方指南](https://github.com/powerline/fonts)，需要注意的是因为使用的terminal是Windows的，所以要在Windows中安装，然后在terminal的字体设置中选择powerline相关字体。

个人比较喜欢用`oh-my-zsh`，安装完成后修改主题为`ZSH_THEME="agnoster"`。enjoy it~


## Hexo环境

这一步没什么花头，直接参照[官方指南](https://hexo.io/zh-cn/docs/)安装Node.js和Git，然后通过npm安装Hexo即可。

## 配置Hexo工程

如果本地没有存储Source备份，需要从Github端clone一份

```bash
git clone -b <Source分支名> https://github.com/<用户名>/<Git库名>.git
```

其下操作步骤一样，进入Git仓库目录，执行

```bash
npm install
```

由于之前的package.json比较老，执行install之后报了一堆npm的错误，形如

```bash
found XXX vulnerabilities (XXX low, XXX moderate, XXX high)
run `npm audit fix` to fix them
......
```

在执行`npm audit fix`或`npm audit fix --force`后依然无法解决这个报错。这是因为该工程配置的依赖包版本太老了，npm检查后认为这些包存在安全隐患。最简单的方式就是升级到最新版本。

### Hexo升级

由于package.json里配置了默认版本，所以首先要检查是否有新版本，然后更新json，命令如下
```bash
# 安装npm-check用来检查是否需要升级插件
sudo npm install -g npm-check
npm-check
# 安装npm-upgrade用来更新json
sudo npm install -g npm-upgrade
npm-upgrade

# 更新全局插件
sudo npm update -g
# 更新本工程插件
npm update --save
```
更新完成后，可以用`hexo version`查看hexo及其依赖插件版本。

### 其他告警

1. 安装到最新版后，发现有报config参数deprecated，可以直接搜索相关参数看官方文档解决。
   如安装5.0后遇到`external_link`参数问题
```
INFO  Validating config
WARN  Deprecated config detected: "external_link" with a Boolean value is deprecated. ...

# 新格式如下
external_link:
    enable: true|false
```
2. 执行`hexo s`后，有报循环依赖的告警，如下
```
(node:9508) Warning: Accessing non-existent property 'lineno' of module exports inside circular dependency
(Use `node --trace-warnings ...` to show where the warning was created)
(node:9508) Warning: Accessing non-existent property 'column' of module exports inside circular dependency
(node:9508) Warning: Accessing non-existent property 'filename' of module exports inside circular dependency
(node:9508) Warning: Accessing non-existent property 'lineno' of module exports inside circular dependency
(node:9508) Warning: Accessing non-existent property 'column' of module exports inside circular dependency
(node:9508) Warning: Accessing non-existent property 'filename' of module exports inside circular dependency
```
   搜索发现是依赖的某个插件导致，不解决也不影响使用，暂时没管。相关[解决链接](https://www.haoyizebo.com/posts/710984d0/)

接下来，就可以`hexo new`继续写作之旅了~