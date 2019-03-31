---
comments: true
date: 2010-08-02 13:16:40
layout: post
title: Documents To Go 2.0004.018精简
categories:
- 技术积累
tags:
- BlackBerry
- DTG
- Mobile
---

我想使用blackberry的煤油大多数都知道Documents To Go这个软件---[DataViz](http://www.dataviz.com/)出品的手机版office软件，可以完美编辑MicroSoft Office文件(Word, Excel, PowerPoint) 和Adobe的PDF文件。

此篇日志是个人精简安装DTG的一个分享，目前的最新版本为2.0004.018，随着软件版本的升级，也即软件功能的增加，这个软件本身也变的越来越大，最新版DTG安装包是4.1MB，再加上PDFToGo安装包是1.5MB，这个庞大的数字对BB 8700g仅有的几十MB内存不亚于天文数字。起初我直接从官方下载了[DTG](http://support.dataviz.com/support.srch?docid=14433#AltInstall)，试图传入手机中，可惜内存空间不够用，在删除不用软件，清理掉图片日志存档后，空间还是不够，然后试图耗费4MB的流量直接OTA下载，可能是由于网络不稳定，下载了一部分之后就失败了，无奈之下，便动手精简掉了不用的语言包，精简后DTG是3.1MB。
<!-- more -->
OTA下载地址:
Documents To Go: [http://www.dataviz.com/getdocstogo](http://www.dataviz.com/getdocstogo)
PDFToGo: [http://www.dataviz.com/getPdfToGo2](http://www.dataviz.com/getPdfToGo2)
Documents To Go Files: [http://www.dataviz.com/getFiles](http://www.dataviz.com/getFiles)

其实[莓博](http://www.bber.info)在很早之前(3个月前，看来这最新版也已过时仨月了)就已经发布了《[Document To Go & PDF To Go 2.0004.018 组件化分类OTA安装包含Key](http://www.bber.info/post/dtg2004018)》，不仅把DTG的WordToGo, SheetToGo, SlideshowToGo组件化了(可单独安装或卸载)，而且还删除了一些可能用不着的语言，只保留了en和Zh\_CN这两个语言包，这样的话可以分开安装，不用担心内存不够用了...

但是，个人原因，不喜欢这种组件化安装，还是无限贴近于原装好，哈哈，另一方面，安装包中只有en(美国英语)和zh\_CN(简体中文)这两个语言包，没有en\_GB(英国英语)和zh\_TW(繁体中文)这两个语言包，所以自己动手修改了jad文件，自己修改也很简单，只是删掉了不需要的语言包，然后重新给RIM-COD-URL编号。具体精简如下：

Documents To Go:
DTG包括DocsToGoCommon(基础组件)，SheetToGo(相当于Excel)，Slideshow(相当于PowerPoint)，WordToGo(相当于Word)四部分，精简主要针对这四部分中的语言支持包，具体形式如******Resource__**.cod (其中******表示DocsToGoCommon、SheetToGo、SlideshowToGo、WordToGo)，如 :
DocsToGoCommonResource__**.cod 25个文件，
SheetToGoResource__**.cod 25个文件，
SlideshowToGoResource__**.cod 25个文件，
WordToGoResource__**.cod 25个文件,
其中**表示ar、ca、cs......rv、sv、tr等语言，只保留了en,en\_GB,zh\_CN和zh\_TW。

然后删除了- DocumentsToGo.jad中相对应的部分，如:
RIM-COD-URL-20: DocsToGoCommonResource__ar.cod
RIM-COD-Size-20: 19528
然后对剩下的项，进行重新编号，具体文件如附件中- DocumentsToGo.jad。

PDFToGo: 只保留了PDFToGoResource__en.cod，没有中文语言包，删除了 de, es, fr, it，然后删除了- PDFToGo.jad文件中相关的项。

修改后的zip包下载地址：
[Documents To Go 2.0004.018 for OS4.5-4.6](http://www.box.net/shared/yebxz1dnuj)
[PDFToGo 2.0004.018 for OS 4.5 ](http://www.box.net/shared/hbk15pmyr6)

PS: 基于莓博组件化的一个思考，组件化可以有选择的安装word，sheet和slideshow，同样也可以通过修改jad文件来选择所要安装的功能，但是灵活性大打折扣~~~
