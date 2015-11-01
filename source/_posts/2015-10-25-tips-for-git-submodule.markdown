---
layout: post
title: "tips for git submodule"
date: 2015-10-25 14:41:56 +0800
comments: true
categories: 
- git
tags:
- git
---
近来使用`git submodule`来管理项目，趟过一些坑，整理记录一下。

##为啥使用submodule

Git官网如是说，简单的说，就是在引入第三方库时，或者一些公共模块的管理时，可以使用submodule，既单独管理更新，又能很方便的引入使用。

{% blockquote Git https://git-scm.com/docs/git-submodule git-submodule Document %}
A submodule allows you to keep another Git repository in a subdirectory of your repository. The other repository has its own history, which does not interfere with the history of the current repository. This can be used to have external dependencies such as third party libraries for example.
{% endblockquote %}

<!--more -->

##Add submodule

在一个repo中加入submodule的命令如下

{% codeblock %}
git submodule [--quiet] add [-b <branch>] [-f|--force] [--name <name>]
              [--reference <repository>] [--depth <depth>] [--] <repository> [<path>]
{% endcodeblock %}

在add一个submodule之后，在当前repo下便会生成一个`.gitmodules`文件，该文件记录submodule的相关信息，其内容如下

{% codeblock %}
[submodule "submodule-name"]
        path = path name
        url = https://github.com/submodule-name.git
{% endcodeblock %}

##update submodule

clone一个repo后，其submodule只会显示一个目录，其内容是空的，这时需要update各个submodule，其命令如下

{% codeblock %}
git submodule [--quiet] init [--] [<path>…​]
git submodule [--quiet] update [--init] [--remote] [-N|--no-fetch]
              [-f|--force] [--rebase|--merge] [--reference <repository>]
              [--depth <depth>] [--recursive] [--] [<path>…​]
{% endcodeblock %}

更新操作需要先init以下，然后再update。该两个操作也可以合并为一个命令完成，就是在update时加入`--init`参数。

如果需要从远程repo中update submodule，需要在update时加入`--remote`参数，这样会pull下来server上的最新版。

##modify submodule repo

更改submodule的repo地址，没有直接的命令可以完成，需要修改前面提到的`.gitmodules`文件，将`url`改成要更改成的repo地址。然后执行如下命令

{% codeblock %}
git submodule [--quiet] sync [--recursive] [--] [<path>…​]
{% endcodeblock %}

##remove submodule

删除submodule的命令的过程比较繁多，需要多个命令才能完成，其命令如下

{% codeblock %}
mv asubmodule asubmodule_tmp
git submodule [--quiet] deinit [-f|--force] [--] <path>…​   
git rm asubmodule
# if you want to leave it in your working tree
git rm --cached asubmodule
mv asubmodule_tmp asubmodule
rm -rf .git/modules/asubmodule
{% endcodeblock %}

##modify submodule content

update之后的submodule是不属于任何一个branch的，也就是无branch的。submodule的HEAD是处于`detached HEAD`状态的。这样，如果要更改submodule的内容，需要首先切换到要更新的branch，然后按正常的git流程add/commit/pull/push等操作。

如果直接修改了submodule的内容，然后commit了该修改，那么在push时会出现up-to-update的情况。这时可以用如下命令挽救

{% codeblock %}
yygcui@ubuntu$ git checkout master
Warning: you are leaving 1 commit behind, not connected to
any of your branches:

  <commit id> forget to check out master

If you want to keep them by creating a new branch, this may be a good time
to do so with:

 git branch new_branch_name <commit id>

Switched to branch 'master'
yygcui@ubuntu$ git cherry-pick <commit id>
yygcui@ubuntu$ git push
{% endcodeblock %}